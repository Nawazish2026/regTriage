import type {
  PaginatedResponse,
  ComplianceDirective,
  ActionItem,
  RegulatoryAuthority,
  Assignee,
  StatsOverview,
  DirectiveFilters,
  ActionItemFilters,
} from '../types';

const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

export async function fetchDirectives(
  filters: DirectiveFilters
): Promise<PaginatedResponse<ComplianceDirective>> {
  const qs = buildQueryString(filters);
  return apiFetch(`/directives?${qs}`);
}

export async function fetchDirective(
  id: string
): Promise<{ data: ComplianceDirective }> {
  return apiFetch(`/directives/${id}`);
}

export async function updateDirective(
  id: string,
  data: Partial<ComplianceDirective>
): Promise<{ data: ComplianceDirective }> {
  return apiFetch(`/directives/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchActionItems(
  filters: ActionItemFilters
): Promise<PaginatedResponse<ActionItem>> {
  const qs = buildQueryString(filters);
  return apiFetch(`/action-items?${qs}`);
}

export async function updateActionItem(
  id: string,
  data: Record<string, any>
): Promise<{ data: ActionItem }> {
  return apiFetch(`/action-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchAuthorities(): Promise<{ data: RegulatoryAuthority[] }> {
  return apiFetch('/authorities');
}

export async function fetchAssignees(): Promise<{ data: Assignee[] }> {
  return apiFetch('/assignees');
}

export async function fetchStats(): Promise<{ data: StatsOverview }> {
  return apiFetch('/stats/overview');
}
