import 'dotenv/config';
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
