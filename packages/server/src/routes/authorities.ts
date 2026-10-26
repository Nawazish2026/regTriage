import { Hono } from 'hono';
import { prisma } from '../db';

export const authoritiesRouter = new Hono();

authoritiesRouter.get('/', async (c) => {
  const authorities = await prisma.regulatoryAuthority.findMany({
    include: {
      _count: { select: { directives: true } },
    },
    orderBy: { name: 'asc' },
  });

  return c.json({ data: authorities });
});
