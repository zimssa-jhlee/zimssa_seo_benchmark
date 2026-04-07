# SEO Benchmarker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 웹 UI에서 도메인을 입력하면 Playwright로 크롤링 후 SEO 분석 보고서를 생성하는 풀스택 도구를 구축한다.

**Architecture:** Express.js 백엔드가 Playwright stealth 크롤러를 실행하고, SSE로 진행 상황을 프론트에 전달한다. 크롤링 결과는 SQLite에 저장되며, React 프론트엔드가 보고서를 시각화한다. kiwi-nlp로 한국어 형태소 분석을 수행한다.

**Tech Stack:** React (Vite) + TailwindCSS, Express.js, Playwright (stealth), kiwi-nlp, better-sqlite3, Recharts, SSE, TypeScript

**Design Doc:** `docs/plans/2026-04-07-seo-benchmarker-design.md`

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.gitignore`

**Step 1: Initialize project and install all dependencies**

```bash
cd /Users/leejoonhee/develop/seo-benchmarker
npm init -y
```

Install all dependencies:

```bash
# Core
npm install express better-sqlite3 uuid playwright concurrently

# Crawling & Analysis
npm install kiwi-nlp

# Frontend
npm install react react-dom react-router-dom recharts

# Dev dependencies
npm install -D typescript @types/node @types/express @types/better-sqlite3 @types/uuid @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install -D tailwindcss @tailwindcss/vite
npm install -D tsx
```

Install Playwright browsers:
```bash
npx playwright install chromium
```

**Step 2: Create `package.json` scripts**

Update `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "tsc && vite build",
    "build:server": "tsc -p tsconfig.server.json"
  }
}
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@server/*": ["server/*"]
    }
  },
  "include": ["src/**/*", "server/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create `tsconfig.server.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "dist/server",
    "rootDir": "server"
  },
  "include": ["server/**/*"]
}
```

**Step 5: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**Step 6: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SEO Benchmarker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Create `src/main.tsx` with TailwindCSS**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

Create `src/index.css`:
```css
@import "tailwindcss";
```

**Step 8: Create placeholder `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">SEO Benchmarker</h1>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<div>Dashboard placeholder</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

**Step 9: Create `.gitignore`**

```
node_modules/
dist/
data/
*.db
.env
```

**Step 10: Verify dev setup runs**

```bash
npm run dev
```

Expected: Vite dev server on :5173, Express placeholder would fail (created next task). Verify Vite serves the placeholder page.

**Step 11: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: project scaffolding with Vite, React, TailwindCSS, Express, TypeScript"
```

---

## Task 2: SQLite Database Layer

**Files:**
- Create: `server/db/schema.ts`
- Create: `server/db/index.ts`

**Step 1: Create `server/db/schema.ts`**

```typescript
import Database from 'better-sqlite3';

export function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_sessions (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_pages INTEGER DEFAULT 0,
      crawled_pages INTEGER DEFAULT 0,
      options TEXT,
      summary TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crawl_pages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      url TEXT NOT NULL,
      depth INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      page_type TEXT,
      seo_data TEXT,
      error_message TEXT,
      crawled_at TEXT,
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pages_session ON crawl_pages(session_id);
  `);
}
```

**Step 2: Create `server/db/index.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './schema.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(path.join(DATA_DIR, 'seo-benchmarker.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

// Session queries
export function createSession(session: {
  id: string;
  domain: string;
  url: string;
  options: object;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO crawl_sessions (id, domain, url, status, options, created_at)
    VALUES (?, ?, ?, 'pending', ?, datetime('now'))
  `).run(session.id, session.domain, session.url, JSON.stringify(session.options));
}

export function updateSessionStatus(id: string, status: string): void {
  const db = getDb();
  const updates = status === 'completed' || status === 'failed'
    ? `status = ?, completed_at = datetime('now')`
    : `status = ?`;
  db.prepare(`UPDATE crawl_sessions SET ${updates} WHERE id = ?`).run(status, id);
}

export function updateSessionProgress(id: string, crawledPages: number, totalPages: number): void {
  getDb().prepare(`
    UPDATE crawl_sessions SET crawled_pages = ?, total_pages = ? WHERE id = ?
  `).run(crawledPages, totalPages, id);
}

export function updateSessionSummary(id: string, summary: object): void {
  getDb().prepare(`
    UPDATE crawl_sessions SET summary = ? WHERE id = ?
  `).run(JSON.stringify(summary), id);
}

export function getSession(id: string) {
  return getDb().prepare('SELECT * FROM crawl_sessions WHERE id = ?').get(id);
}

export function getAllSessions() {
  return getDb().prepare('SELECT * FROM crawl_sessions ORDER BY created_at DESC').all();
}

export function deleteSession(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM crawl_pages WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM crawl_sessions WHERE id = ?').run(id);
}

// Page queries
export function insertPage(page: {
  id: string;
  sessionId: string;
  url: string;
  depth: number;
  status: string;
  pageType?: string;
  seoData?: object;
  errorMessage?: string;
}): void {
  getDb().prepare(`
    INSERT INTO crawl_pages (id, session_id, url, depth, status, page_type, seo_data, error_message, crawled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    page.id, page.sessionId, page.url, page.depth, page.status,
    page.pageType || null,
    page.seoData ? JSON.stringify(page.seoData) : null,
    page.errorMessage || null,
  );
}

export function getSessionPages(sessionId: string) {
  return getDb().prepare('SELECT * FROM crawl_pages WHERE session_id = ? ORDER BY crawled_at').all(sessionId);
}

export function getPage(id: string) {
  return getDb().prepare('SELECT * FROM crawl_pages WHERE id = ?').get(id);
}
```

**Step 3: Verify compilation**

```bash
npx tsx server/db/index.ts
```

Expected: No errors, `data/seo-benchmarker.db` file created.

**Step 4: Commit**

```bash
git add server/db/
git commit -m "feat: SQLite database layer with sessions and pages tables"
```

---

## Task 3: Express Server + API Routes

**Files:**
- Create: `server/index.ts`
- Create: `server/routes/crawl.ts`
- Create: `server/routes/sessions.ts`
- Create: `server/routes/reports.ts`

**Step 1: Create `server/index.ts`**

```typescript
import express from 'express';
import { crawlRouter } from './routes/crawl.js';
import { sessionsRouter } from './routes/sessions.js';
import { reportsRouter } from './routes/reports.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes
app.use('/api/crawl', crawlRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/reports', reportsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Step 2: Create `server/routes/sessions.ts`**

```typescript
import { Router } from 'express';
import { getAllSessions, deleteSession } from '../db/index.js';

export const sessionsRouter = Router();

// GET /api/sessions — list all crawl sessions
sessionsRouter.get('/', (_req, res) => {
  const sessions = getAllSessions();
  const parsed = sessions.map((s: any) => ({
    ...s,
    options: s.options ? JSON.parse(s.options) : null,
    summary: s.summary ? JSON.parse(s.summary) : null,
  }));
  res.json(parsed);
});

// DELETE /api/sessions/:id — delete a session and its pages
sessionsRouter.delete('/:id', (req, res) => {
  deleteSession(req.params.id);
  res.json({ success: true });
});
```

**Step 3: Create `server/routes/reports.ts`**

```typescript
import { Router } from 'express';
import { getSession, getSessionPages, getPage } from '../db/index.js';

export const reportsRouter = Router();

// GET /api/reports/:sessionId — full report for a session
reportsRouter.get('/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId) as any;
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const pages = getSessionPages(req.params.sessionId);
  const parsedPages = pages.map((p: any) => ({
    ...p,
    seo_data: p.seo_data ? JSON.parse(p.seo_data) : null,
  }));

  res.json({
    session: {
      ...session,
      options: session.options ? JSON.parse(session.options) : null,
      summary: session.summary ? JSON.parse(session.summary) : null,
    },
    pages: parsedPages,
  });
});

// GET /api/reports/:sessionId/pages/:pageId — single page detail
reportsRouter.get('/:sessionId/pages/:pageId', (req, res) => {
  const page = getPage(req.params.pageId) as any;
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }

  res.json({
    ...page,
    seo_data: page.seo_data ? JSON.parse(page.seo_data) : null,
  });
});
```

**Step 4: Create `server/routes/crawl.ts` (stub — engine added in Task 4)**

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession, updateSessionStatus } from '../db/index.js';

export const crawlRouter = Router();

// POST /api/crawl — start a new crawl
crawlRouter.post('/', (req, res) => {
  const { url, options } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const sessionId = uuidv4();
  const domain = parsedUrl.hostname;
  const crawlOptions = {
    depth: options?.depth ?? 2,
    maxPages: options?.maxPages ?? 50,
  };

  createSession({ id: sessionId, domain, url, options: crawlOptions });

  res.json({ sessionId, domain });

  // TODO: start crawl engine (Task 5)
});

// GET /api/crawl/:sessionId/progress — SSE endpoint for crawl progress
crawlRouter.get('/:sessionId/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // TODO: wire up to crawl engine events (Task 5)
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId: req.params.sessionId })}\n\n`);
});
```

