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
