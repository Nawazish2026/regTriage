import { Hono } from 'hono';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { directiveQuerySchema, updateDirectiveSchema } from '../validators/schemas';
import { sanitizeText, truncateText } from '../utils/sanitize';
import { DataQualityService } from '../services/data-quality.service';

export const directivesRouter = new Hono();

directivesRouter.get('/', async (c) => {
  const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams);
  const query = directiveQuerySchema.parse(rawQuery);

  const { page, limit, status, severity, category, authorityId, hasAnomaly, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ComplianceDirectiveWhereInput = {};

  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (authorityId) where.authorityId = authorityId;
  if (hasAnomaly !== undefined) where.hasDataAnomaly = hasAnomaly;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { referenceCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderByMap: Record<string, Prisma.ComplianceDirectiveOrderByWithRelationInput> = {
    title: { title: sortOrder },
    severity: { severity: sortOrder },
    status: { status: sortOrder },
    publishedDate: { publishedDate: { sort: sortOrder, nulls: 'last' } },
    createdAt: { createdAt: sortOrder },
    effectiveDate: { effectiveDate: { sort: sortOrder, nulls: 'last' } },
  };

  const [directives, total] = await Promise.all([
    prisma.complianceDirective.findMany({
      where,
      include: {
        authority: {
          select: { id: true, name: true, acronym: true, jurisdiction: true },
        },
        affectedProducts: {
          select: { id: true, name: true, ndcCode: true, therapeuticArea: true },
        },
        _count: { select: { actionItems: true } },
      },
      orderBy: orderByMap[sortBy] || { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.complianceDirective.count({ where }),
  ]);

  const sanitized = directives.map((d) => ({
    ...d,
    description: sanitizeText(d.description),
    descriptionTruncated: truncateText(sanitizeText(d.description), 200),
  }));

  return c.json({
    data: sanitized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

directivesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const directive = await prisma.complianceDirective.findUniqueOrThrow({
    where: { id },
    include: {
      authority: true,
      affectedProducts: true,
      actionItems: {
        include: {
          assignee: { select: { id: true, name: true, email: true, department: true } },
        },
        orderBy: { priority: 'asc' },
      },
    },
  });

  return c.json({
    data: {
      ...directive,
      description: sanitizeText(directive.description),
    },
  });
});

directivesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const validated = updateDirectiveSchema.parse(body);

  await prisma.complianceDirective.update({
    where: { id },
    data: validated,
  });

  const { directiveAnomalies, actionItemAnomalies } = await DataQualityService.auditDirective(id);

  await prisma.complianceDirective.update({
    where: { id },
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

  const refreshed = await prisma.complianceDirective.findUniqueOrThrow({
    where: { id },
    include: {
      authority: {
        select: { id: true, name: true, acronym: true, jurisdiction: true },
      },
      affectedProducts: {
        select: { id: true, name: true, ndcCode: true, therapeuticArea: true },
      },
      _count: { select: { actionItems: true } },
    },
  });

  return c.json({
    data: {
      ...refreshed,
      description: sanitizeText(refreshed.description),
    },
  });
});
