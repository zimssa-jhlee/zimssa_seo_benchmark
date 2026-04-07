import type { Response as PlaywrightResponse } from 'playwright';
import type { RobotsRules } from '../utils/robots.js';

export interface TechnicalResult {
  robotsTxt: string | null;
  sitemapExists: boolean;
  sitemapUrlCount: number;
  httpHeaders: Record<string, string>;
  renderingType: 'SSR' | 'CSR' | 'unknown';
}

export async function extractTechnical(
  domain: string,
  response: PlaywrightResponse | null,
  initialHtml: string,
  renderedHtml: string,
  robotsRules: RobotsRules,
): Promise<TechnicalResult> {
  // HTTP headers (SEO-relevant)
  const httpHeaders: Record<string, string> = {};
  if (response) {
    const allHeaders = response.headers();
    const seoHeaders = ['x-robots-tag', 'cache-control', 'content-type', 'x-frame-options', 'strict-transport-security'];
    for (const h of seoHeaders) {
      if (allHeaders[h]) httpHeaders[h] = allHeaders[h];
    }
  }

  // Sitemap check
  let sitemapExists = false;
  let sitemapUrlCount = 0;
  const sitemapUrls = robotsRules.sitemapUrls.length > 0
    ? robotsRules.sitemapUrls
    : [`https://${domain}/sitemap.xml`];

  for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
    try {
      const sitemapRes = await fetch(sitemapUrl);
      if (sitemapRes.ok) {
        sitemapExists = true;
        const text = await sitemapRes.text();
        sitemapUrlCount += (text.match(/<loc>/g) || []).length;
      }
    } catch {
      // sitemap not available
    }
  }

  // Rendering type detection
  const initialContentLength = initialHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim().length;
  const renderedContentLength = renderedHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim().length;

  let renderingType: 'SSR' | 'CSR' | 'unknown' = 'unknown';
  if (initialContentLength > 500) {
    renderingType = 'SSR';
  } else if (renderedContentLength > initialContentLength * 3 && initialContentLength < 200) {
    renderingType = 'CSR';
  }

  return {
    robotsTxt: robotsRules.rawContent || null,
    sitemapExists,
    sitemapUrlCount,
    httpHeaders,
    renderingType,
  };
}
