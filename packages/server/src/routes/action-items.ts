import { Hono } from 'hono';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { actionItemQuerySchema, updateActionItemSchema } from '../validators/schemas';
import { DataQualityService } from '../services/data-quality.service';

export const actionItemsRouter = new Hono();

actionItemsRouter.get('/', async (c) => {
  const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams);
  const query = actionItemQuerySchema.parse(rawQuery);

  const { page, limit, status, priority, assigneeId, directiveId, hasAnomaly, overdue, isFlagged, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ActionItemWhereInput = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (directiveId) where.directiveId = directiveId;
  if (hasAnomaly !== undefined) where.hasDataAnomaly = hasAnomaly;
  if (isFlagged !== undefined) where.isFlagged = isFlagged;
  if (overdue) {
    where.status = 'PENDING';
    where.dueDate = { lt: new Date() };
  }

  const orderByMap: Record<string, Prisma.ActionItemOrderByWithRelationInput> = {
    title: { title: sortOrder },
    priority: { priority: sortOrder },
    status: { status: sortOrder },
    dueDate: { dueDate: { sort: sortOrder, nulls: 'last' } },
    createdAt: { createdAt: sortOrder },
  };

  const [items, total] = await Promise.all([
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
      orderBy: orderByMap[sortBy] || { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.actionItem.count({ where }),
  ]);

  return c.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

actionItemsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const item = await prisma.actionItem.findUniqueOrThrow({
    where: { id },
    include: {
      directive: {
        include: {
          authority: { select: { id: true, name: true, acronym: true } },
        },
      },
      assignee: true,
    },
  });

  return c.json({ data: item });
});

actionItemsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const validated = updateActionItemSchema.parse(body);

  const updateData: Prisma.ActionItemUpdateInput = {};

  if (validated.status !== undefined) {
    updateData.status = validated.status;
    updateData.resolvedAt = validated.status === 'RESOLVED' ? new Date() : null;
  }

  if (validated.priority !== undefined) updateData.priority = validated.priority;
  if (validated.notes !== undefined) updateData.notes = validated.notes;
  if (validated.isFlagged !== undefined) updateData.isFlagged = validated.isFlagged;

  if (validated.assigneeId !== undefined) {
    if (validated.assigneeId === null) {
      updateData.assignee = { disconnect: true };
    } else {
      updateData.assignee = { connect: { id: validated.assigneeId } };
    }
  }

  if (validated.dueDate !== undefined) {
    updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: updateData,
  });

  const { directiveAnomalies, actionItemAnomalies } = await DataQualityService.auditDirective(
    updated.directiveId
  );

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
