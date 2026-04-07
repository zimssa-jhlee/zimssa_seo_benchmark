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

/**
 * 검색 노출 의도 분석 — 이 페이지가 어떤 검색어로 노출될 가능성이 높은지 추론
 */
export interface SearchIntentResult {
  query: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

type SearchIntentContext = {
  url: string;
  title: string;
  description: string;
  h1: string;
  ogTitle: string;
  jsonLdTypes: string[];
  topKeywords: string[];
};

export async function analyzeSearchIntent(context: SearchIntentContext): Promise<SearchIntentResult[]> {
  // 1단계: 규칙 기반으로 확실한 검색어를 먼저 추출 (H1, title 원문 등)
  const guaranteed = extractGuaranteedQueries(context);

  // 2단계: AI로 추가 검색어 추론
  const apiKey = process.env.GEMINI_API_KEY;
  let aiResults: SearchIntentResult[] = [];

  if (apiKey) {
    try {
      aiResults = await analyzeSearchIntentWithGemini(apiKey, context);
    } catch (err: any) {
      console.log(`[SearchIntent] Gemini failed: ${err.message}`);
    }
  }

  // AI 결과가 없으면 규칙 기반 추가 추론
  if (aiResults.length === 0) {
    aiResults = inferAdditionalQueries(context);
  }

  // 병합: guaranteed를 최상위에, AI 결과에서 중복 제거 후 추가
  const seen = new Set(guaranteed.map(g => g.query));
  const merged = [...guaranteed];
  for (const item of aiResults) {
    if (!seen.has(item.query)) {
      seen.add(item.query);
      merged.push(item);
    }
  }

  return merged.slice(0, 10);
}

/**
 * 확실한 검색어 — H1 원문, title 핵심부를 있는 그대로 최상위에
 * 사용자는 주소, 상호명, 상품명을 그대로 검색하는 경우가 가장 많음
 */
function extractGuaranteedQueries(context: SearchIntentContext): SearchIntentResult[] {
  const results: SearchIntentResult[] = [];

  // H1 원문 — 가장 강력한 신호. 주소, 상호명 등 그대로 검색됨
  if (context.h1 && context.h1.length >= 2 && context.h1.length <= 60) {
    results.push({ query: context.h1, confidence: 'high', reason: 'H1 태그 (대표 검색어)' });
  }

  // Title에서 | 또는 - 기준 앞부분 (브랜드명 제외한 핵심)
  if (context.title) {
    const parts = context.title.split(/\s*[|–—]\s*/);
    const mainPart = parts[0].trim();
    // H1과 다를 때만 추가 (중복 방지)
    if (mainPart && mainPart !== context.h1 && mainPart.length <= 80) {
      results.push({ query: mainPart, confidence: 'high', reason: 'Title 핵심부' });
    }

    // Title에서 쉼표로 구분된 키워드들 → 각각 독립 검색어
    // "서울 광진구 자양동 227-155 자양번영로11길 15-3(자양번영로11길 15-3) 거주 후기, 실거래가, 시세"
    // → "자양번영로11길 15-3" 같은 주소 패턴 추출
    const addressPatterns = context.title.match(/[가-힣]+\d+[가-힣]*\s*\d+[-–]\d+/g);
    if (addressPatterns) {
      for (const addr of addressPatterns) {
        const trimmed = addr.trim();
        if (trimmed !== context.h1 && !results.some(r => r.query === trimmed)) {
          results.push({ query: trimmed, confidence: 'high', reason: 'Title 내 주소 패턴' });
        }
      }
    }

    // "OO동 123-45" 패턴 (번지 주소)
    const lotPatterns = context.title.match(/[가-힣]+동\s*\d+[-–]\d+/g);
    if (lotPatterns) {
      for (const lot of lotPatterns) {
        const trimmed = lot.trim();
        if (!results.some(r => r.query === trimmed)) {
          results.push({ query: trimmed, confidence: 'high', reason: 'Title 내 번지 주소' });
        }
      }
    }
  }

  return results;
}

async function analyzeSearchIntentWithGemini(apiKey: string, context: SearchIntentContext): Promise<SearchIntentResult[]> {
  const prompt = `당신은 SEO 검색 노출 분석 전문가입니다.

아래 웹페이지 정보를 보고, 사용자가 구글/네이버에서 어떤 검색어를 입력했을 때 이 페이지가 검색 결과에 노출될 가능성이 높은지 분석해주세요.

URL: ${context.url}
Title: ${context.title}
H1: ${context.h1}
Description: ${context.description}
JSON-LD 타입: ${context.jsonLdTypes.join(', ') || '없음'}
주요 키워드: ${context.topKeywords.join(', ')}

## 중요 규칙
1. H1과 Title에 이미 있는 원문 텍스트(주소, 상호명 등)는 제가 이미 추출했으므로 **중복 제출하지 마세요**
2. 사용자가 **실제로 검색창에 입력할 법한 자연어 쿼리**만 제출하세요
3. Title/Description의 핵심 키워드를 **다양한 조합**으로 제시하세요
4. 해당 페이지가 **어떤 검색 의도**에 부합하는지 고려하세요 (정보 탐색, 비교, 후기 확인 등)

## 응답 형식 (JSON 배열, 5~7개)
[
  {"query": "실제 검색어", "confidence": "high|medium|low", "reason": "이유 10자 이내"}
]

- high: title/description 키워드 직접 조합
- medium: 콘텐츠 맥락에서 추론한 검색어
- low: 간접적으로 연관된 검색어

JSON 배열만 출력. 다른 텍스트 없이.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 400 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.filter((item: any) => item.query && item.confidence && item.reason).slice(0, 7);
  } catch {
    return [];
  }
}

/**
 * AI 없을 때 추가 검색어 추론 (규칙 기반)
 */
function inferAdditionalQueries(context: SearchIntentContext): SearchIntentResult[] {
  const results: SearchIntentResult[] = [];

  // 키워드 조합
  if (context.topKeywords.length >= 2) {
    results.push({ query: context.topKeywords.slice(0, 3).join(' '), confidence: 'medium', reason: '고빈도 키워드 조합' });
  }

  // JSON-LD 기반
  if (context.jsonLdTypes.includes('LocalBusiness') || context.jsonLdTypes.includes('House') || context.jsonLdTypes.includes('RealEstateListing')) {
    const locationWords = context.topKeywords.filter(k => /[동구시군면읍리역]$/.test(k));
    if (locationWords.length > 0) {
      results.push({ query: `${locationWords[0]} 후기`, confidence: 'medium', reason: '지역 + 후기 검색' });
      results.push({ query: `${locationWords[0]} 시세`, confidence: 'medium', reason: '지역 + 시세 검색' });
      results.push({ query: `${locationWords[0]} 전세`, confidence: 'low', reason: '지역 + 거래 유형' });
    }
  }

  if (context.jsonLdTypes.includes('FAQPage') && context.topKeywords[0]) {
    results.push({ query: `${context.topKeywords[0]} 자주 묻는 질문`, confidence: 'low', reason: 'FAQ 구조화 데이터' });
  }

  if (context.jsonLdTypes.includes('MedicalClinic') && context.topKeywords.length >= 2) {
    results.push({ query: `${context.topKeywords[0]} ${context.topKeywords[1]} 가격`, confidence: 'medium', reason: '의료 + 가격 검색' });
  }

  // Description 패턴
  if (context.description) {
    const priceMatch = context.description.match(/(.{2,15})의?\s*(월세|전세|매매|시세|가격|실거래)/);
    if (priceMatch) {
      results.push({ query: `${priceMatch[1]} ${priceMatch[2]}`, confidence: 'medium', reason: 'Description 패턴' });
    }
  }

  return results;
}

