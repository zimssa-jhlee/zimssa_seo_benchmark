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
5. **단순 주소/지역 구성요소** — "서울", "광진구", "자양동", "서울특별시" 등 순수 행정구역명 단독. 단, "강남역 맛집"처럼 서비스와 결합된 경우는 유지

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
  topKeywords: string[];     // 비즈니스 키워드
  locationKeywords?: string[]; // 지역 키워드
};

export async function analyzeSearchIntent(context: SearchIntentContext): Promise<SearchIntentResult[]> {
  // 1단계: 규칙 기반 확실한 검색어 (H1, 주소 패턴)
  const guaranteed = extractGuaranteedQueries(context);

  // 2단계: AI로 실사용자 검색 패턴 추론
  const apiKey = process.env.GEMINI_API_KEY;
  let aiResults: SearchIntentResult[] = [];

  if (apiKey) {
    try {
      aiResults = await analyzeSearchIntentWithGemini(apiKey, context);
    } catch (err: any) {
      console.log(`[SearchIntent] Gemini failed: ${err.message}`);
    }
  }

  if (aiResults.length === 0) {
    aiResults = inferAdditionalQueries(context);
  }

  // 병합: guaranteed 최상위, AI 중복 제거 후 추가
  const seen = new Set(guaranteed.map(g => g.query));
  const merged = [...guaranteed];
  for (const item of aiResults) {
    if (!seen.has(item.query)) {
      seen.add(item.query);
      merged.push(item);
    }
  }

  return merged.slice(0, 12);
}

/**
 * 확실한 검색어 — H1 원문, 주소 패턴
 */
function extractGuaranteedQueries(context: SearchIntentContext): SearchIntentResult[] {
  const results: SearchIntentResult[] = [];
  const seen = new Set<string>();

  function add(query: string, confidence: SearchIntentResult['confidence'], reason: string) {
    const q = query.trim();
    if (q.length < 2 || q.length > 50 || seen.has(q)) return;
    seen.add(q);
    results.push({ query: q, confidence, reason });
  }

  // H1 원문
  if (context.h1 && context.h1.length >= 2 && context.h1.length <= 50) {
    add(context.h1, 'high', 'H1 (대표 검색어)');
  }

  // 주소 패턴 추출
  const textSources = [context.title, context.description].join(' ');

  const roadAddresses = textSources.match(/[가-힣]+(?:로|길)\s*\d+(?:번길)?\s*\d+[-–]\d+/g);
  if (roadAddresses) {
    for (const addr of roadAddresses) add(addr.replace(/–/g, '-'), 'high', '도로명 주소');
  }

  const lotAddresses = textSources.match(/[가-힣]+동\s*\d+[-–]\d+/g);
  if (lotAddresses) {
    for (const addr of lotAddresses) add(addr.replace(/–/g, '-'), 'high', '지번 주소');
  }

  return results;
}

