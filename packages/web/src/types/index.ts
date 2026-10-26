export interface RegulatoryAuthority {
  id: string;
  name: string;
  acronym: string;
  jurisdiction: string;
  websiteUrl: string | null;
  _count?: { directives: number };
}

export interface AffectedProduct {
  id: string;
  name: string;
  ndcCode: string | null;
  therapeuticArea: string;
}

export interface Assignee {
  id: string;
  name: string;
  email: string;
  department: string;
  _count?: { actionItems: number };
}

export interface ComplianceDirective {
  id: string;
  authorityId: string;
  referenceCode: string;
  title: string;
  description: string | null;
  descriptionTruncated?: string | null;
  category: DirectiveCategory;
  severity: Severity;
  status: DirectiveStatus;
  effectiveDate: string | null;
  commentDeadline: string | null;
  publishedDate: string | null;
  rawMetadata: Record<string, any> | null;
  hasDataAnomaly: boolean;
  anomalyDetails: string | null;
  createdAt: string;
  updatedAt: string;
  authority: Pick<RegulatoryAuthority, 'id' | 'name' | 'acronym' | 'jurisdiction'>;
  affectedProducts: AffectedProduct[];
  _count: { actionItems: number };
  actionItems?: ActionItem[];
}

export interface ActionItem {
  id: string;
  directiveId: string;
  assigneeId: string | null;
  title: string;
  notes: string | null;
  priority: Priority;
  status: ActionItemStatus;
  dueDate: string | null;
  resolvedAt: string | null;
  isFlagged: boolean;
  hasDataAnomaly: boolean;
  anomalyDetails: string | null;
  createdAt: string;
  updatedAt: string;
  directive?: {
    id: string;
    title: string;
    referenceCode: string;
    severity: Severity;
    status: DirectiveStatus;
  };
  assignee?: Assignee | null;
}

export type DirectiveCategory = 'GUIDANCE' | 'RULE' | 'RECALL' | 'SAFETY_ALERT' | 'LABELING_CHANGE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type DirectiveStatus = 'DRAFT' | 'PUBLISHED' | 'UNDER_REVIEW' | 'SUPERSEDED' | 'WITHDRAWN';
export type ActionItemStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface StatsOverview {
  totalDirectives: number;
  totalActionItems: number;
  pendingActions: number;
  criticalDirectives: number;
  anomalyDirectives: number;
  anomalyActionItems: number;
  totalAnomalies: number;
  overdueActions: number;
  resolvedActions: number;
  escalatedActions: number;
  breakdowns: {
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export interface DirectiveFilters {
  page: number;
  limit: number;
  status?: DirectiveStatus;
  severity?: Severity;
  category?: DirectiveCategory;
  authorityId?: string;
  hasAnomaly?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActionItemFilters {
  page: number;
  limit: number;
  status?: ActionItemStatus;
  priority?: Priority;
  assigneeId?: string;
  directiveId?: string;
  hasAnomaly?: boolean;
  overdue?: boolean;
  isFlagged?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
