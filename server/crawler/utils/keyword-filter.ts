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

  const prompt = `당신은 한국어 SEO 키워드 전문가입니다. 웹페이지에서 자동 추출한 키워드 후보 목록을 검수해야 합니다.

페이지 URL: ${context.url}
페이지 제목: ${context.title}
페이지 설명: ${context.description}

키워드 후보: ${keywordList}

## 지시사항

위 후보 중에서 **실제 한국어 단어이면서 SEO에 의미있는 키워드만** 골라주세요.

### 반드시 제거할 것:
1. **실제 존재하지 않는 단어** — 형태소 분석 오류로 만들어진 비정상 합성어 (예: "억광진구", "분도보", "층아포지", "원부가세", "자양번영")
2. **동사/형용사/부사/서술어** — "있어요", "받고", "이용", "포함", "보유", "제공" 등
3. **일반적이고 범용적인 단어** — "가격", "이용자", "관심", "서비스" 등 특정 도메인에 한정되지 않는 단어
4. **웹 UI 텍스트** — "로그인", "메뉴", "더보기" 등

### 남겨야 할 것:
- **고유명사**: 지역명(강남구, 서초구), 브랜드명, 건물명, 상품명
- **업종 핵심 명사**: 해당 비즈니스의 핵심 서비스/상품을 나타내는 구체적 명사 (예: 아파트, 전세, 제모, 시술)
- **검색 가능한 키워드**: 사용자가 네이버/구글에서 실제로 검색할 만한 단어

### 응답 형식
쉼표로 구분된 키워드만 출력하세요. 설명이나 번호 없이.
후보 중 하나도 적합하지 않으면 빈 문자열을 출력하세요.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
  });

  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

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
  // 범용적/서술적 단어 블랙리스트 (SEO 키워드가 아닌 일반 용어)
  const genericWords = new Set([
    '이용', '제공', '포함', '보유', '관심', '가격', '이용자', '확인',
    '안내', '소개', '문의', '상담', '예약', '접수', '진행', '완료',
    '추천', '후기', '리뷰', '평가', '만족', '선택', '비교', '혜택',
    '할인', '무료', '특가', '이벤트', '프로모션', '쿠폰',
    '회원', '가입', '로그인', '마이페이지',
    '최신', '인기', '베스트', '전문', '프리미엄', '스페셜',
    '자세히', '알아보기', '살펴보기', '바로가기',
    '고객님', '고객님들', '여러분',
    '마지막', '처음', '최초', '기존',
    '파트너', '서비스', '프로그램', '시스템', '플랫폼',
  ]);

  return keywords.filter(({ keyword }) => {
    if (isStopword(keyword)) return false;

    // 한글 자모 깨진 문자
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(keyword)) return false;

    // 범용 단어 블랙리스트
    if (genericWords.has(keyword)) return false;

    // 동사/형용사 활용형
    const verbalPatterns = [
      /[하되]고$/, /[하되]면$/, /[하되]지$/, /[하되]는$/, /[하되]여$/, /[하되]서$/,
      /합니다$/, /입니다$/, /됩니다$/, /습니다$/, /습니까$/,
      /해요$/, /돼요$/, /이에요$/, /예요$/, /세요$/, /셔요$/,
      /거든요$/, /잖아요$/, /네요$/, /군요$/, /데요$/,
      /어요$/, /아요$/,
      /하면서$/, /하지만$/, /되면서$/, /이라서$/, /니까$/,
      /인데$/, /은데$/, /는데$/,
      /하는$/, /되는$/, /있는$/, /없는$/, /했던$/, /됐던$/,
      /했다$/, /됐다$/, /했어$/, /됐어$/, /겠다$/, /겠어$/,
      /있다$/, /없다$/, /같다$/, /싶다$/,
      /있어$/, /없어$/, /같아$/, /싶어$/,
      /보다$/, /주다$/, /오다$/, /가다$/,
      /있어요$/, /없어요$/, /같아요$/, /싶어요$/,
      /받고$/, /하고$/, /되고$/,
    ];
    for (const p of verbalPatterns) {
      if (p.test(keyword)) return false;
    }

    // 의미 약한 2글자
    if (keyword.length === 2) {
      const weak = new Set([
        '있고', '없고', '하고', '되고', '이고',
        '그때', '이때', '저때', '어때',
        '여기', '거기', '저기', '어디',
        '이런', '그런', '저런', '어떤',
        '아주', '매우', '정말', '진짜',
        '먼저', '나중', '다시', '아직',
        '항상', '자주', '가끔', '아마',
        '그냥', '그저', '거의', '별로',
        '누구', '무엇', '언제', '어디',
        '명에', '받고', '하고', '되고',
      ]);
      if (weak.has(keyword)) return false;
    }

    return true;
  });
}
