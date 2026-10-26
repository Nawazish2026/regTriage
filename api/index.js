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

// Data Quality Auditor - re-checks anomalies dynamically on every update
const REF_CODE_PATTERN = /^[A-Z]{2,5}-\d{4}-[A-Z]-\d+$/;

async function auditDirective(directiveId) {
  try {
    const directive = await prisma.complianceDirective.findUnique({
      where: { id: directiveId },
      include: { actionItems: true },
    });
    if (!directive) return { directiveAnomalies: [], actionItemAnomalies: new Map() };

    const directiveAnomalies = [];
    if (directive.status === 'PUBLISHED' && !directive.effectiveDate) {
      directiveAnomalies.push('Published directive has no effective date');
    }
    if (!REF_CODE_PATTERN.test(directive.referenceCode)) {
      directiveAnomalies.push(`Reference code "${directive.referenceCode}" does not match standard format`);
    }
    if (directive.publishedDate && new Date(directive.publishedDate) > new Date()) {
      directiveAnomalies.push('Published date is in the future');
    }
    const duplicateCount = await prisma.complianceDirective.count({
      where: {
        referenceCode: directive.referenceCode,
        id: { not: directive.id },
      },
    });
    if (duplicateCount > 0) {
      directiveAnomalies.push(`Duplicate reference code shared with ${duplicateCount} other directive(s)`);
    }
    if (directive.description) {
      if (/<script|<\/script|javascript:/i.test(directive.description)) {
        directiveAnomalies.push('Description contains potentially unsafe HTML/script content');
      }
      if (directive.description.length > 2000) {
        directiveAnomalies.push(`Description is excessively long (${directive.description.length} chars)`);
      }
    }
    if (directive.status === 'WITHDRAWN') {
      const pendingCount = directive.actionItems.filter(ai => ai.status === 'PENDING').length;
      if (pendingCount > 0) {
        directiveAnomalies.push(`Withdrawn directive still has ${pendingCount} pending action item(s)`);
      }
    }

    const actionItemAnomalies = new Map();
    for (const ai of directive.actionItems) {
      const aiAnomalies = [];
      if (ai.status === 'PENDING' && ai.dueDate && new Date(ai.dueDate) < new Date()) {
        aiAnomalies.push('Overdue action item still marked as pending');
      }
      if (ai.priority === 'P0' && !ai.assigneeId && ai.status !== 'RESOLVED' && ai.status !== 'DISMISSED') {
        aiAnomalies.push('Critical (P0) action item has no assignee');
      }
      if (directive.status === 'WITHDRAWN' && ai.status === 'PENDING') {
        aiAnomalies.push('Action item references a withdrawn directive');
      }
      actionItemAnomalies.set(ai.id, aiAnomalies);
    }

    return { directiveAnomalies, actionItemAnomalies };
  } catch (e) {
    console.error('Audit error:', e.message);
    return { directiveAnomalies: [], actionItemAnomalies: new Map() };
  }
}

// Health check
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

