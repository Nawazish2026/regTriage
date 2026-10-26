import { Hono } from 'hono';
import { prisma } from '../db';

export const statsRouter = new Hono();

statsRouter.get('/overview', async (c) => {
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
    directivesByStatus,
    directivesBySeverity,
    directivesByCategory,
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
    prisma.complianceDirective.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.complianceDirective.groupBy({
      by: ['severity'],
      _count: { _all: true },
    }),
    prisma.complianceDirective.groupBy({
      by: ['category'],
      _count: { _all: true },
    }),
  ]);

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
      breakdowns: {
        byStatus: Object.fromEntries(
          directivesByStatus.map(g => [g.status, g._count._all])
        ),
        bySeverity: Object.fromEntries(
          directivesBySeverity.map(g => [g.severity, g._count._all])
        ),
        byCategory: Object.fromEntries(
          directivesByCategory.map(g => [g.category, g._count._all])
        ),
      },
    },
  });
});
