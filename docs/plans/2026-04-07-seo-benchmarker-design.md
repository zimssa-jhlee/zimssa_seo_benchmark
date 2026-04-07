# SEO Benchmarker Design Document

## Overview

SEO 벤치마킹 크롤러 — 웹 UI에서 도메인을 입력하면 크롤링 후 SEO 분석 보고서를 생성하는 도구. 프론트엔드 개발자, 기획자, 마케터가 코드 수정 없이 경쟁사 SEO 세팅을 체계적으로 분석할 수 있다.

## Tech Stack

| Area | Choice |
|---|---|
| Frontend | React (Vite) + TailwindCSS + TypeScript |
| Backend | Express.js + TypeScript |
| Crawling | Playwright (stealth mode) |
| Morpheme Analysis | kiwi-nlp (WASM, POS tagging) |
| DB | SQLite (better-sqlite3) |
| Realtime | SSE (Server-Sent Events) |
| Charts | Recharts |
| Dev Runner | concurrently |

## DB Schema

```sql
CREATE TABLE crawl_sessions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,            -- pending | running | completed | failed
  total_pages INTEGER DEFAULT 0,
  crawled_pages INTEGER DEFAULT 0,
  options TEXT,                    -- JSON: { depth, maxPages }
  summary TEXT,                    -- JSON: { avgScore, topKeywords, jsonLdTypes, ... }
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE crawl_pages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  depth INTEGER NOT NULL,
  status TEXT NOT NULL,            -- success | failed | skipped
  page_type TEXT,                  -- main | list | detail | other
  seo_data TEXT,                   -- JSON: full SEO extraction data
  error_message TEXT,
  crawled_at TEXT,
  FOREIGN KEY (session_id) REFERENCES crawl_sessions(id)
);

CREATE INDEX idx_pages_session ON crawl_pages(session_id);
```

### summary column format

```json
{
  "avgScore": 78.5,
  "topKeywords": [
    { "keyword": "아파트", "count": 45, "ratio": 3.2 },
    { "keyword": "시세", "count": 32, "ratio": 2.1 }
  ],
  "jsonLdTypes": {
    "Organization": 5,
    "BreadcrumbList": 12,
    "FAQPage": 3
  },
  "pageTypeDistribution": {
    "main": 1,
    "list": 8,
    "detail": 25,
    "other": 3
  },
  "metaCompleteness": {
    "title": 95,
    "description": 88,
    "canonical": 72,
    "ogTags": 65
  }
}
```

## Crawling Engine

### Flow

1. robots.txt fetch & parse -> collect disallow paths
2. Visit start URL (Playwright stealth mode)
3. Wait for JS rendering -> extract HTML
4. Run all SEO extractors in parallel
5. Discover internal links -> add to queue (check depth & maxPages limit)
6. 1-2s delay before next page
7. Send progress via SSE after each page
8. On error: skip page, log failure to DB, continue

### Stealth Mode

Playwright stealth features applied:
- Realistic User-Agent
- WebGL/Canvas fingerprint randomization
- Navigator properties masking
- Timezone/locale consistency

### Rate Limiting

- 1-2 second delay between requests
- Respect robots.txt disallow rules
- Skip URLs matching disallow patterns

## SEO Extraction

### Per-page data (seo_data JSON)

```typescript
interface SeoData {
  metadata: {
    title: { content: string; length: number };
    description: { content: string; length: number };
    keywords: string;
    canonical: string;
    robots: string;
    googlebot: string;
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
    verificationTags: Record<string, string>;
    hreflang: Array<{ lang: string; href: string }>;
    viewport: string;
  };
  structuredData: {
    jsonLd: Array<{
      type: string;
      raw: object;
    }>;
  };
  semantic: {
    headings: Array<{ level: number; text: string }>;
    semanticTags: Record<string, number>; // nav: 2, main: 1, ...
    images: { total: number; withAlt: number; altRatio: number };
    links: {
      internal: number;
      external: number;
      nofollow: number;
    };
  };
  keywords: {
    targetKeywords: string[];
    density: Array<{
      keyword: string;
      count: number;
      ratio: number;
      inTitle: boolean;
      inDescription: boolean;
      inH1: boolean;
    }>;
    totalText: { chars: number; words: number };
  };
  content: {
    imageCount: number;
    videoCount: number;
    ctaButtons: string[];
    internalLinkTargets: Array<{ url: string; text: string }>;
  };
  technical: {
    robotsTxt: string | null;      // domain-level, fetched once
    sitemapExists: boolean;
    sitemapUrlCount: number;
    httpHeaders: Record<string, string>;
    renderingType: 'SSR' | 'CSR' | 'unknown';
  };
  score: number; // 0-100
}
```

