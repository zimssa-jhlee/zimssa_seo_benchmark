import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession } from '../db/index.js';
import { startCrawl, crawlEvents, type CrawlEvent } from '../crawler/engine.js';

export const crawlRouter = Router();

// POST /api/crawl — start a new crawl
crawlRouter.post('/', (req, res) => {
  const { url, options } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  const sessionId = uuidv4();
  const domain = parsedUrl.hostname;
  const crawlOptions = {
    depth: options?.depth ?? 0,
    maxPages: options?.maxPages ?? 1,
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
