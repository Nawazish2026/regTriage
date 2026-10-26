import { prisma } from '../db';

const REF_CODE_PATTERN = /^[A-Z]{2,5}-\d{4}-[A-Z]-\d+$/;

export class DataQualityService {
  static async auditDirective(directiveId: string): Promise<{
    directiveAnomalies: string[];
    actionItemAnomalies: Map<string, string[]>;
  }> {
    const directive = await prisma.complianceDirective.findUniqueOrThrow({
      where: { id: directiveId },
      include: { actionItems: true },
    });

    const directiveAnomalies: string[] = [];

    if (directive.status === 'PUBLISHED' && !directive.effectiveDate) {
      directiveAnomalies.push('Published directive has no effective date');
    }

    if (!REF_CODE_PATTERN.test(directive.referenceCode)) {
      directiveAnomalies.push(
        `Reference code "${directive.referenceCode}" does not match standard format`
      );
    }

    if (directive.publishedDate && directive.publishedDate > new Date()) {
      directiveAnomalies.push('Published date is in the future');
    }

    const duplicateCount = await prisma.complianceDirective.count({
      where: {
        referenceCode: directive.referenceCode,
        id: { not: directive.id },
      },
    });
    if (duplicateCount > 0) {
      directiveAnomalies.push(
        `Duplicate reference code shared with ${duplicateCount} other directive(s)`
      );
    }

    if (directive.description) {
      if (/<script|<\/script|javascript:/i.test(directive.description)) {
        directiveAnomalies.push('Description contains potentially unsafe HTML/script content');
      }
      if (directive.description.length > 2000) {
        directiveAnomalies.push(
          `Description is excessively long (${directive.description.length} chars)`
        );
      }
    }

    if (directive.status === 'WITHDRAWN') {
      const pendingCount = directive.actionItems.filter(ai => ai.status === 'PENDING').length;
      if (pendingCount > 0) {
        directiveAnomalies.push(
          `Withdrawn directive still has ${pendingCount} pending action item(s)`
        );
      }
    }

    const actionItemAnomalies = new Map<string, string[]>();
    for (const ai of directive.actionItems) {
      const aiAnomalies: string[] = [];

      if (ai.status === 'PENDING' && ai.dueDate && ai.dueDate < new Date()) {
        aiAnomalies.push('Overdue action item still marked as pending');
      }

      if (ai.priority === 'P0' && !ai.assigneeId) {
        aiAnomalies.push('Critical (P0) action item has no assignee');
      }

      if (directive.status === 'WITHDRAWN' && ai.status === 'PENDING') {
        aiAnomalies.push('Action item references a withdrawn directive');
      }

      if (aiAnomalies.length > 0) {
        actionItemAnomalies.set(ai.id, aiAnomalies);
      }
    }

    return { directiveAnomalies, actionItemAnomalies };
  }

  static async auditAll(): Promise<{ flaggedDirectives: number; flaggedActionItems: number }> {
    await prisma.complianceDirective.updateMany({
      data: { hasDataAnomaly: false, anomalyDetails: null },
    });
    await prisma.actionItem.updateMany({
      data: { hasDataAnomaly: false, anomalyDetails: null },
    });

    const allDirectives = await prisma.complianceDirective.findMany({
      select: { id: true },
    });

    let flaggedDirectives = 0;
    let flaggedActionItems = 0;

    for (const d of allDirectives) {
      const { directiveAnomalies, actionItemAnomalies } = await this.auditDirective(d.id);

      if (directiveAnomalies.length > 0) {
        await prisma.complianceDirective.update({
          where: { id: d.id },
          data: {
            hasDataAnomaly: true,
            anomalyDetails: directiveAnomalies.join(' | '),
          },
        });
        flaggedDirectives++;
      }

      for (const [aiId, anomalies] of actionItemAnomalies) {
        await prisma.actionItem.update({
          where: { id: aiId },
          data: {
            hasDataAnomaly: true,
            anomalyDetails: anomalies.join(' | '),
          },
        });
        flaggedActionItems++;
      }
    }

    return { flaggedDirectives, flaggedActionItems };
  }
}