**Step 5: Verify server starts**

```bash
npm run dev:server
```

Expected: "Server running on http://localhost:3000"

**Step 6: Commit**

```bash
git add server/
git commit -m "feat: Express server with sessions, reports, and crawl API routes"
```

---

## Task 4: Crawler Utilities (robots.txt, stopwords, classifier)

**Files:**
- Create: `server/crawler/utils/robots.ts`
- Create: `server/crawler/utils/stopwords.ts`
- Create: `server/crawler/utils/classifier.ts`

**Step 1: Create `server/crawler/utils/robots.ts`**

```typescript
export interface RobotsRules {
  disallowPaths: string[];
  sitemapUrls: string[];
  rawContent: string;
}

export async function fetchRobotsTxt(domain: string): Promise<RobotsRules> {
  const url = `https://${domain}/robots.txt`;
  const result: RobotsRules = { disallowPaths: [], sitemapUrls: [], rawContent: '' };

  try {
    const response = await fetch(url);
    if (!response.ok) return result;

    const text = await response.text();
    result.rawContent = text;

    let isRelevantAgent = false;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        isRelevantAgent = agent === '*' || agent.toLowerCase().includes('googlebot');
      } else if (isRelevantAgent && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.split(':').slice(1).join(':').trim();
        if (path) result.disallowPaths.push(path);
      } else if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmed.split(':').slice(1).join(':').trim();
        if (sitemapUrl) result.sitemapUrls.push(sitemapUrl);
      }
    }
  } catch {
    // robots.txt not available — allow all
  }

  return result;
}

export function isPathAllowed(path: string, disallowPaths: string[]): boolean {
  return !disallowPaths.some((disallowed) => path.startsWith(disallowed));
}
```

**Step 2: Create `server/crawler/utils/stopwords.ts`**

고빈도 한국어 불용어 사전 (kiwi-nlp 보조용):

```typescript
export const KOREAN_STOPWORDS = new Set([
  // 일반 명사 불용어
  '것', '수', '등', '때', '중', '곳', '더', '좀', '잘', '못',
  '안', '위', '아래', '앞', '뒤', '속', '밖', '사이', '이후',
  '이전', '현재', '오늘', '내일', '어제', '여기', '거기', '저기',
  '그것', '이것', '저것', '무엇', '어디', '언제', '얼마', '누구',
  '자신', '우리', '저희', '여러분', '모두', '각각', '하나', '둘',
  // 일반적 동사/형용사 어간
  '하다', '되다', '있다', '없다', '같다', '보다', '주다', '받다',
  '가다', '오다', '알다', '모르다', '나다', '들다', '만들다',
  // 웹 공통 용어 (SEO 분석에서 노이즈)
  '클릭', '바로가기', '더보기', '닫기', '열기', '로그인', '회원가입',
  '검색', '홈', '메뉴', '목록', '이전', '다음', '페이지',
]);

export function isStopword(word: string): boolean {
  return KOREAN_STOPWORDS.has(word) || word.length < 2;
}
```

**Step 3: Create `server/crawler/utils/classifier.ts`**

```typescript
export interface ClassificationRule {
  type: 'main' | 'list' | 'detail' | 'other';
  pattern: RegExp;
}

const DEFAULT_RULES: ClassificationRule[] = [
  { type: 'main', pattern: /^\/?$/ },
  { type: 'list', pattern: /\/(list|search|category|categories|archive|tag|tags|page|board|community|blog)(?:\/|$|\?)/ },
  { type: 'detail', pattern: /\/[\w-]+\/[\w-]+-\d+|\/\d+(?:\/|$)|\/(detail|view|item|post|article)\// },
];

export function classifyPageType(
  urlPath: string,
  customRules?: ClassificationRule[],
): 'main' | 'list' | 'detail' | 'other' {
  const rules = customRules ?? DEFAULT_RULES;

  for (const rule of rules) {
    if (rule.pattern.test(urlPath)) {
      return rule.type;
    }
  }

  // Heuristic: deep paths with ID-like segments are likely detail pages
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const lastSegment = segments[segments.length - 1];
    if (/^\d+$/.test(lastSegment) || /^[a-z0-9-]+-\d+$/.test(lastSegment)) {
      return 'detail';
    }
  }

  return 'other';
}
```

**Step 4: Commit**

```bash
git add server/crawler/utils/
git commit -m "feat: crawler utilities - robots.txt parser, Korean stopwords, page classifier"
```

---

## Task 5: SEO Extractors

**Files:**
- Create: `server/crawler/extractors/metadata.ts`
- Create: `server/crawler/extractors/jsonld.ts`
- Create: `server/crawler/extractors/semantic.ts`
- Create: `server/crawler/extractors/keywords.ts`
- Create: `server/crawler/extractors/content.ts`
- Create: `server/crawler/extractors/technical.ts`

Each extractor receives a Playwright `Page` object and the page URL, and returns its portion of `SeoData`.

**Step 1: Create `server/crawler/extractors/metadata.ts`**

```typescript
import type { Page } from 'playwright';

export interface MetadataResult {
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
}