## SEO Score ("SEO 설정 완성도")

Label: **"SEO 설정 완성도"** (not "SEO 점수")
Subtitle: "이 지표는 SEO 설정 항목의 구현 현황을 수치화한 것입니다"

### Scoring Criteria (100 points total)

| Item | Points | Criteria |
|---|---|---|
| title | 15 | Exists, 10-60 chars |
| meta description | 15 | Exists, 50-160 chars |
| canonical URL | 10 | Exists |
| OG tags | 10 | og:title, og:description, og:image, og:url present |
| JSON-LD | 15 | At least one valid JSON-LD block |
| h1 tag | 10 | Exists and is unique |
| Image alt ratio | 10 | Percentage of images with alt |
| Semantic tags | 5 | Uses nav, main, article, etc. |
| robots.txt | 5 | Exists at domain root |
| sitemap.xml | 5 | Exists at domain root |

## Page Type Classification

URL pattern-based auto-classification with configurable rules:

```typescript
// Default rules (overridable via config)
const defaultClassificationRules = [
  { type: 'main', pattern: /^\/$/ },
  { type: 'list', pattern: /\/(list|search|category|archive|tag|page)/ },
  { type: 'detail', pattern: /\/[a-z-]+\/[\w-]+$|\/\d+$|\/[a-z-]+-\d+/ },
  // Fallback: 'other'
];
```

Rules are loaded from a config file so users can customize per-domain.

## Keyword Analysis (kiwi-nlp)

### Process

1. Extract visible text from page (strip HTML tags)
2. Tokenize with kiwi-nlp (POS tagging)
3. Keep only: NNG (common noun), NNP (proper noun), VV (verb), VA (adjective)
4. Apply supplementary stopword list
5. Count frequency, calculate density ratio
6. Cross-reference with title/description/h1 for target keyword inference
7. Top 20 keywords displayed as bar chart + word cloud

### Target Keyword Inference

Keywords appearing in 2+ of these locations are flagged as "target keywords":
- `<title>`
- `<meta description>`
- `<h1>`
- `og:title`

## Report UI

### Main Dashboard
- URL input + crawl options (depth, maxPages)
- "크롤링 시작" button -> SSE progress display
- Crawl history list (domain, date, page count, status, avg score)
- Multi-domain comparison dashboard (when 2+ sessions exist)

### Domain Report (tabs)
- **요약**: SEO 설정 완성도, target keywords, key findings
- **페이지 목록**: All crawled pages (URL, type, score), sortable/filterable
- **키워드 분석**: Keyword density, word cloud, target keyword inference
- **기술 분석**: Metadata, JSON-LD viewer, semantic structure
- **비교**: Cross-domain comparison (when 2+ sessions in history)

### Page Detail
- Full SEO data for the page
- Collapsible JSON-LD tree viewer
- Heading hierarchy tree visualization
- Keyword density chart
- Full meta tag list

### Cross-domain Comparison
- JSON-LD usage comparison matrix
- Meta completeness score comparison
- Keyword strategy differences
- Auto-generated action items for "짐싸"

## Project Structure

```
seo-benchmarker/
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── crawl.ts
│   │   ├── sessions.ts
│   │   └── reports.ts
│   ├── crawler/
│   │   ├── engine.ts
│   │   ├── discoverer.ts
│   │   ├── extractors/
│   │   │   ├── metadata.ts
│   │   │   ├── jsonld.ts
│   │   │   ├── semantic.ts
│   │   │   ├── keywords.ts
│   │   │   ├── content.ts
│   │   │   └── technical.ts
│   │   └── utils/
│   │       ├── robots.ts
│   │       ├── stopwords.ts
│   │       └── classifier.ts
│   └── db/
│       ├── schema.ts
│       └── index.ts
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Report.tsx
│   │   └── PageDetail.tsx
│   ├── components/
│   │   ├── CrawlForm.tsx
│   │   ├── CrawlProgress.tsx
│   │   ├── HistoryList.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── KeywordCloud.tsx
│   │   ├── KeywordChart.tsx
│   │   ├── JsonLdViewer.tsx
│   │   ├── HeadingTree.tsx
│   │   ├── CompareMatrix.tsx
│   │   └── ActionItems.tsx
│   └── App.tsx
├── package.json
└── tsconfig.json
```

## Running

```bash
npm install
npm run dev  # Express server + Vite dev server via concurrently
```