// Stats overview - returns all metrics for header KPI cards
app.get('/stats/overview', async (c) => {
  const [
    totalDirectives,
    totalActionItems,
    pendingActions,
    criticalDirectives,
    anomalyDirectives,
    anomalyActionItems,
    overdueActions,
    resolvedActions,
    escalatedActions,
    byStatusGroups,
    bySeverityGroups,
    byCategoryGroups,
    byPriorityGroups,
  ] = await Promise.all([
    prisma.complianceDirective.count(),
    prisma.actionItem.count(),
    prisma.actionItem.count({ where: { status: 'PENDING' } }),
    prisma.complianceDirective.count({ where: { severity: 'CRITICAL' } }),
    prisma.complianceDirective.count({ where: { hasDataAnomaly: true } }),
    prisma.actionItem.count({ where: { hasDataAnomaly: true } }),
    prisma.actionItem.count({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    }),
    prisma.actionItem.count({ where: { status: 'RESOLVED' } }),
    prisma.actionItem.count({ where: { status: 'ESCALATED' } }),
    prisma.complianceDirective.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.complianceDirective.groupBy({ by: ['severity'], _count: { _all: true } }),
    prisma.complianceDirective.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.actionItem.groupBy({ by: ['priority'], _count: { _all: true } }),
  ]);

  const byStatus = Object.fromEntries(byStatusGroups.map((s) => [s.status, s._count._all]));
  const bySeverity = Object.fromEntries(bySeverityGroups.map((s) => [s.severity, s._count._all]));
  const byCategory = Object.fromEntries(byCategoryGroups.map((s) => [s.category, s._count._all]));
  const byPriority = Object.fromEntries(byPriorityGroups.map((s) => [s.priority, s._count._all]));

  return c.json({
    data: {
      totalDirectives,
      totalActionItems,
      pendingActions,
      criticalDirectives,
      anomalyDirectives,
      anomalyActionItems,
      totalAnomalies: anomalyDirectives + anomalyActionItems,
      overdueActions,
      resolvedActions,
      escalatedActions,
      byStatus,
      bySeverity,
      byCategory,
      byPriority,
      breakdowns: {
        byStatus,
        bySeverity,
        byCategory,
        byPriority,
      },
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

// Directives list with comprehensive filter support
app.get('/directives', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 25));
  const search = c.req.query('search')?.trim();
  const status = c.req.query('status');
  const severity = c.req.query('severity');
  const category = c.req.query('category');
  const authorityId = c.req.query('authorityId');
  const anomalyParam = c.req.query('hasAnomaly') ?? c.req.query('hasDataAnomaly');
  const sortBy = c.req.query('sortBy') || 'createdAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';

  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { referenceCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && status !== 'ALL' && status !== '') where.status = status;
  if (severity && severity !== 'ALL' && severity !== '') where.severity = severity;
  if (category && category !== 'ALL' && category !== '') where.category = category;
  if (authorityId && authorityId !== 'ALL' && authorityId !== '') where.authorityId = authorityId;
  if (anomalyParam === 'true' || anomalyParam === '1') {
    where.hasDataAnomaly = true;
  } else if (anomalyParam === 'false' || anomalyParam === '0') {
    where.hasDataAnomaly = false;
  }

  let orderBy = { createdAt: 'desc' };
  if (sortBy === 'title') orderBy = { title: sortOrder };
  else if (sortBy === 'referenceCode') orderBy = { referenceCode: sortOrder };
  else if (sortBy === 'severity') orderBy = { severity: sortOrder };
  else if (sortBy === 'status') orderBy = { status: sortOrder };
  else if (sortBy === 'category') orderBy = { category: sortOrder };
  else if (sortBy === 'publishedDate') orderBy = { publishedDate: sortOrder };
  else if (sortBy === 'effectiveDate') orderBy = { effectiveDate: sortOrder };
  else if (sortBy === 'createdAt') orderBy = { createdAt: sortOrder };
  else if (sortBy === 'updatedAt') orderBy = { updatedAt: sortOrder };

  const [data, total] = await Promise.all([
    prisma.complianceDirective.findMany({
      where,
      include: {
        authority: { select: { id: true, name: true, acronym: true, jurisdiction: true } },
        affectedProducts: { select: { id: true, name: true, ndcCode: true, therapeuticArea: true } },
        _count: { select: { actionItems: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complianceDirective.count({ where }),
  ]);

  return c.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

// Directive detail
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

// Update directive - dynamic re-auditing
app.patch('/directives/:id', async (c) => {
  const body = await c.req.json();
  const updateData = {};
  if (body.status) updateData.status = body.status;
  if (body.severity) updateData.severity = body.severity;
  if (body.category) updateData.category = body.category;
  if (body.title) updateData.title = body.title;
  if (body.description) updateData.description = body.description;

  const directive = await prisma.complianceDirective.update({
    where: { id: c.req.param('id') },
    data: updateData,
  });

  // Re-audit directive and related action items
  const { directiveAnomalies, actionItemAnomalies } = await auditDirective(directive.id);

  await prisma.complianceDirective.update({
    where: { id: directive.id },
    data: {
      hasDataAnomaly: directiveAnomalies.length > 0,
      anomalyDetails: directiveAnomalies.length > 0 ? directiveAnomalies.join(' | ') : null,
    },
  });

  for (const [aiId, anomalies] of actionItemAnomalies) {
    await prisma.actionItem.update({
      where: { id: aiId },
      data: {
        hasDataAnomaly: anomalies.length > 0,
        anomalyDetails: anomalies.length > 0 ? anomalies.join(' | ') : null,
      },
    });
  }

  const refreshed = await prisma.complianceDirective.findUnique({
    where: { id: directive.id },
    include: { authority: true, affectedProducts: true, _count: { select: { actionItems: true } } },
  });

  return c.json({ data: refreshed });
});

// Action items list - supports overdue, hasAnomaly, isFlagged, status, priority, assigneeId, etc.
app.get('/action-items', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 25));
  const search = c.req.query('search')?.trim();
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assigneeId = c.req.query('assigneeId');
  const directiveId = c.req.query('directiveId');
  const anomalyParam = c.req.query('hasAnomaly') ?? c.req.query('hasDataAnomaly');
  const overdueParam = c.req.query('overdue') ?? c.req.query('isOverdue');
  const flaggedParam = c.req.query('isFlagged') ?? c.req.query('flagged');
  const sortBy = c.req.query('sortBy') || 'createdAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';

  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && status !== 'ALL' && status !== '') where.status = status;
  if (priority && priority !== 'ALL' && priority !== '') where.priority = priority;
  if (assigneeId && assigneeId !== 'ALL' && assigneeId !== '') {
    if (assigneeId === 'unassigned') {
      where.assigneeId = null;
    } else {
      where.assigneeId = assigneeId;
    }
  }
  if (directiveId) where.directiveId = directiveId;

  // Anomalies toggle
  if (anomalyParam === 'true' || anomalyParam === '1') {
    where.hasDataAnomaly = true;
  } else if (anomalyParam === 'false' || anomalyParam === '0') {
    where.hasDataAnomaly = false;
  }

  // Flagged toggle
  if (flaggedParam === 'true' || flaggedParam === '1') {
    where.isFlagged = true;
  } else if (flaggedParam === 'false' || flaggedParam === '0') {
    where.isFlagged = false;
  }

  // Overdue toggle
  if (overdueParam === 'true' || overdueParam === '1') {
    where.dueDate = { lt: new Date() };
    if (!where.status) {
      where.status = 'PENDING';
    }
  }

  let orderBy = { createdAt: 'desc' };
  if (sortBy === 'title') orderBy = { title: sortOrder };
  else if (sortBy === 'priority') orderBy = { priority: sortOrder };
  else if (sortBy === 'status') orderBy = { status: sortOrder };
  else if (sortBy === 'dueDate') orderBy = { dueDate: sortOrder };
  else if (sortBy === 'resolvedAt') orderBy = { resolvedAt: sortOrder };
  else if (sortBy === 'createdAt') orderBy = { createdAt: sortOrder };
  else if (sortBy === 'updatedAt') orderBy = { updatedAt: sortOrder };
  else if (sortBy === 'assignee') orderBy = { assignee: { name: sortOrder } };

  const [data, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      include: {
        directive: {
          select: {
            id: true,
            title: true,
            referenceCode: true,
            severity: true,
            status: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.actionItem.count({ where }),
  ]);

  return c.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

// Action item detail
app.get('/action-items/:id', async (c) => {
  const item = await prisma.actionItem.findUnique({
    where: { id: c.req.param('id') },
    include: {
      directive: {
        include: {
          authority: { select: { id: true, name: true, acronym: true } },
        },
      },
      assignee: true,
    },
  });
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: item });
});

// Update action item - dynamic status, resolvedAt, and anomaly recalculation
app.patch('/action-items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updateData = {};

  if (body.status !== undefined) {
    updateData.status = body.status;
    updateData.resolvedAt = body.status === 'RESOLVED' ? new Date() : null;
  }
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.assigneeId !== undefined) {
    if (body.assigneeId === null || body.assigneeId === '') {
      updateData.assignee = { disconnect: true };
    } else {
      updateData.assignee = { connect: { id: body.assigneeId } };
    }
  }
  if (body.isFlagged !== undefined) updateData.isFlagged = Boolean(body.isFlagged);
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: updateData,
  });

  // Re-audit directive and action item data quality dynamically!
  const { directiveAnomalies, actionItemAnomalies } = await auditDirective(updated.directiveId);

  await prisma.complianceDirective.update({
    where: { id: updated.directiveId },
    data: {
      hasDataAnomaly: directiveAnomalies.length > 0,
      anomalyDetails: directiveAnomalies.length > 0 ? directiveAnomalies.join(' | ') : null,
    },
  });

  const myAnomalies = actionItemAnomalies.get(id) || [];
  const refreshed = await prisma.actionItem.update({
    where: { id },
    data: {
      hasDataAnomaly: myAnomalies.length > 0,
      anomalyDetails: myAnomalies.length > 0 ? myAnomalies.join(' | ') : null,
    },
    include: {
      directive: {
        select: {
          id: true,
          title: true,
          referenceCode: true,
          severity: true,
          status: true,
        },
      },
      assignee: {
        select: { id: true, name: true, email: true, department: true },
      },
    },
  });

  return c.json({ data: refreshed });
});

app.all('*', (c) => c.json({ error: 'Not Found', message: `Route ${c.req.path} not found` }, 404));

// Vercel export
module.exports = (req, res) => {
  return app.fetch(req, { incoming: req, outgoing: res });
};

module.exports.GET = (request) => app.fetch(request);
module.exports.POST = (request) => app.fetch(request);
module.exports.PUT = (request) => app.fetch(request);
module.exports.PATCH = (request) => app.fetch(request);
module.exports.DELETE = (request) => app.fetch(request);
module.exports.OPTIONS = (request) => app.fetch(request);
