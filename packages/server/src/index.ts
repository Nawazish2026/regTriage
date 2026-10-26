import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { directivesRouter } from './routes/directives';
import { actionItemsRouter } from './routes/action-items';
import { authoritiesRouter } from './routes/authorities';
import { assigneesRouter } from './routes/assignees';
import { statsRouter } from './routes/stats';
import { errorHandler } from './middleware/error-handler';

const app = new Hono();

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reg-triage-api',
  });
});

app.route('/api/directives', directivesRouter);
app.route('/api/action-items', actionItemsRouter);
app.route('/api/authorities', authoritiesRouter);
app.route('/api/assignees', assigneesRouter);
app.route('/api/stats', statsRouter);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json({ error: 'Not Found', message: `Route ${c.req.path} not found` }, 404);
});

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  console.log(`Regulatory Triage API listening on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}

export default app;
