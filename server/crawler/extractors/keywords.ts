import type { Page } from 'playwright';
import { tokenizeKorean } from '../utils/stopwords.js';
import { filterKeywords, analyzeSearchIntent } from '../utils/keyword-filter.js';

export interface SearchIntent {
  query: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface KeywordDensityItem {
  keyword: string;
  count: number;
  ratio: number;
  inTitle: boolean;
  inDescription: boolean;
  inH1: boolean;
}

export interface KeywordsResult {
  targetKeywords: string[];
  searchIntents: SearchIntent[];
  locationKeywords: KeywordDensityItem[];
  density: KeywordDensityItem[];
  totalText: { chars: number; words: number };
}

const VISIBLE_TEXT_SCRIPT = `(() => {
  const el = document.body.cloneNode(true);
  el.querySelectorAll('script, style, noscript, svg, iframe').forEach(e => e.remove());
  return (el.textContent || '').replace(/\\s+/g, ' ').trim();
})()`;

/**
 * 지역/주소 키워드 판별
 * 행정구역명, 도로명, 동/리/읍/면 등 주소 구성요소
 */
function isLocationKeyword(keyword: string): boolean {
  // 행정구역 접미 패턴
  if (/[시도군구읍면동리로길]$/.test(keyword) && keyword.length >= 2) return true;
  // 역 이름
  if (/역$/.test(keyword) && keyword.length >= 3) return true;
  // 광역시/특별시 등
  if (/특별시$|광역시$|특별자치/.test(keyword)) return true;
  // 명시적 지역명
  const knownLocations = new Set([
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
    '서울특별시', '서울시',
  ]);
  if (knownLocations.has(keyword)) return true;
  return false;
}

export async function extractKeywords(
  page: Page,
  metadata: { title: string; description: string; h1: string; ogTitle: string },
  pageUrl: string,
  jsonLdTypes?: string[],
): Promise<KeywordsResult> {
  const visibleText: string = await page.evaluate(VISIBLE_TEXT_SCRIPT);
  const chars = visibleText.length;

  const contentTokens = tokenizeKorean(visibleText);
  const totalWords = contentTokens.length;

  const freqMap = new Map<string, number>();
  for (const token of contentTokens) {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  const sorted = [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);

  const filtered = await filterKeywords(
    sorted.map(([keyword, count]) => ({ keyword, count })),
    { url: pageUrl, title: metadata.title, description: metadata.description },
  );

  const titleTokens = new Set(tokenizeKorean(metadata.title));
  const descTokens = new Set(tokenizeKorean(metadata.description));
  const h1Tokens = new Set(tokenizeKorean(metadata.h1));
  const ogTokens = new Set(tokenizeKorean(metadata.ogTitle));

  function toDensityItem(keyword: string, count: number): KeywordDensityItem {
    return {
      keyword,
      count,
      ratio: totalWords > 0 ? Math.round((count / totalWords) * 10000) / 100 : 0,
      inTitle: titleTokens.has(keyword),
      inDescription: descTokens.has(keyword),
      inH1: h1Tokens.has(keyword),
    };
  }

  // Separate location keywords from business keywords
  const locationKeywords: KeywordDensityItem[] = [];
  const businessKeywords: KeywordDensityItem[] = [];

  for (const { keyword, count } of filtered) {
    const item = toDensityItem(keyword, count);
    if (isLocationKeyword(keyword)) {
      locationKeywords.push(item);
    } else {
      businessKeywords.push(item);
    }
  }

  // Top 15 business keywords for density chart
  const density = businessKeywords.slice(0, 15);

  // Target keywords: appears in 2+ of title/desc/h1/og (from business keywords)
  const targetKeywords = businessKeywords
    .slice(0, 20)
    .map(k => k.keyword)
    .filter((keyword) => {
      let score = 0;
      if (titleTokens.has(keyword)) score++;
      if (descTokens.has(keyword)) score++;
      if (h1Tokens.has(keyword)) score++;
      if (ogTokens.has(keyword)) score++;
      return score >= 2;
    });

  // Search intent analysis
  const searchIntents = await analyzeSearchIntent({
    url: pageUrl,
    title: metadata.title,
    description: metadata.description,
    h1: metadata.h1,
    ogTitle: metadata.ogTitle,
    jsonLdTypes: jsonLdTypes || [],
    topKeywords: businessKeywords.slice(0, 10).map(k => k.keyword),
  });

  return {
    targetKeywords,
    searchIntents,
    locationKeywords: locationKeywords.slice(0, 10),
    density,
    totalText: { chars, words: totalWords },
  };
}