async function analyzeSearchIntentWithGemini(apiKey: string, context: SearchIntentContext): Promise<SearchIntentResult[]> {
  const locationStr = context.locationKeywords?.join(', ') || '없음';
  const businessStr = context.topKeywords.join(', ') || '없음';

  const prompt = `당신은 SEO 검색 노출 분석 전문가입니다.

아래 웹페이지의 SEO 데이터와 콘텐츠 키워드를 종합 분석하여, 실제 사용자가 구글/네이버에서 어떤 검색어를 입력했을 때 이 페이지가 검색 결과에 노출될 가능성이 높은지 추론해주세요.

## 페이지 SEO 데이터
- URL: ${context.url}
- Title: ${context.title}
- H1: ${context.h1}
- Description: ${context.description}
- JSON-LD 타입: ${context.jsonLdTypes.join(', ') || '없음'}

## 콘텐츠 키워드 분석 결과
- 지역 키워드 (고빈도): ${locationStr}
- 비즈니스 키워드 (고빈도): ${businessStr}

## 분석 규칙

### 필수 포함 — 다양한 검색 패턴을 반영하세요:
1. **H1 + 서비스 키워드 조합**: H1과 title에 명시된 서비스 키워드(시세, 매매, 후기 등)를 조합
2. **지역 + 업종/카테고리 검색**: 지역 키워드 + 비즈니스 키워드 상위 항목 조합 (예: "전민동 아파트", "강남 피부과")
   - 이런 검색어는 해당 지역의 해당 업종 페이지를 노출시키는 가장 일반적인 패턴임
3. **H1의 핵심 고유명사 + 일반 검색어**: H1에서 고유명사만 추출하여 일반 검색 패턴과 조합 (예: "엑스포 아파트", "삼성 아파트")
4. **사용자 의도 기반**: 정보 탐색, 비교, 후기 확인, 가격 확인 등 다양한 검색 의도 반영

### 제외:
- H1 원문 그대로 (이미 추출됨)
- 주소 패턴 (이미 추출됨)
- title 전체 텍스트를 그대로 넣지 마세요

### 근거 규칙:
- 모든 검색어는 **페이지의 SEO 데이터 또는 콘텐츠 키워드에 근거**해야 합니다
- 페이지에 없는 키워드를 임의로 조합하지 마세요
- "지역 + 업종" 조합은 해당 지역과 업종이 모두 페이지 데이터에 존재할 때만 가능

## 응답 형식 (JSON 배열, 8~12개)
[
  {"query": "검색어", "confidence": "high|medium|low", "reason": "근거 10자 이내"}
]

confidence 기준:
- high: title/h1/description 키워드의 직접 조합
- medium: 콘텐츠 키워드 기반 추론 (지역+업종, 고유명사 축약형 등)
- low: 간접적으로 연관된 검색 의도

JSON 배열만 출력.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.filter((item: any) => item.query && item.confidence && item.reason).slice(0, 12);
  } catch {
    return [];
  }
}

/**
 * AI 없을 때 규칙 기반 추론 — 지역+업종, H1+서비스 조합
 */
function inferAdditionalQueries(context: SearchIntentContext): SearchIntentResult[] {
  const results: SearchIntentResult[] = [];
  const locations = context.locationKeywords || [];
  const keywords = context.topKeywords;

  // H1 + 서비스 키워드 조합 (title에서 추출)
  if (context.h1 && context.title) {
    const beforeBrand = context.title.split(/\s*[|]\s*/)[0];
    const withoutParens = beforeBrand.replace(/\([^)]*\)/g, '');
    const segments = withoutParens.split(/[,，、]/).map(s => s.trim().replace(/^[''""]|[''""]$/g, ''));

    for (const seg of segments) {
      if (seg.length >= 2 && seg.length <= 10 && seg !== context.h1) {
        results.push({ query: `${context.h1} ${seg}`, confidence: 'high', reason: 'H1 + 서비스 키워드' });
      }
    }
  }

  // 지역 + 비즈니스 키워드 조합 (가장 중요한 거시적 패턴)
  if (locations.length > 0 && keywords.length > 0) {
    // 첫 번째 지역 + 주요 비즈니스 키워드
    const mainLocation = locations[0];
    for (const kw of keywords.slice(0, 3)) {
      results.push({ query: `${mainLocation} ${kw}`, confidence: 'medium', reason: '지역 + 업종 검색' });
    }
  }

  // JSON-LD 기반 추가
  if (locations.length > 0) {
    const loc = locations[0];
    if (context.jsonLdTypes.some(t => ['LocalBusiness', 'House', 'ApartmentComplex', 'RealEstateListing'].includes(t))) {
      results.push({ query: `${loc} 후기`, confidence: 'medium', reason: '지역 + 후기' });
      results.push({ query: `${loc} 시세`, confidence: 'medium', reason: '지역 + 시세' });
    }
    if (context.jsonLdTypes.includes('MedicalClinic')) {
      results.push({ query: `${loc} 병원`, confidence: 'medium', reason: '지역 + 업종' });
    }
    if (context.jsonLdTypes.includes('FAQPage') && keywords[0]) {
      results.push({ query: `${keywords[0]} 자주 묻는 질문`, confidence: 'low', reason: 'FAQ 데이터' });
    }
  }

  // Description 패턴
  if (context.description) {
    const priceMatch = context.description.match(/(.{2,12})의?\s*(월세|전세|매매|시세|가격|실거래)/);
    if (priceMatch) {
      results.push({ query: `${priceMatch[1]} ${priceMatch[2]}`, confidence: 'medium', reason: 'Description 패턴' });
    }
  }

  return results;
}

