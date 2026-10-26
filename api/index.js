const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { PrismaClient } = require('@prisma/client');

// Prisma singleton
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma || new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

const app = new Hono().basePath('/api');

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.onError((err, c) => {
  console.error('API Error:', err.message, err.stack);
  return c.json({ error: err.message }, 500);
});

// Health
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'reg-triage-api' })
);

// Debug
app.get('/debug', async (c) => {
  try {
    const count = await prisma.regulatoryAuthority.count();
    return c.json({ status: 'connected', authorityCount: count, dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET' });
  } catch (err) {
    return c.json({ status: 'error', message: err.message, dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET' }, 500);
  }
});

// Stats overview
app.get('/stats/overview', async (c) => {
  const [totalDirectives, totalActionItems, anomalyDirectives, anomalyActions] = await Promise.all([
    prisma.complianceDirective.count(),
    prisma.actionItem.count(),
    prisma.complianceDirective.count({ where: { hasDataAnomaly: true } }),
    prisma.actionItem.count({ where: { hasDataAnomaly: true } }),
  ]);
  const byStatus = await prisma.complianceDirective.groupBy({ by: ['status'], _count: true });
  const bySeverity = await prisma.complianceDirective.groupBy({ by: ['severity'], _count: true });
  const byPriority = await prisma.actionItem.groupBy({ by: ['priority'], _count: true });
  const overdueActions = await prisma.actionItem.count({
    where: { dueDate: { lt: new Date() }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
  });
  return c.json({
    data: {
      totalDirectives, totalActionItems, anomalyDirectives, anomalyActions, overdueActions,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      bySeverity: Object.fromEntries(bySeverity.map((s) => [s.severity, s._count])),
      byPriority: Object.fromEntries(byPriority.map((s) => [s.priority, s._count])),
    },
  });
});

// Authorities
app.get('/authorities', async (c) => {
  const data = await prisma.regulatoryAuthority.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data });
});

// Assignees
app.get('/assignees', async (c) => {
  const data = await prisma.assignee.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data });
});

// Directives list
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

  const where = {};
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
      include: { authority: true, affectedProducts: true, _count: { select: { actionItems: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complianceDirective.count({ where }),
  ]);
  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// Directive detail
app.get('/directives/:id', async (c) => {
  const directive = await prisma.complianceDirective.findUnique({
    where: { id: c.req.param('id') },
    include: {
      authority: true, affectedProducts: true,
      actionItems: { include: { assignee: true }, orderBy: { priority: 'asc' } },
    },
  });
  if (!directive) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: directive });
});

// Update directive
app.patch('/directives/:id', async (c) => {
  const body = await c.req.json();
  const updateData = {};
  if (body.status) updateData.status = body.status;
  if (body.severity) updateData.severity = body.severity;
  if (body.category) updateData.category = body.category;
  const directive = await prisma.complianceDirective.update({
    where: { id: c.req.param('id') },
    data: updateData,
    include: { authority: true, affectedProducts: true, _count: { select: { actionItems: true } } },
  });
  return c.json({ data: directive });
});

// Action items list
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

  const where = {};
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

// Update action item
app.patch('/action-items/:id', async (c) => {
  const body = await c.req.json();
  const updateData = {};
  if (body.status) updateData.status = body.status;
  if (body.priority) updateData.priority = body.priority;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
  if (body.isFlagged !== undefined) updateData.isFlagged = body.isFlagged;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.status === 'RESOLVED') updateData.resolvedAt = new Date();

  const item = await prisma.actionItem.update({
    where: { id: c.req.param('id') },
    data: updateData,
    include: { directive: { select: { title: true, referenceCode: true } }, assignee: true },
  });
  return c.json({ data: item });
});

app.all('*', (c) => c.json({ error: 'Not Found', message: `Route ${c.req.path} not found` }, 404));

// Vercel Web API export - use fetch handler directly
module.exports = (req, res) => {
  // Convert Node.js req/res to Web API Request and handle with Hono
  return app.fetch(req, { incoming: req, outgoing: res });
};

// Also export as GET/POST/etc for Vercel's Web API format
module.exports.GET = (request) => app.fetch(request);
module.exports.POST = (request) => app.fetch(request);
module.exports.PUT = (request) => app.fetch(request);
module.exports.PATCH = (request) => app.fetch(request);
module.exports.DELETE = (request) => app.fetch(request);
module.exports.OPTIONS = (request) => app.fetch(request);
