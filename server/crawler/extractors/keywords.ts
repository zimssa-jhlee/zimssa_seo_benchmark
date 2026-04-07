import type { Page } from 'playwright';
import { tokenizeKorean } from '../utils/stopwords.js';
import { filterKeywords, analyzeSearchIntent } from '../utils/keyword-filter.js';

export interface SearchIntent {
  query: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface KeywordsResult {
  targetKeywords: string[];
  searchIntents: SearchIntent[];
  density: Array<{
    keyword: string;
    count: number;
    ratio: number;
    inTitle: boolean;
    inDescription: boolean;
    inH1: boolean;
  }>;
  totalText: { chars: number; words: number };
}

const VISIBLE_TEXT_SCRIPT = `(() => {
  const el = document.body.cloneNode(true);
  el.querySelectorAll('script, style, noscript, svg, iframe').forEach(e => e.remove());
  return (el.textContent || '').replace(/\\s+/g, ' ').trim();
})()`;

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

  const top20 = filtered.slice(0, 20);

  const titleTokens = new Set(tokenizeKorean(metadata.title));
  const descTokens = new Set(tokenizeKorean(metadata.description));
  const h1Tokens = new Set(tokenizeKorean(metadata.h1));
  const ogTokens = new Set(tokenizeKorean(metadata.ogTitle));

  const density = top20.map(({ keyword, count }) => ({
    keyword,
    count,
    ratio: totalWords > 0 ? Math.round((count / totalWords) * 10000) / 100 : 0,
    inTitle: titleTokens.has(keyword),
    inDescription: descTokens.has(keyword),
    inH1: h1Tokens.has(keyword),
  }));

  const targetKeywords = top20
    .map(({ keyword }) => keyword)
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
    topKeywords: top20.slice(0, 10).map(k => k.keyword),
  });

  return {
    targetKeywords,
    searchIntents,
    density,
    totalText: { chars, words: totalWords },
  };
}
