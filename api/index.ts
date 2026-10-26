import { handle } from 'hono/vercel';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';

// ── Edge runtime flag for Vercel ──
export const config = {
  runtime: 'nodejs',
};

// ── Prisma singleton ──
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ── Hono app ──
const app = new Hono().basePath('/api');

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global error handler ──
app.onError((err, c) => {
  console.error('API Error:', err.message, err.stack);
  return c.json({ error: err.message, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined }, 500);
});

// ── Health ──
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'reg-triage-api' })
);

// ── DB connectivity test ──
app.get('/debug', async (c) => {
  try {
    const count = await prisma.regulatoryAuthority.count();
    return c.json({ status: 'connected', authorityCount: count, dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET' });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message, dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET' }, 500);
  }
});

// ── Stats overview ──
app.get('/stats/overview', async (c) => {
  const [totalDirectives, totalActionItems, anomalyDirectives, anomalyActions] =
    await Promise.all([
      prisma.complianceDirective.count(),
      prisma.actionItem.count(),
      prisma.complianceDirective.count({ where: { hasDataAnomaly: true } }),
      prisma.actionItem.count({ where: { hasDataAnomaly: true } }),
    ]);

  const byStatus = await prisma.complianceDirective.groupBy({ by: ['status'], _count: true });
  const bySeverity = await prisma.complianceDirective.groupBy({ by: ['severity'], _count: true });
  const byPriority = await prisma.actionItem.groupBy({ by: ['priority'], _count: true });

  const overdueActions = await prisma.actionItem.count({
    where: {
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  return c.json({
    data: {
      totalDirectives,
      totalActionItems,
      anomalyDirectives,
      anomalyActions,
      overdueActions,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      bySeverity: Object.fromEntries(bySeverity.map((s) => [s.severity, s._count])),
      byPriority: Object.fromEntries(byPriority.map((s) => [s.priority, s._count])),
    },
  });
});

// ── Authorities ──
app.get('/authorities', async (c) => {
  const data = await prisma.regulatoryAuthority.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data });
});

// ── Assignees ──
app.get('/assignees', async (c) => {
  const data = await prisma.assignee.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data });
});

// ── Directives (list with pagination & filters) ──
app.get('/directives', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));
  const search = c.req.query('search')?.trim();
  const status = c.req.query('status');
  const severity = c.req.query('severity');
  const category = c.req.query('category');
  const authorityId = c.req.query('authorityId');
  const hasDataAnomaly = c.req.query('hasDataAnomaly');
  const sortBy = c.req.query('sortBy') || 'updatedAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';

  const where: any = {};
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { referenceCode: { contains: search, mode: 'insensitive' } },
  ];
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (authorityId) where.authorityId = authorityId;
  if (hasDataAnomaly === 'true') where.hasDataAnomaly = true;

  const [data, total] = await Promise.all([
    prisma.complianceDirective.findMany({
      where,
      include: {
        authority: true,
        affectedProducts: true,
        _count: { select: { actionItems: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complianceDirective.count({ where }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ── Directive detail ──
app.get('/directives/:id', async (c) => {
  const directive = await prisma.complianceDirective.findUnique({
    where: { id: c.req.param('id') },
    include: {
      authority: true,
      affectedProducts: true,
      actionItems: { include: { assignee: true }, orderBy: { priority: 'asc' } },
    },
  });
  if (!directive) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: directive });
});

// ── Update directive ──
app.patch('/directives/:id', async (c) => {
  const body = await c.req.json();
  const { status, severity, category } = body;
  const updateData: any = {};
  if (status) updateData.status = status;
  if (severity) updateData.severity = severity;
  if (category) updateData.category = category;

  const directive = await prisma.complianceDirective.update({
    where: { id: c.req.param('id') },
    data: updateData,
    include: { authority: true, affectedProducts: true, _count: { select: { actionItems: true } } },
  });
  return c.json({ data: directive });
});

// ── Action items (list with pagination & filters) ──
app.get('/action-items', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));
  const search = c.req.query('search')?.trim();
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assigneeId = c.req.query('assigneeId');
  const directiveId = c.req.query('directiveId');
  const hasDataAnomaly = c.req.query('hasDataAnomaly');
  const isOverdue = c.req.query('isOverdue');
  const sortBy = c.req.query('sortBy') || 'updatedAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';

  const where: any = {};
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (directiveId) where.directiveId = directiveId;
  if (hasDataAnomaly === 'true') where.hasDataAnomaly = true;
  if (isOverdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { in: ['PENDING', 'IN_PROGRESS'] };
  }

  const [data, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      include: { directive: { select: { title: true, referenceCode: true } }, assignee: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.actionItem.count({ where }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ── Update action item ──
app.patch('/action-items/:id', async (c) => {
  const body = await c.req.json();
  const { status, priority, assigneeId, isFlagged, notes } = body;
  const updateData: any = {};
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
  if (isFlagged !== undefined) updateData.isFlagged = isFlagged;
  if (notes !== undefined) updateData.notes = notes;
  if (status === 'RESOLVED') updateData.resolvedAt = new Date();

  const item = await prisma.actionItem.update({
    where: { id: c.req.param('id') },
    data: updateData,
    include: { directive: { select: { title: true, referenceCode: true } }, assignee: true },
  });
  return c.json({ data: item });
});

// ── Fallback ──
app.all('*', (c) => c.json({ error: 'Not Found', message: `Route ${c.req.path} not found` }, 404));

export default handle(app);
