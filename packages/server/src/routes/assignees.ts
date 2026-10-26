import { Hono } from 'hono';
import { prisma } from '../db';

export const assigneesRouter = new Hono();

assigneesRouter.get('/', async (c) => {
  const assignees = await prisma.assignee.findMany({
    include: {
      _count: { select: { actionItems: true } },
    },
    orderBy: { name: 'asc' },
  });

  return c.json({ data: assignees });
});
