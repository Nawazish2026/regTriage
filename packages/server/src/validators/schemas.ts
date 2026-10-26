import { z } from 'zod';

export const DirectiveCategoryEnum = z.enum([
  'GUIDANCE', 'RULE', 'RECALL', 'SAFETY_ALERT', 'LABELING_CHANGE',
]);

export const SeverityEnum = z.enum([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN',
]);

export const DirectiveStatusEnum = z.enum([
  'DRAFT', 'PUBLISHED', 'UNDER_REVIEW', 'SUPERSEDED', 'WITHDRAWN',
]);

export const ActionItemStatusEnum = z.enum([
  'PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED',
]);

export const PriorityEnum = z.enum(['P0', 'P1', 'P2', 'P3']);

export const directiveQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: DirectiveStatusEnum.optional(),
  severity: SeverityEnum.optional(),
  category: DirectiveCategoryEnum.optional(),
  authorityId: z.string().uuid().optional(),
  hasAnomaly: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().min(1).max(200).optional(),
  sortBy: z.enum(['title', 'severity', 'status', 'publishedDate', 'createdAt', 'effectiveDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const actionItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: ActionItemStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  directiveId: z.string().uuid().optional(),
  hasAnomaly: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  overdue: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  isFlagged: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sortBy: z.enum(['title', 'priority', 'status', 'dueDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateDirectiveSchema = z.object({
  status: DirectiveStatusEnum.optional(),
  severity: SeverityEnum.optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const updateActionItemSchema = z.object({
  status: ActionItemStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isFlagged: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type DirectiveQuery = z.infer<typeof directiveQuerySchema>;
export type ActionItemQuery = z.infer<typeof actionItemQuerySchema>;
export type UpdateDirective = z.infer<typeof updateDirectiveSchema>;
export type UpdateActionItem = z.infer<typeof updateActionItemSchema>;
