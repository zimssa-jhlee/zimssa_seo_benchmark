import { Router } from 'express';
import { getSession, getSessionPages, getPage } from '../db/index.js';

export const reportsRouter = Router();

// GET /api/reports/:sessionId — full report for a session
reportsRouter.get('/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId) as any;
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
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
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  res.json({
    ...page,
    seo_data: page.seo_data ? JSON.parse(page.seo_data) : null,
  });
});
