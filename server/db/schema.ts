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
