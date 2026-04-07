import type { MetadataResult } from './metadata.js';
import type { JsonLdResult } from './jsonld.js';
import type { SemanticResult } from './semantic.js';
import type { TechnicalResult } from './technical.js';

export interface ScoreBreakdown {
  total: number;
  items: Array<{
    name: string;
    score: number;
    maxScore: number;
    details: string;
  }>;
}

export function calculateSeoScore(
  metadata: MetadataResult,
  jsonLd: JsonLdResult,
  semantic: SemanticResult,
  technical: TechnicalResult,
): ScoreBreakdown {
  const items: ScoreBreakdown['items'] = [];

  // Title (15 points)
  const titleLen = metadata.title.length;
  let titleScore = 0;
  if (titleLen > 0) titleScore += 5;
  if (titleLen >= 10 && titleLen <= 60) titleScore += 10;
  else if (titleLen > 0) titleScore += 5;
  items.push({ name: 'title', score: titleScore, maxScore: 15, details: `${titleLen}자` });

  // Description (15 points)
  const descLen = metadata.description.length;
  let descScore = 0;
  if (descLen > 0) descScore += 5;
  if (descLen >= 50 && descLen <= 160) descScore += 10;
  else if (descLen > 0) descScore += 5;
  items.push({ name: 'description', score: descScore, maxScore: 15, details: `${descLen}자` });

  // Canonical (10 points)
  const canonicalScore = metadata.canonical ? 10 : 0;
  items.push({ name: 'canonical', score: canonicalScore, maxScore: 10, details: metadata.canonical || '없음' });

  // OG tags (10 points)
  const ogRequired = ['og:title', 'og:description', 'og:image', 'og:url'];
  const ogPresent = ogRequired.filter((k) => metadata.ogTags[k]);
  const ogScore = Math.round((ogPresent.length / ogRequired.length) * 10);
  items.push({ name: 'ogTags', score: ogScore, maxScore: 10, details: `${ogPresent.length}/${ogRequired.length} 태그` });

  // JSON-LD (15 points)
  const jsonLdScore = jsonLd.jsonLd.length > 0 ? 15 : 0;
  items.push({ name: 'jsonLd', score: jsonLdScore, maxScore: 15, details: `${jsonLd.jsonLd.length}개 블록` });

  // H1 (10 points)
  const h1s = semantic.headings.filter((h) => h.level === 1);
  let h1Score = 0;
  if (h1s.length === 1) h1Score = 10;
  else if (h1s.length > 1) h1Score = 5;
  items.push({ name: 'h1', score: h1Score, maxScore: 10, details: `${h1s.length}개` });

  // Image alt (10 points)
  const altScore = Math.round(semantic.images.altRatio * 10);
  items.push({ name: 'imageAlt', score: altScore, maxScore: 10, details: `${Math.round(semantic.images.altRatio * 100)}%` });

  // Semantic tags (5 points)
  const semanticCount = Object.keys(semantic.semanticTags).length;
  const semanticScore = Math.min(semanticCount, 5);
  items.push({ name: 'semanticTags', score: semanticScore, maxScore: 5, details: `${semanticCount}종류` });

  // robots.txt (5 points)
  const robotsScore = technical.robotsTxt ? 5 : 0;
  items.push({ name: 'robotsTxt', score: robotsScore, maxScore: 5, details: technical.robotsTxt ? '존재' : '없음' });

  // sitemap (5 points)
  const sitemapScore = technical.sitemapExists ? 5 : 0;
  items.push({ name: 'sitemap', score: sitemapScore, maxScore: 5, details: technical.sitemapExists ? `${technical.sitemapUrlCount} URLs` : '없음' });

  const total = items.reduce((sum, item) => sum + item.score, 0);

  return { total, items };
}