export async function extractMetadata(page: Page): Promise<MetadataResult> {
  return page.evaluate(() => {
    const getMeta = (name: string): string =>
      document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
        ?.getAttribute('content') ?? '';

    const title = document.title || '';
    const description = getMeta('description');

    // OG tags
    const ogTags: Record<string, string> = {};
    document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
      const prop = el.getAttribute('property') || '';
      ogTags[prop] = el.getAttribute('content') || '';
    });

    // Twitter tags
    const twitterTags: Record<string, string> = {};
    document.querySelectorAll('meta[name^="twitter:"], meta[property^="twitter:"]').forEach((el) => {
      const name = el.getAttribute('name') || el.getAttribute('property') || '';
      twitterTags[name] = el.getAttribute('content') || '';
    });

    // Verification tags
    const verificationTags: Record<string, string> = {};
    ['naver-site-verification', 'google-site-verification', 'msvalidate.01', 'yandex-verification'].forEach((name) => {
      const val = getMeta(name);
      if (val) verificationTags[name] = val;
    });

    // Hreflang
    const hreflang: Array<{ lang: string; href: string }> = [];
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
      hreflang.push({
        lang: el.getAttribute('hreflang') || '',
        href: el.getAttribute('href') || '',
      });
    });

    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const viewport = getMeta('viewport');

    return {
      title: { content: title, length: title.length },
      description: { content: description, length: description.length },
      keywords: getMeta('keywords'),
      canonical,
      robots: getMeta('robots'),
      googlebot: getMeta('googlebot'),
      ogTags,
      twitterTags,
      verificationTags,
      hreflang,
      viewport,
    };
  });
}
```

**Step 2: Create `server/crawler/extractors/jsonld.ts`**

```typescript
import type { Page } from 'playwright';

export interface JsonLdResult {
  jsonLd: Array<{
    type: string;
    raw: object;
  }>;
}

export async function extractJsonLd(page: Page): Promise<JsonLdResult> {
  const scripts = await page.evaluate(() => {
    const elements = document.querySelectorAll('script[type="application/ld+json"]');
    return Array.from(elements).map((el) => el.textContent || '');
  });

  const jsonLd: JsonLdResult['jsonLd'] = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        jsonLd.push({
          type: item['@type'] || 'Unknown',
          raw: item,
        });
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return { jsonLd };
}
```

**Step 3: Create `server/crawler/extractors/semantic.ts`**

```typescript
import type { Page } from 'playwright';

export interface SemanticResult {
  headings: Array<{ level: number; text: string }>;
  semanticTags: Record<string, number>;
  images: { total: number; withAlt: number; altRatio: number };
  links: {
    internal: number;
    external: number;
    nofollow: number;
  };
}

export async function extractSemantic(page: Page, pageUrl: string): Promise<SemanticResult> {
  const hostname = new URL(pageUrl).hostname;

  return page.evaluate((hostname) => {
    // Headings
    const headings: Array<{ level: number; text: string }> = [];
    for (let i = 1; i <= 6; i++) {
      document.querySelectorAll(`h${i}`).forEach((el) => {
        headings.push({ level: i, text: (el.textContent || '').trim().slice(0, 200) });
      });
    }

    // Semantic tags
    const semanticTagNames = ['nav', 'main', 'article', 'section', 'aside', 'footer', 'header'];
    const semanticTags: Record<string, number> = {};
    for (const tag of semanticTagNames) {
      const count = document.querySelectorAll(tag).length;
      if (count > 0) semanticTags[tag] = count;
    }

    // Images
    const images = document.querySelectorAll('img');
    const total = images.length;
    const withAlt = Array.from(images).filter((img) => img.alt && img.alt.trim() !== '').length;

    // Links
    let internal = 0;
    let external = 0;
    let nofollow = 0;
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const rel = a.getAttribute('rel') || '';
      if (rel.includes('nofollow')) nofollow++;
      try {
        const linkUrl = new URL(href, window.location.href);
        if (linkUrl.hostname === hostname) {
          internal++;
        } else if (linkUrl.protocol.startsWith('http')) {
          external++;
        }
      } catch {
        internal++; // relative URLs are internal
      }
    });

    return {
      headings,
      semanticTags,
      images: { total, withAlt, altRatio: total > 0 ? Math.round((withAlt / total) * 100) / 100 : 1 },
      links: { internal, external, nofollow },
    };
  }, hostname);
}
```

**Step 4: Create `server/crawler/extractors/keywords.ts`**

```typescript
import type { Page } from 'playwright';
import { isStopword } from '../utils/stopwords.js';

export interface KeywordsResult {
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
}

interface KiwiToken {
  form: string;
  tag: string;
}

let kiwiInstance: any = null;

async function getKiwi() {
  if (!kiwiInstance) {
    const { default: Kiwi } = await import('kiwi-nlp');
    kiwiInstance = await Kiwi.init();
  }
  return kiwiInstance;
}

const NOUN_TAGS = new Set(['NNG', 'NNP', 'NNB']);
const CONTENT_TAGS = new Set(['NNG', 'NNP', 'NNB', 'VV', 'VA']);

function extractTokens(kiwiResult: any): KiwiToken[] {
  const tokens: KiwiToken[] = [];
  for (const sentence of kiwiResult) {
    for (const token of sentence) {
      tokens.push({ form: token.form, tag: token.tag });
    }
  }
  return tokens;
}

