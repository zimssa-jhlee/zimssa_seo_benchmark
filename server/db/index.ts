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
