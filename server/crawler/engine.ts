import { chromium, type Browser, type BrowserContext } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  updateSessionStatus,
  updateSessionProgress,
  updateSessionSummary,
  insertPage,
  getSessionPages,
} from '../db/index.js';
import { fetchRobotsTxt, isPathAllowed } from './utils/robots.js';
import { classifyPageType } from './utils/classifier.js';
import { extractMetadata } from './extractors/metadata.js';
import { extractJsonLd } from './extractors/jsonld.js';
import { extractSemantic } from './extractors/semantic.js';
import { extractKeywords } from './extractors/keywords.js';
import { extractContent } from './extractors/content.js';
import { extractTechnical } from './extractors/technical.js';
import { calculateSeoScore } from './extractors/score.js';
import { discoverLinks } from './discoverer.js';

export interface CrawlOptions {
  depth: number;
  maxPages: number;
}

export interface CrawlEvent {
  type: 'started' | 'page_crawled' | 'page_failed' | 'progress' | 'completed' | 'failed';
  sessionId: string;
  data?: any;
}

// Global event emitter for SSE
export const crawlEvents = new EventEmitter();
crawlEvents.setMaxListeners(100);

function emitEvent(event: CrawlEvent) {
  crawlEvents.emit(`crawl:${event.sessionId}`, event);
  console.log(`[Crawl ${event.sessionId.slice(0, 8)}] ${event.type}`, event.data?.url || '');
}

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    javaScriptEnabled: true,
  });

  // Stealth scripts to avoid bot detection (string-based to avoid tsx __name injection)
  await context.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    window.chrome = { runtime: {} };
    const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  `);

  return context;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startCrawl(sessionId: string, startUrl: string, options: CrawlOptions): Promise<void> {
  let browser: Browser | null = null;
  try {
    updateSessionStatus(sessionId, 'running');
    emitEvent({ type: 'started', sessionId });

    const parsedUrl = new URL(startUrl);
    const domain = parsedUrl.hostname;

    // Fetch robots.txt
    const robotsRules = await fetchRobotsTxt(domain);

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await createStealthContext(browser);

    // BFS crawl queue
    const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
    const visited = new Set<string>();
    let crawledCount = 0;

    // Technical data (fetched once per domain)
    let domainTechnical: any = null;

    while (queue.length > 0 && crawledCount < options.maxPages) {
      const { url, depth } = queue.shift()!;

      // Normalize URL
      const normalizedUrl = url.replace(/\/$/, '');
      if (visited.has(normalizedUrl)) continue;
      visited.add(normalizedUrl);

      // Check robots.txt
      const urlPath = new URL(normalizedUrl).pathname;
      if (!isPathAllowed(urlPath, robotsRules)) {
        console.log(`[Crawl] Skipped (robots.txt): ${normalizedUrl}`);
        continue;
      }

      const pageId = uuidv4();
      let page: import('playwright').Page | null = null;

      try {
        page = await context.newPage();

        // Capture initial HTML (before JS rendering) for SSR/CSR detection
        let initialHtml = '';
        page.on('response', async (response) => {
          if (response.url() === normalizedUrl && response.headers()['content-type']?.includes('text/html')) {
            try {
              initialHtml = await response.text();
            } catch { /* ignore */ }
          }
        });

        let response = await page.goto(normalizedUrl, {
          waitUntil: 'networkidle',
          timeout: 30000,
        }).catch(async (err) => {
          // Fallback: http → https
          if (normalizedUrl.startsWith('http://')) {
            const httpsUrl = normalizedUrl.replace('http://', 'https://');
            console.log(`[Crawl] Retrying with HTTPS: ${httpsUrl}`);
            return page!.goto(httpsUrl, { waitUntil: 'networkidle', timeout: 30000 });
          }
          throw err;
        });

        // Wait for dynamic content
        await page.waitForTimeout(1000);

        const renderedHtml = await page.content();

        // Run extractors in parallel
        const [metadata, jsonLd, semantic, content] = await Promise.all([
          extractMetadata(page),
          extractJsonLd(page),
          extractSemantic(page, normalizedUrl),
          extractContent(page, normalizedUrl),
        ]);

        // Keywords need metadata results
        const h1Text = semantic.headings.find((h) => h.level === 1)?.text || '';
        const keywords = await extractKeywords(page, {
          title: metadata.title.content,
          description: metadata.description.content,
          h1: h1Text,
          ogTitle: metadata.ogTags['og:title'] || '',
        }, normalizedUrl);

        // Technical (once per domain)
        if (!domainTechnical) {
          domainTechnical = await extractTechnical(
            domain,
            response,
            initialHtml,
            renderedHtml,
            robotsRules,
          );
        }

        // Calculate score
        const scoreResult = calculateSeoScore(metadata, jsonLd, semantic, domainTechnical);

        const seoData = {
          metadata,
          structuredData: jsonLd,
          semantic,
          keywords,
          content,
          technical: domainTechnical,
          score: scoreResult.total,
          scoreBreakdown: scoreResult.items,
        };

        // Classify page type
        const pageType = classifyPageType(urlPath);

        // Save to DB
        insertPage({
          id: pageId,
          sessionId,
          url: normalizedUrl,
          depth,
          status: 'success',
          pageType,
          seoData,
        });

        crawledCount++;
        updateSessionProgress(sessionId, crawledCount, Math.min(queue.length + crawledCount, options.maxPages));

        emitEvent({
          type: 'page_crawled',
          sessionId,
          data: { url: normalizedUrl, pageType, score: scoreResult.total, crawledCount },
        });

        emitEvent({
          type: 'progress',
          sessionId,
          data: {
            crawledPages: crawledCount,
            totalPages: Math.min(queue.length + crawledCount, options.maxPages),
            currentUrl: normalizedUrl,
          },
        });

        // Discover links if not at max depth
        if (depth < options.depth) {
          const links = await discoverLinks(page, normalizedUrl, domain);
          for (const link of links) {
            const normalized = link.url.replace(/\/$/, '');
            if (!visited.has(normalized)) {
              queue.push({ url: normalized, depth: depth + 1 });
            }
          }
        }
      } catch (error: any) {
        insertPage({
          id: pageId,
          sessionId,
          url: normalizedUrl,
          depth,
          status: 'failed',
          errorMessage: error.message,
        });

        emitEvent({
          type: 'page_failed',
          sessionId,
          data: { url: normalizedUrl, error: error.message },
        });
      } finally {
        // Always close the page to prevent memory leaks and browser crashes
        if (page) {
          await page.close().catch(() => {});
        }
      }

      // Rate limiting delay (1-2 seconds)
      await delay(1000 + Math.random() * 1000);
    }

    // Generate summary
    const summary = generateSessionSummary(sessionId);
    updateSessionSummary(sessionId, summary);
    updateSessionStatus(sessionId, 'completed');
    updateSessionProgress(sessionId, crawledCount, crawledCount);

    emitEvent({ type: 'completed', sessionId, data: { totalPages: crawledCount, summary } });
  } catch (error: any) {
    updateSessionStatus(sessionId, 'failed');
    emitEvent({ type: 'failed', sessionId, data: { error: error.message } });
  } finally {
    if (browser) await browser.close();
  }
}

function generateSessionSummary(sessionId: string): object {
  const pages = getSessionPages(sessionId) as any[];
  const successPages = pages.filter((p) => p.status === 'success');

  if (successPages.length === 0) {
    return { avgScore: 0, topKeywords: [], jsonLdTypes: {}, pageTypeDistribution: {}, metaCompleteness: {} };
  }

  let totalScore = 0;
  const keywordFreq = new Map<string, number>();
  const jsonLdTypes: Record<string, number> = {};
  const pageTypeDist: Record<string, number> = {};
  let hasTitle = 0;
  let hasDescription = 0;
  let hasCanonical = 0;
  let hasOg = 0;

  for (const page of successPages) {
    const data = JSON.parse(page.seo_data);

    totalScore += data.score || 0;

    // Keywords aggregation
    if (data.keywords?.density) {
      for (const kw of data.keywords.density) {
        keywordFreq.set(kw.keyword, (keywordFreq.get(kw.keyword) || 0) + kw.count);
      }
    }

    // JSON-LD types
    if (data.structuredData?.jsonLd) {
      for (const ld of data.structuredData.jsonLd) {
        jsonLdTypes[ld.type] = (jsonLdTypes[ld.type] || 0) + 1;
      }
    }

    // Page type
    const pt = page.page_type || 'other';
    pageTypeDist[pt] = (pageTypeDist[pt] || 0) + 1;

    // Meta completeness
    if (data.metadata?.title?.content) hasTitle++;
    if (data.metadata?.description?.content) hasDescription++;
    if (data.metadata?.canonical) hasCanonical++;
    if (data.metadata?.ogTags && Object.keys(data.metadata.ogTags).length > 0) hasOg++;
  }

  const total = successPages.length;
  const topKeywords = [...keywordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count, ratio: Math.round((count / total) * 100) / 100 }));

  return {
    avgScore: Math.round(totalScore / total * 10) / 10,
    topKeywords,
    jsonLdTypes,
    pageTypeDistribution: pageTypeDist,
    metaCompleteness: {
      title: Math.round((hasTitle / total) * 100),
      description: Math.round((hasDescription / total) * 100),
      canonical: Math.round((hasCanonical / total) * 100),
      ogTags: Math.round((hasOg / total) * 100),
    },
  };
}