export async function extractKeywords(
  page: Page,
  metadata: { title: string; description: string; h1: string; ogTitle: string },
): Promise<KeywordsResult> {
  // Extract visible text from page
  const visibleText = await page.evaluate(() => {
    const el = document.body.cloneNode(true) as HTMLElement;
    el.querySelectorAll('script, style, noscript, svg, iframe').forEach((e) => e.remove());
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  });

  const chars = visibleText.length;

  const kiwi = await getKiwi();

  // Tokenize main text
  const mainTokens = extractTokens(await kiwi.tokenize(visibleText));
  const contentTokens = mainTokens.filter(
    (t) => CONTENT_TAGS.has(t.tag) && !isStopword(t.form),
  );

  // Count word frequency
  const freqMap = new Map<string, number>();
  for (const token of contentTokens) {
    freqMap.set(token.form, (freqMap.get(token.form) || 0) + 1);
  }

  const totalWords = contentTokens.length;

  // Sort by frequency, top 20
  const sorted = [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Tokenize metadata fields for cross-reference
  const titleTokens = new Set(
    extractTokens(await kiwi.tokenize(metadata.title))
      .filter((t) => NOUN_TAGS.has(t.tag))
      .map((t) => t.form),
  );
  const descTokens = new Set(
    extractTokens(await kiwi.tokenize(metadata.description))
      .filter((t) => NOUN_TAGS.has(t.tag))
      .map((t) => t.form),
  );
  const h1Tokens = new Set(
    extractTokens(await kiwi.tokenize(metadata.h1))
      .filter((t) => NOUN_TAGS.has(t.tag))
      .map((t) => t.form),
  );
  const ogTokens = new Set(
    extractTokens(await kiwi.tokenize(metadata.ogTitle))
      .filter((t) => NOUN_TAGS.has(t.tag))
      .map((t) => t.form),
  );

  const density = sorted.map(([keyword, count]) => ({
    keyword,
    count,
    ratio: totalWords > 0 ? Math.round((count / totalWords) * 10000) / 100 : 0,
    inTitle: titleTokens.has(keyword),
    inDescription: descTokens.has(keyword),
    inH1: h1Tokens.has(keyword),
  }));

  // Target keyword inference: appears in 2+ of title/desc/h1/og:title
  const targetKeywords = sorted
    .map(([keyword]) => keyword)
    .filter((keyword) => {
      let score = 0;
      if (titleTokens.has(keyword)) score++;
      if (descTokens.has(keyword)) score++;
      if (h1Tokens.has(keyword)) score++;
      if (ogTokens.has(keyword)) score++;
      return score >= 2;
    });

  return {
    targetKeywords,
    density,
    totalText: { chars, words: totalWords },
  };
}
```

**Step 5: Create `server/crawler/extractors/content.ts`**

```typescript
import type { Page } from 'playwright';

export interface ContentResult {
  imageCount: number;
  videoCount: number;
  ctaButtons: string[];
  internalLinkTargets: Array<{ url: string; text: string }>;
}

export async function extractContent(page: Page, pageUrl: string): Promise<ContentResult> {
  const hostname = new URL(pageUrl).hostname;

  return page.evaluate((hostname) => {
    const imageCount = document.querySelectorAll('img').length;
    const videoCount = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

    // CTA buttons
    const ctaPatterns = /문의|상담|신청|견적|예약|시작|가입|구매|주문|다운로드|체험|무료|지금|바로/;
    const ctaButtons: string[] = [];

    document.querySelectorAll('button, a[role="button"], [class*="btn"], [class*="cta"]').forEach((el) => {
      const text = (el.textContent || '').trim().slice(0, 100);
      if (text && ctaPatterns.test(text)) {
        ctaButtons.push(text);
      }
    });

    // Internal link targets
    const internalLinkTargets: Array<{ url: string; text: string }> = [];
    const seenUrls = new Set<string>();
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().slice(0, 100);
      try {
        const linkUrl = new URL(href, window.location.href);
        if (linkUrl.hostname === hostname && !seenUrls.has(linkUrl.pathname)) {
          seenUrls.add(linkUrl.pathname);
          internalLinkTargets.push({ url: linkUrl.pathname, text });
        }
      } catch {
        // skip invalid
      }
    });

    return { imageCount, videoCount, ctaButtons, internalLinkTargets: internalLinkTargets.slice(0, 50) };
  }, hostname);
}
```

**Step 6: Create `server/crawler/extractors/technical.ts`**

```typescript
import type { Response as PlaywrightResponse } from 'playwright';
import { fetchRobotsTxt, type RobotsRules } from '../utils/robots.js';

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
  // Compare initial HTML (before JS) with rendered HTML (after JS)
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
```

**Step 7: Commit**

```bash
git add server/crawler/extractors/
git commit -m "feat: SEO extractors - metadata, JSON-LD, semantic, keywords, content, technical"
```

---

## Task 6: SEO Score Calculator

**Files:**
- Create: `server/crawler/extractors/score.ts`

**Step 1: Create `server/crawler/extractors/score.ts`**

```typescript
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
```

**Step 2: Commit**

```bash
git add server/crawler/extractors/score.ts
git commit -m "feat: SEO score calculator (SEO 설정 완성도)"
```

---

## Task 7: Link Discoverer

**Files:**
- Create: `server/crawler/discoverer.ts`

**Step 1: Create `server/crawler/discoverer.ts`**

```typescript
import type { Page } from 'playwright';

export interface DiscoveredLink {
  url: string;
  text: string;
}

export async function discoverLinks(page: Page, currentUrl: string, domain: string): Promise<DiscoveredLink[]> {
  const links = await page.evaluate((domain: string) => {
    const results: Array<{ href: string; text: string }> = [];
    const seen = new Set<string>();

    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().slice(0, 100);

      try {
        const url = new URL(href, window.location.href);

        // Only same domain, http(s), no hash-only links
        if (url.hostname !== domain) return;
        if (!url.protocol.startsWith('http')) return;

        // Normalize: remove hash, trailing slash
        url.hash = '';
        const normalized = url.href.replace(/\/$/, '');

        if (!seen.has(normalized)) {
          seen.add(normalized);
          results.push({ href: normalized, text });
        }
      } catch {
        // skip invalid
      }
    });

    return results;
  }, domain);

  // Filter out non-page resources
  const skipExtensions = /\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|mp3|zip|css|js|xml|json)$/i;

  return links
    .filter((link) => !skipExtensions.test(new URL(link.href).pathname))
    .map((link) => ({ url: link.href, text: link.text }));
}
```

**Step 2: Commit**

```bash
git add server/crawler/discoverer.ts
git commit -m "feat: internal link discoverer for crawl queue"
```

---

## Task 8: Crawl Engine (Core)

**Files:**
- Create: `server/crawler/engine.ts`

This is the core crawling engine that orchestrates everything: Playwright stealth browser, link queue, extractors, SSE events, DB persistence.

**Step 1: Create `server/crawler/engine.ts`**

```typescript
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  updateSessionStatus,
  updateSessionProgress,
  updateSessionSummary,
  insertPage,
  getSessionPages,
} from '../db/index.js';
import { fetchRobotsTxt, isPathAllowed, type RobotsRules } from './utils/robots.js';
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

  // Stealth scripts to avoid bot detection
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    });

    // Chrome runtime
    (window as any).chrome = { runtime: {} };

    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);
  });

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
      if (!isPathAllowed(urlPath, robotsRules.disallowPaths)) {
        console.log(`[Crawl] Skipped (robots.txt): ${normalizedUrl}`);
        continue;
      }

      const pageId = uuidv4();

      try {
        const page = await context.newPage();

        // Capture initial HTML (before JS rendering) for SSR/CSR detection
        let initialHtml = '';
        page.on('response', async (response) => {
          if (response.url() === normalizedUrl && response.headers()['content-type']?.includes('text/html')) {
            try {
              initialHtml = await response.text();
            } catch { /* ignore */ }
          }
        });

        const response = await page.goto(normalizedUrl, {
          waitUntil: 'networkidle',
          timeout: 30000,
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
        });

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

        await page.close();
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
      }

      // Rate limiting delay
      await delay(1000 + Math.random() * 1000);
    }

    // Generate summary
    const summary = await generateSessionSummary(sessionId);
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

