import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchDirectives,
  fetchDirective,
  updateDirective,
  fetchActionItems,
  updateActionItem,
  fetchAuthorities,
  fetchAssignees,
  fetchStats,
} from '../api/client';
import type { DirectiveFilters, ActionItemFilters } from '../types';

export function useDirectives(filters: DirectiveFilters) {
  return useQuery({
    queryKey: ['directives', filters],
    queryFn: () => fetchDirectives(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useDirective(id: string | null) {
  return useQuery({
    queryKey: ['directive', id],
    queryFn: () => fetchDirective(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useUpdateDirective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      updateDirective(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directives'] });
      queryClient.invalidateQueries({ queryKey: ['directive'] });
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useActionItems(filters: ActionItemFilters) {
  return useQuery({
    queryKey: ['action-items', filters],
    queryFn: () => fetchActionItems(filters),
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      updateActionItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directives'] });
      queryClient.invalidateQueries({ queryKey: ['directive'] });
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useAuthorities() {
  return useQuery({
    queryKey: ['authorities'],
    queryFn: fetchAuthorities,
    staleTime: 5 * 60_000,
  });
}

export function useAssignees() {
  return useQuery({
    queryKey: ['assignees'],
    queryFn: fetchAssignees,
    staleTime: 5 * 60_000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 2_000,
    refetchInterval: 15_000,
  });
}
