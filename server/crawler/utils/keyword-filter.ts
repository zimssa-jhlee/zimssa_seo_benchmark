import { isStopword } from './stopwords.js';

interface KeywordEntry {
  keyword: string;
  count: number;
}

/**
 * AI (Gemini) + 규칙 기반 하이브리드 키워드 필터링
 *
 * 1. Gemini API가 설정되어 있으면 AI로 SEO 관련 키워드만 필터링
 * 2. API 없거나 실패 시 강화된 규칙 기반 필터링으로 fallback
 */
export async function filterKeywords(keywords: KeywordEntry[], pageContext: {
  url: string;
  title: string;
  description: string;
}): Promise<KeywordEntry[]> {
  // 1차: 규칙 기반 필터링 (항상 실행)
  const ruleFiltered = applyRuleBasedFilter(keywords);

  // 2차: AI 필터링 시도
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const aiFiltered = await filterWithGemini(apiKey, ruleFiltered, pageContext);
      if (aiFiltered.length > 0) {
        console.log(`[Keywords] AI filtered: ${keywords.length} → ${aiFiltered.length} keywords`);
        return aiFiltered;
      }
    } catch (err: any) {
      console.log(`[Keywords] Gemini failed, using rule-based: ${err.message}`);
    }
  }

  console.log(`[Keywords] Rule-based filtered: ${keywords.length} → ${ruleFiltered.length} keywords`);
  return ruleFiltered;
}

/**
 * Gemini API로 키워드 필터링
 */
async function filterWithGemini(
  apiKey: string,
  keywords: KeywordEntry[],
  context: { url: string; title: string; description: string },
): Promise<KeywordEntry[]> {
  const keywordList = keywords.slice(0, 30).map(k => k.keyword).join(', ');

  const prompt = `당신은 SEO 전문가입니다. 아래는 웹페이지에서 추출한 키워드 목록입니다.

페이지 URL: ${context.url}
페이지 제목: ${context.title}
페이지 설명: ${context.description}

추출된 키워드: ${keywordList}

위 키워드 중에서 SEO 관점에서 의미있는 키워드만 골라주세요.
- 검색엔진에서 사용자가 실제로 검색할 만한 명사/고유명사만 선택
- 동사, 형용사, 부사, 조사, 어미, 일반적인 서술어는 제외
- 웹 UI 텍스트(로그인, 메뉴 등)는 제외
- 해당 페이지의 비즈니스/서비스와 직접 관련된 키워드 우선

응답 형식: 쉼표로 구분된 키워드만 (설명 없이)
예: 아파트, 강남구, 전세, 시세, 래미안`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
  });

  // Retry once on 429 (rate limit)
  let response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (response.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  }

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse comma-separated keywords from response
  const aiKeywords = new Set(
    text.split(/[,،、\n]/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length >= 2),
  );

  // Return only keywords that AI approved, keeping original counts
  return keywords.filter(k => aiKeywords.has(k.keyword));
}

/**
 * 강화된 규칙 기반 키워드 필터링 (AI fallback)
 */
function applyRuleBasedFilter(keywords: KeywordEntry[]): KeywordEntry[] {
  return keywords.filter(({ keyword }) => {
    // 기본 불용어 체크
    if (isStopword(keyword)) return false;

    // 한글 자모 검사: 순수 한글이 아닌 깨진 문자 제거
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(keyword)) return false;

    // 동사/형용사 활용형 패턴 — 명사가 아닌 것을 공격적으로 제거
    const verbalPatterns = [
      // ~하다/되다 계열
      /[하되]고$/, /[하되]면$/, /[하되]지$/, /[하되]는$/, /[하되]여$/, /[하되]서$/,
      // 종결어미
      /합니다$/, /입니다$/, /됩니다$/, /습니다$/, /습니까$/,
      /해요$/, /돼요$/, /이에요$/, /예요$/, /세요$/, /셔요$/,
      /거든요$/, /잖아요$/, /네요$/, /군요$/, /데요$/,
      /어요$/, /아요$/,
      // 연결어미
      /하면서$/, /하지만$/, /되면서$/, /이라서$/, /니까$/,
      /인데$/, /은데$/, /는데$/,
      // 관형형
      /하는$/, /되는$/, /있는$/, /없는$/, /했던$/, /됐던$/,
      /[으]ㄴ$/, /[을]ㄹ$/,
      // 과거/미래
      /했다$/, /됐다$/, /했어$/, /됐어$/, /겠다$/, /겠어$/,
      /있다$/, /없다$/, /같다$/, /싶다$/,
      /있어$/, /없어$/, /같아$/, /싶어$/,
      // 보조용언
      /보다$/, /주다$/, /오다$/, /가다$/,
      // ~적 (형용사화)
      /있어요$/, /없어요$/, /같아요$/, /싶어요$/,
      /받고$/, /하고$/, /되고$/,
    ];

    for (const pattern of verbalPatterns) {
      if (pattern.test(keyword)) return false;
    }

    // 단독으로 의미가 약한 1~2글자 한글 (조사/어미 제거 후 남은 잔여물)
    if (keyword.length === 2) {
      const weakTwoChar = new Set([
        '있고', '없고', '하고', '되고', '이고',
        '그때', '이때', '저때', '어때',
        '여기', '거기', '저기', '어디',
        '이런', '그런', '저런', '어떤',
        '아주', '매우', '정말', '진짜',
        '먼저', '나중', '다시', '아직',
        '항상', '자주', '가끔', '아마',
        '그냥', '그저', '거의', '별로',
        '매번', '항상', '즉시', '곧바',
        '누구', '무엇', '언제', '어디',
      ]);
      if (weakTwoChar.has(keyword)) return false;
    }

    return true;
  });
}