async function generateSessionSummary(sessionId: string): Promise<object> {
  const pages = getSessionPages(sessionId) as any[];
  const successPages = pages.filter((p) => p.status === 'success');

  if (successPages.length === 0) {
    return { avgScore: 0, topKeywords: [], jsonLdTypes: {}, pageTypeDistribution: {}, metaCompleteness: {} };
  }

  // Average score
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
```

**Step 2: Commit**

```bash
git add server/crawler/engine.ts
git commit -m "feat: crawl engine with Playwright stealth, BFS queue, parallel extractors, SSE events"
```

---

## Task 9: Wire Crawl Engine to API Routes

**Files:**
- Modify: `server/routes/crawl.ts`

**Step 1: Update `server/routes/crawl.ts` to start engine and wire SSE**

Replace the entire file:

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession } from '../db/index.js';
import { startCrawl, crawlEvents, type CrawlEvent } from '../crawler/engine.js';

export const crawlRouter = Router();

// POST /api/crawl — start a new crawl
crawlRouter.post('/', (req, res) => {
  const { url, options } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const sessionId = uuidv4();
  const domain = parsedUrl.hostname;
  const crawlOptions = {
    depth: options?.depth ?? 2,
    maxPages: options?.maxPages ?? 50,
  };

  createSession({ id: sessionId, domain, url, options: crawlOptions });

  // Start crawl in background (non-blocking)
  startCrawl(sessionId, url, crawlOptions).catch((err) => {
    console.error(`Crawl ${sessionId} fatal error:`, err);
  });

  res.json({ sessionId, domain });
});

// GET /api/crawl/:sessionId/progress — SSE endpoint
crawlRouter.get('/:sessionId/progress', (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  const listener = (event: CrawlEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (event.type === 'completed' || event.type === 'failed') {
      res.end();
    }
  };

  crawlEvents.on(`crawl:${sessionId}`, listener);

  req.on('close', () => {
    crawlEvents.off(`crawl:${sessionId}`, listener);
  });
});
```

**Step 2: Verify server starts with engine wired**

```bash
npm run dev:server
```

Expected: Server starts without errors.

**Step 3: Commit**

```bash
git add server/routes/crawl.ts
git commit -m "feat: wire crawl engine to API routes with SSE progress streaming"
```

---

## Task 10: Frontend — Dashboard Page

**Files:**
- Create: `src/pages/Dashboard.tsx`
- Create: `src/components/CrawlForm.tsx`
- Create: `src/components/CrawlProgress.tsx`
- Create: `src/components/HistoryList.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/components/CrawlForm.tsx`**

URL input + options form + "크롤링 시작" button:

```tsx
import { useState } from 'react';

interface CrawlFormProps {
  onStart: (url: string, options: { depth: number; maxPages: number }) => void;
  isLoading: boolean;
}

export default function CrawlForm({ onStart, isLoading }: CrawlFormProps) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(50);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http')) fullUrl = `https://${fullUrl}`;
    onStart(fullUrl, { depth, maxPages });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">새 크롤링 시작</h2>

      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '크롤링 중...' : '크롤링 시작'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="mt-3 text-sm text-gray-500 hover:text-gray-700"
      >
        {showOptions ? '옵션 숨기기' : '크롤링 옵션 설정'}
      </button>

      {showOptions && (
        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>탐색 깊이</span>
            <Tooltip text="시작 URL로부터 몇 단계까지 링크를 따라갈지 설정합니다" />
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>최대 페이지 수</span>
            <Tooltip text="한 번의 크롤링에서 수집할 최대 페이지 수입니다" />
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {[10, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </form>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group">
      <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-gray-200 text-gray-600 rounded-full cursor-help">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {text}
      </span>
    </span>
  );
}
```

**Step 2: Create `src/components/CrawlProgress.tsx`**

```tsx
import { useEffect, useState } from 'react';

interface ProgressEvent {
  type: string;
  sessionId: string;
  data?: any;
}

interface CrawlProgressProps {
  sessionId: string;
  onComplete: (sessionId: string) => void;
}

export default function CrawlProgress({ sessionId, onComplete }: CrawlProgressProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [crawledPages, setCrawledPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'running' | 'completed' | 'failed'>('connecting');

  useEffect(() => {
    const eventSource = new EventSource(`/api/crawl/${sessionId}/progress`);

    eventSource.onmessage = (e) => {
      const event: ProgressEvent = JSON.parse(e.data);

      setEvents((prev) => [...prev.slice(-50), event]); // keep last 50

      switch (event.type) {
        case 'connected':
          setStatus('running');
          break;
        case 'progress':
          setCrawledPages(event.data.crawledPages);
          setTotalPages(event.data.totalPages);
          setCurrentUrl(event.data.currentUrl);
          break;
        case 'page_crawled':
          break;
        case 'completed':
          setStatus('completed');
          eventSource.close();
          setTimeout(() => onComplete(sessionId), 1000);
          break;
        case 'failed':
          setStatus('failed');
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setStatus('failed');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [sessionId, onComplete]);

  const progress = totalPages > 0 ? Math.round((crawledPages / totalPages) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">크롤링 진행 상황</h3>
        <StatusBadge status={status} />
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-600 mb-4">
        <span>{crawledPages} / {totalPages} 페이지</span>
        <span>{progress}%</span>
      </div>

      {currentUrl && (
        <p className="text-sm text-gray-500 truncate mb-3">
          현재: {currentUrl}
        </p>
      )}

      {/* Event log */}
      <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 space-y-1">
        {events.map((event, i) => (
          <div key={i}>
            {event.type === 'page_crawled' && (
              <span className="text-green-600">OK {event.data?.url} (점수: {event.data?.score})</span>
            )}
            {event.type === 'page_failed' && (
              <span className="text-red-500">FAIL {event.data?.url}: {event.data?.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connecting: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    connecting: '연결 중',
    running: '크롤링 중',
    completed: '완료',
    failed: '실패',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
```

**Step 3: Create `src/components/HistoryList.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  domain: string;
  url: string;
  status: string;
  crawled_pages: number;
  total_pages: number;
  summary: any;
  created_at: string;
}

interface HistoryListProps {
  sessions: Session[];
  onDelete: (id: string) => void;
}

export default function HistoryList({ sessions, onDelete }: HistoryListProps) {
  const navigate = useNavigate();

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        크롤링 히스토리가 없습니다. 위에서 URL을 입력하여 시작하세요.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">크롤링 히스토리</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            onClick={() => navigate(`/report/${session.id}`)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900 truncate">{session.domain}</span>
                <StatusBadge status={session.status} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span>{new Date(session.created_at).toLocaleString('ko-KR')}</span>
                <span>{session.crawled_pages}페이지</span>
                {session.summary?.avgScore != null && (
                  <span>평균 완성도: {session.summary.avgScore}점</span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('이 크롤링 기록을 삭제하시겠습니까?')) onDelete(session.id);
              }}
              className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
```

**Step 4: Create `src/pages/Dashboard.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CrawlForm from '../components/CrawlForm';
import CrawlProgress from '../components/CrawlProgress';
import HistoryList from '../components/HistoryList';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStart = async (url: string, options: { depth: number; maxPages: number }) => {
    const res = await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options }),
    });
    const { sessionId } = await res.json();
    setActiveCrawl(sessionId);
  };

  const handleComplete = useCallback((sessionId: string) => {
    setActiveCrawl(null);
    navigate(`/report/${sessionId}`);
  }, [navigate]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    fetchSessions();
  };

  return (
    <div className="space-y-6">
      <CrawlForm onStart={handleStart} isLoading={!!activeCrawl} />

      {activeCrawl && (
        <CrawlProgress sessionId={activeCrawl} onComplete={handleComplete} />
      )}

      <HistoryList sessions={sessions} onDelete={handleDelete} />
    </div>
  );
}
```

**Step 5: Update `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
          SEO Benchmarker
        </Link>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

**Step 6: Verify frontend renders**

```bash
npm run dev
```

Visit http://localhost:5173, verify Dashboard page with form and history list.

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: Dashboard page with CrawlForm, CrawlProgress (SSE), and HistoryList"
```

---

## Task 11: Frontend — Report Page

**Files:**
- Create: `src/pages/Report.tsx`
- Create: `src/components/ScoreCard.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/components/ScoreCard.tsx`**

```tsx
interface ScoreCardProps {
  score: number;
  breakdown?: Array<{
    name: string;
    score: number;
    maxScore: number;
    details: string;
  }>;
}

const ITEM_LABELS: Record<string, { label: string; tooltip: string }> = {
  title: { label: 'Title 태그', tooltip: '페이지 제목 태그의 존재 여부와 적절한 길이(10-60자)' },
  description: { label: 'Meta Description', tooltip: '메타 설명의 존재 여부와 적절한 길이(50-160자)' },
  canonical: { label: 'Canonical URL', tooltip: '정규 URL 설정으로 중복 콘텐츠 방지' },
  ogTags: { label: 'OG 태그', tooltip: 'SNS 공유 시 표시되는 Open Graph 메타데이터' },
  jsonLd: { label: 'JSON-LD', tooltip: '검색엔진이 이해하는 구조화된 데이터' },
  h1: { label: 'H1 태그', tooltip: '페이지당 하나의 H1 태그 사용 권장' },
  imageAlt: { label: '이미지 Alt', tooltip: '이미지에 대체 텍스트(alt) 속성 제공 비율' },
  semanticTags: { label: '시맨틱 태그', tooltip: 'nav, main, article 등 의미론적 HTML 태그 사용' },
  robotsTxt: { label: 'robots.txt', tooltip: '검색엔진 크롤러에게 규칙을 알려주는 파일' },
  sitemap: { label: 'sitemap.xml', tooltip: '사이트 페이지 구조를 검색엔진에 알려주는 파일' },
};

export default function ScoreCard({ score, breakdown }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = (s: number, max: number) => {
    const ratio = s / max;
    if (ratio >= 0.8) return 'bg-green-500';
    if (ratio >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SEO 설정 완성도</h3>
          <p className="text-xs text-gray-500 mt-1">이 지표는 SEO 설정 항목의 구현 현황을 수치화한 것입니다</p>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}<span className="text-lg text-gray-400">/100</span>
        </div>
      </div>

      {breakdown && (
        <div className="mt-6 space-y-3">
          {breakdown.map((item) => {
            const meta = ITEM_LABELS[item.name] || { label: item.name, tooltip: '' };
            return (
              <div key={item.name} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 flex items-center gap-1">
                    {meta.label}
                    {meta.tooltip && (
                      <span className="relative">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-200 text-gray-500 rounded-full cursor-help">?</span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {meta.tooltip}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">{item.score}/{item.maxScore} — {item.details}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getBarColor(item.score, item.maxScore)}`}
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create `src/pages/Report.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ScoreCard from '../components/ScoreCard';

type TabId = 'summary' | 'pages' | 'keywords' | 'technical' | 'compare';

export default function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  useEffect(() => {
    fetch(`/api/reports/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return <div className="text-center py-12 text-gray-500">보고서 로딩 중...</div>;
  if (!report) return <div className="text-center py-12 text-gray-500">보고서를 찾을 수 없습니다.</div>;

  const { session, pages } = report;
  const summary = session.summary || {};
  const successPages = pages.filter((p: any) => p.status === 'success');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'summary', label: '요약' },
    { id: 'pages', label: `페이지 목록 (${pages.length})` },
    { id: 'keywords', label: '키워드 분석' },
    { id: 'technical', label: '기술 분석' },
    { id: 'compare', label: '비교' },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; 대시보드로 돌아가기</Link>
        <h2 className="text-2xl font-bold text-gray-900 mt-2">{session.domain}</h2>
        <p className="text-sm text-gray-500">{session.url} — {new Date(session.created_at).toLocaleString('ko-KR')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && (
        <SummaryTab summary={summary} pages={successPages} />
      )}
      {activeTab === 'pages' && (
        <PagesTab pages={pages} sessionId={sessionId!} />
      )}
      {activeTab === 'keywords' && (
        <KeywordsTab summary={summary} pages={successPages} />
      )}
      {activeTab === 'technical' && (
        <TechnicalTab pages={successPages} />
      )}
      {activeTab === 'compare' && (
        <CompareTab sessionId={sessionId!} />
      )}
    </div>
  );
}

function SummaryTab({ summary, pages }: { summary: any; pages: any[] }) {
  // Calculate aggregate score breakdown
  const avgBreakdown = pages.length > 0 && pages[0].seo_data?.scoreBreakdown
    ? pages[0].seo_data.scoreBreakdown
    : undefined;

  return (
    <div className="space-y-6">
      <ScoreCard score={summary.avgScore || 0} breakdown={avgBreakdown} />

      {/* Target keywords */}
      {summary.topKeywords?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">주요 키워드 TOP 10</h3>
          <div className="flex flex-wrap gap-2">
            {summary.topKeywords.map((kw: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {kw.keyword} ({kw.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* JSON-LD types */}
      {summary.jsonLdTypes && Object.keys(summary.jsonLdTypes).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON-LD 사용 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.jsonLdTypes).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                <div className="text-sm text-gray-600">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page type distribution */}
      {summary.pageTypeDistribution && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">페이지 유형 분포</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.pageTypeDistribution).map(([type, count]) => {
              const labels: Record<string, string> = { main: '메인', list: '목록', detail: '상세', other: '기타' };
              return (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                  <div className="text-sm text-gray-600">{labels[type] || type}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PagesTab({ pages, sessionId }: { pages: any[]; sessionId: string }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? pages : pages.filter((p) => p.page_type === filter);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <span className="text-sm text-gray-600">필터:</span>
        {['all', 'main', 'list', 'detail', 'other'].map((f) => {
          const labels: Record<string, string> = { all: '전체', main: '메인', list: '목록', detail: '상세', other: '기타' };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 text-left text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3">URL</th>
            <th className="px-6 py-3 w-24">유형</th>
            <th className="px-6 py-3 w-24">상태</th>
            <th className="px-6 py-3 w-32">SEO 설정 완성도</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map((page: any) => (
            <tr key={page.id} className="hover:bg-gray-50">
              <td className="px-6 py-3">
                <Link
                  to={`/report/${sessionId}/page/${page.id}`}
                  className="text-blue-600 hover:underline text-sm truncate block max-w-lg"
                >
                  {page.url}
                </Link>
              </td>
              <td className="px-6 py-3 text-sm text-gray-600">{page.page_type || '-'}</td>
              <td className="px-6 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  page.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {page.status}
                </span>
              </td>
              <td className="px-6 py-3 text-sm font-medium">
                {page.seo_data?.score != null ? `${page.seo_data.score}/100` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordsTab({ summary, pages }: { summary: any; pages: any[] }) {
  // Aggregate all keyword data from pages
  const allKeywords = new Map<string, { count: number; inTitle: number; inDesc: number; inH1: number }>();

  for (const page of pages) {
    const density = page.seo_data?.keywords?.density || [];
    for (const kw of density) {
      const existing = allKeywords.get(kw.keyword) || { count: 0, inTitle: 0, inDesc: 0, inH1: 0 };
      existing.count += kw.count;
      if (kw.inTitle) existing.inTitle++;
      if (kw.inDescription) existing.inDesc++;
      if (kw.inH1) existing.inH1++;
      allKeywords.set(kw.keyword, existing);
    }
  }

  const sorted = [...allKeywords.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
  const maxCount = sorted[0]?.[1].count || 1;

  return (
    <div className="space-y-6">
      {/* Target keywords */}
      {summary.topKeywords?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">추정 타겟 키워드</h3>
          <p className="text-sm text-gray-500 mb-4">title, description, h1, og:title에서 공통으로 등장하는 핵심 키워드</p>
          <div className="flex flex-wrap gap-2">
            {summary.topKeywords.map((kw: any, i: number) => (
              <span key={i} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Keyword density bar chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">키워드 밀도 (상위 20개)</h3>
        <div className="space-y-3">
          {sorted.map(([keyword, data]) => (
            <div key={keyword} className="flex items-center gap-4">
              <span className="w-24 text-sm text-gray-700 text-right truncate">{keyword}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(data.count / maxCount) * 100}%`, minWidth: '2rem' }}
                  >
                    <span className="text-xs text-white font-medium">{data.count}</span>
                  </div>
                </div>
                {data.inTitle > 0 && <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">T</span>}
                {data.inDesc > 0 && <span className="text-xs px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">D</span>}
                {data.inH1 > 0 && <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded">H1</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <span><span className="px-1 py-0.5 bg-green-100 text-green-700 rounded">T</span> = Title에 포함</span>
          <span><span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">D</span> = Description에 포함</span>
          <span><span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded">H1</span> = H1에 포함</span>
        </div>
      </div>
    </div>
  );
}

function TechnicalTab({ pages }: { pages: any[] }) {
  if (pages.length === 0) return <p className="text-gray-500">데이터가 없습니다.</p>;

  const firstPage = pages[0].seo_data;
  const technical = firstPage?.technical;

  return (
    <div className="space-y-6">
      {/* Rendering type */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">렌더링 방식</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          technical?.renderingType === 'SSR' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {technical?.renderingType || 'unknown'}
        </span>
        <p className="text-sm text-gray-500 mt-2">
          {technical?.renderingType === 'SSR' && 'Server-Side Rendering — 초기 HTML에 콘텐츠가 포함되어 검색엔진 크롤링에 유리합니다.'}
          {technical?.renderingType === 'CSR' && 'Client-Side Rendering — JavaScript 실행 후 콘텐츠가 로드됩니다. 검색엔진이 콘텐츠를 인식하지 못할 수 있습니다.'}
          {technical?.renderingType === 'unknown' && '렌더링 방식을 판별할 수 없습니다.'}
        </p>
      </div>

      {/* robots.txt */}
      {technical?.robotsTxt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">robots.txt</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {technical.robotsTxt}
          </pre>
        </div>
      )}

      {/* Sitemap */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sitemap</h3>
        <p className="text-sm text-gray-700">
          {technical?.sitemapExists
            ? `sitemap.xml 존재 — ${technical.sitemapUrlCount}개 URL 포함`
            : 'sitemap.xml을 찾을 수 없습니다.'}
        </p>
      </div>

      {/* HTTP Headers */}
      {technical?.httpHeaders && Object.keys(technical.httpHeaders).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO 관련 HTTP 헤더</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(technical.httpHeaders).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-600">{key}</td>
                  <td className="py-2 text-gray-900">{value as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Meta completeness across all pages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">페이지별 JSON-LD 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">URL</th>
                <th className="px-4 py-2">JSON-LD 타입</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.slice(0, 30).map((page: any) => (
                <tr key={page.id}>
                  <td className="px-4 py-2 truncate max-w-xs text-gray-700">{page.url}</td>
                  <td className="px-4 py-2">
                    {page.seo_data?.structuredData?.jsonLd?.length > 0
                      ? page.seo_data.structuredData.jsonLd.map((ld: any) => ld.type).join(', ')
                      : <span className="text-gray-400">없음</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareTab({ sessionId }: { sessionId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [compareId, setCompareId] = useState<string>('');
  const [compareReport, setCompareReport] = useState<any>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);

  useEffect(() => {
    fetch('/api/sessions').then((r) => r.json()).then((data) => {
      setSessions(data.filter((s: any) => s.id !== sessionId && s.status === 'completed'));
    });
    fetch(`/api/reports/${sessionId}`).then((r) => r.json()).then(setCurrentReport);
  }, [sessionId]);

  const handleCompare = async () => {
    if (!compareId) return;
    const res = await fetch(`/api/reports/${compareId}`);
    setCompareReport(await res.json());
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        비교할 다른 도메인의 크롤링 데이터가 없습니다. 다른 도메인을 먼저 크롤링하세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">도메인 비교</h3>
        <div className="flex gap-3">
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">비교할 도메인 선택</option>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>{s.domain} ({new Date(s.created_at).toLocaleDateString('ko-KR')})</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!compareId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            비교하기
          </button>
        </div>
      </div>

      {currentReport && compareReport && (
        <CompareResults current={currentReport} compare={compareReport} />
      )}
    </div>
  );
}

function CompareResults({ current, compare }: { current: any; compare: any }) {
  const cs = current.session.summary || {};
  const cps = compare.session.summary || {};

  return (
    <div className="space-y-6">
      {/* Score comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO 설정 완성도 비교</h3>
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <div className="text-sm text-gray-500 mb-1">{current.session.domain}</div>
            <div className="text-4xl font-bold text-blue-600">{cs.avgScore || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{compare.session.domain}</div>
            <div className="text-4xl font-bold text-purple-600">{cps.avgScore || 0}</div>
          </div>
        </div>
      </div>

      {/* Meta completeness comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">메타데이터 완성도 비교 (%)</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">항목</th>
              <th className="px-4 py-2 text-center">{current.session.domain}</th>
              <th className="px-4 py-2 text-center">{compare.session.domain}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {['title', 'description', 'canonical', 'ogTags'].map((key) => (
              <tr key={key}>
                <td className="px-4 py-2 text-gray-700">{key}</td>
                <td className="px-4 py-2 text-center font-medium">{cs.metaCompleteness?.[key] ?? '-'}%</td>
                <td className="px-4 py-2 text-center font-medium">{cps.metaCompleteness?.[key] ?? '-'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON-LD comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON-LD 타입 비교</h3>
        {(() => {
          const allTypes = new Set([
            ...Object.keys(cs.jsonLdTypes || {}),
            ...Object.keys(cps.jsonLdTypes || {}),
          ]);
          return (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">@type</th>
                  <th className="px-4 py-2 text-center">{current.session.domain}</th>
                  <th className="px-4 py-2 text-center">{compare.session.domain}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...allTypes].map((type) => (
                  <tr key={type}>
                    <td className="px-4 py-2 font-mono text-gray-700">{type}</td>
                    <td className="px-4 py-2 text-center">{cs.jsonLdTypes?.[type] || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-2 text-center">{cps.jsonLdTypes?.[type] || <span className="text-gray-300">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
```

**Step 3: Update `src/App.tsx` to add Report route**

```tsx
import { Routes, Route } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
          SEO Benchmarker
        </Link>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report/:sessionId" element={<Report />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: Report page with summary, pages list, keywords, technical, and comparison tabs"
```

---

## Task 12: Frontend — Page Detail

**Files:**
- Create: `src/pages/PageDetail.tsx`
- Create: `src/components/JsonLdViewer.tsx`
- Create: `src/components/HeadingTree.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/components/JsonLdViewer.tsx`**

Collapsible JSON tree viewer:

```tsx
import { useState } from 'react';

interface JsonLdViewerProps {
  data: Array<{ type: string; raw: object }>;
}

export default function JsonLdViewer({ data }: JsonLdViewerProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">JSON-LD 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <CollapsibleJson key={i} title={`@type: ${item.type}`} data={item.raw} />
      ))}
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: object }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100"
      >
        <span className="font-mono text-sm font-medium text-gray-800">{title}</span>
        <span className="text-gray-400">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <pre className="px-4 py-3 text-xs font-mono text-gray-700 bg-white overflow-x-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

**Step 2: Create `src/components/HeadingTree.tsx`**

```tsx
interface HeadingTreeProps {
  headings: Array<{ level: number; text: string }>;
}

export default function HeadingTree({ headings }: HeadingTreeProps) {
  if (headings.length === 0) {
    return <p className="text-sm text-gray-500">Heading 태그가 없습니다.</p>;
  }

  return (
    <div className="space-y-1">
      {headings.map((h, i) => (
        <div
          key={i}
          className="flex items-center gap-2"
          style={{ paddingLeft: `${(h.level - 1) * 20}px` }}
        >
          <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
            h.level === 1 ? 'bg-red-100 text-red-700' :
            h.level === 2 ? 'bg-orange-100 text-orange-700' :
            h.level === 3 ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            H{h.level}
          </span>
          <span className="text-sm text-gray-800 truncate">{h.text}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create `src/pages/PageDetail.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ScoreCard from '../components/ScoreCard';
import JsonLdViewer from '../components/JsonLdViewer';
import HeadingTree from '../components/HeadingTree';

export default function PageDetail() {
  const { sessionId, pageId } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${sessionId}/pages/${pageId}`)
      .then((r) => r.json())
      .then((data) => {
        setPage(data);
        setLoading(false);
      });
  }, [sessionId, pageId]);

  if (loading) return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  if (!page?.seo_data) return <div className="text-center py-12 text-gray-500">데이터가 없습니다.</div>;

  const { seo_data: data } = page;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/report/${sessionId}`} className="text-sm text-blue-600 hover:underline">&larr; 보고서로 돌아가기</Link>
        <h2 className="text-lg font-bold text-gray-900 mt-2 break-all">{page.url}</h2>
        <div className="flex gap-3 mt-1 text-sm text-gray-500">
          <span>유형: {page.page_type || '기타'}</span>
          <span>깊이: {page.depth}</span>
        </div>
      </div>

      {/* Score */}
      <ScoreCard score={data.score || 0} breakdown={data.scoreBreakdown} />

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">메타데이터</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <MetaRow label="Title" value={data.metadata?.title?.content} sub={`${data.metadata?.title?.length}자`} />
            <MetaRow label="Description" value={data.metadata?.description?.content} sub={`${data.metadata?.description?.length}자`} />
            <MetaRow label="Keywords" value={data.metadata?.keywords} />
            <MetaRow label="Canonical" value={data.metadata?.canonical} />
            <MetaRow label="Robots" value={data.metadata?.robots} />
            <MetaRow label="Viewport" value={data.metadata?.viewport} />
          </tbody>
        </table>

        {/* OG Tags */}
        {data.metadata?.ogTags && Object.keys(data.metadata.ogTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">Open Graph</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.ogTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Twitter Tags */}
        {data.metadata?.twitterTags && Object.keys(data.metadata.twitterTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">Twitter Card</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.twitterTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Verification Tags */}
        {data.metadata?.verificationTags && Object.keys(data.metadata.verificationTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">검색엔진 인증</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.verificationTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* JSON-LD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">구조화 데이터 (JSON-LD)</h3>
        <JsonLdViewer data={data.structuredData?.jsonLd || []} />
      </div>

      {/* Heading structure */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Heading 구조</h3>
        <HeadingTree headings={data.semantic?.headings || []} />
      </div>

      {/* Semantic tags */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">시맨틱 태그 사용</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {['nav', 'main', 'article', 'section', 'aside', 'footer', 'header'].map((tag) => (
            <div key={tag} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{data.semantic?.semanticTags?.[tag] || 0}</div>
              <div className="text-xs text-gray-600 font-mono">&lt;{tag}&gt;</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links & Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">링크 분석</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">내부 링크</span><span className="font-medium">{data.semantic?.links?.internal || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">외부 링크</span><span className="font-medium">{data.semantic?.links?.external || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">nofollow</span><span className="font-medium">{data.semantic?.links?.nofollow || 0}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 분석</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">전체 이미지</span><span className="font-medium">{data.semantic?.images?.total || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Alt 있음</span><span className="font-medium">{data.semantic?.images?.withAlt || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Alt 비율</span><span className="font-medium">{Math.round((data.semantic?.images?.altRatio || 0) * 100)}%</span></div>
          </div>
        </div>
      </div>

      {/* Keywords */}
      {data.keywords?.density?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">키워드 밀도</h3>
          <p className="text-sm text-gray-500 mb-4">총 {data.keywords.totalText?.chars}자, {data.keywords.totalText?.words}단어</p>
          <div className="space-y-2">
            {data.keywords.density.slice(0, 20).map((kw: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-right text-gray-700 truncate">{kw.keyword}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5">
                  <div
                    className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(kw.ratio * 10, 100)}%`, minWidth: '2rem' }}
                  >
                    <span className="text-[10px] text-white">{kw.ratio}%</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-12">{kw.count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content analysis */}
      {data.content && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">콘텐츠 분석</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat label="이미지" value={data.content.imageCount} />
            <Stat label="비디오" value={data.content.videoCount} />
            <Stat label="CTA 버튼" value={data.content.ctaButtons?.length || 0} />
            <Stat label="내부 링크 대상" value={data.content.internalLinkTargets?.length || 0} />
          </div>
          {data.content.ctaButtons?.length > 0 && (
            <>
              <h4 className="font-medium text-gray-900 mb-2">CTA 텍스트</h4>
              <div className="flex flex-wrap gap-2">
                {data.content.ctaButtons.map((cta: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">{cta}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  return (
    <tr>
      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap w-40">{label}</td>
      <td className="py-2 text-gray-900 break-all">
        {value || <span className="text-gray-400">-</span>}
        {sub && <span className="ml-2 text-xs text-gray-400">({sub})</span>}
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
```

**Step 4: Update `src/App.tsx` to add PageDetail route**

Add to imports: `import PageDetail from './pages/PageDetail';`

Add route: `<Route path="/report/:sessionId/page/:pageId" element={<PageDetail />} />`

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: PageDetail page with JSON-LD viewer, heading tree, keyword density, meta tags"
```

---

## Task 13: End-to-End Integration Test

**Step 1: Verify full stack runs**

```bash
npm run dev
```

**Step 2: Manual smoke test**

1. Open http://localhost:5173
2. Enter a URL (e.g. "https://example.com") and click "크롤링 시작"
3. Verify SSE progress shows in real-time
4. After completion, verify auto-redirect to report page
5. Check all report tabs render data
6. Click a page row to see PageDetail
7. Go back to dashboard, verify history list shows the session
8. Delete a session and verify it's removed

**Step 3: Fix any issues found during smoke test**

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from end-to-end smoke test"
```

---

## Execution Summary

| Task | Description | Key Files |
|---|---|---|
| 1 | Project scaffolding | package.json, vite.config.ts, tsconfig.json |
| 2 | SQLite DB layer | server/db/ |
| 3 | Express API routes | server/routes/, server/index.ts |
| 4 | Crawler utilities | server/crawler/utils/ |
| 5 | SEO extractors (6 files) | server/crawler/extractors/ |
| 6 | SEO score calculator | server/crawler/extractors/score.ts |
| 7 | Link discoverer | server/crawler/discoverer.ts |
| 8 | Crawl engine | server/crawler/engine.ts |
| 9 | Wire engine to API | server/routes/crawl.ts |
| 10 | Dashboard + components | src/pages/Dashboard.tsx, src/components/ |
| 11 | Report page (5 tabs) | src/pages/Report.tsx, src/components/ScoreCard.tsx |
| 12 | Page detail | src/pages/PageDetail.tsx, JsonLdViewer, HeadingTree |
| 13 | E2E integration test | Manual smoke test |
