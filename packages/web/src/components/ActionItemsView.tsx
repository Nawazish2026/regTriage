import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useActionItems, useUpdateActionItem } from '../hooks/useQueries';
import { StatusEditor } from './StatusEditor';
import type { ActionItem, Assignee, ActionItemFilters } from '../types';

interface ActionItemsViewProps {
  assignees: Assignee[];
}

export function ActionItemsView({ assignees }: ActionItemsViewProps) {
  const [filters, setFilters] = useState<ActionItemFilters>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: response, isLoading, isFetching } = useActionItems(filters);
  const updateMutation = useUpdateActionItem();

  const items = response?.data || [];
  const pagination = response?.pagination;

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, page: 1, [key]: value || undefined }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: 25,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, []);

  const isOverdue = (item: ActionItem) => {
    return item.status === 'PENDING' && item.dueDate && new Date(item.dueDate) < new Date();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const columns = useMemo<ColumnDef<ActionItem>[]>(() => [
    {
      id: 'anomaly',
      header: '',
      size: 30,
      cell: ({ row }) => {
        const item = row.original;
        if (!item.hasDataAnomaly) return null;
        return (
          <div className="anomaly-tooltip">
            <span className="anomaly-icon">⚠</span>
            <div className="anomaly-tooltip__content">
              {item.anomalyDetails?.split(' | ').map((d, i) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      id: 'flagged',
      header: '🚩',
      size: 35,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <button
            className={`flag-btn ${item.isFlagged ? 'flag-btn--flagged' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              updateMutation.mutate({
                id: item.id,
                data: { isFlagged: !item.isFlagged },
              });
            }}
            title={item.isFlagged ? 'Unflag item' : 'Flag item for review'}
          >
            {item.isFlagged ? '🚩' : '⚐'}
          </button>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      size: 70,
      cell: ({ getValue }) => {
        const p = getValue<string>();
        return <span className={`badge badge--${p.toLowerCase()}`}>{p}</span>;
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      size: 300,
      cell: ({ row }) => (
        <div>
          <div className="text-truncate" style={{ fontWeight: 600 }}>{row.original.title}</div>
          {row.original.directive && (
            <div className="text-muted text-sm" style={{ marginTop: '2px' }}>
              <span className="ref-code" style={{ fontSize: '10px' }}>{row.original.directive.referenceCode}</span>
              {' '}{row.original.directive.title}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ row }) => (
        <StatusEditor
          currentStatus={row.original.status}
          statuses={['PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED']}
          onStatusChange={(newStatus) => {
            updateMutation.mutate({
              id: row.original.id,
              data: { status: newStatus },
            });
          }}
          disabled={updateMutation.isPending}
        />
      ),
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      size: 140,
      cell: ({ row }) => {
        const item = row.original;
        if (!item.assignee) {
          if (item.priority === 'P0') {
            return (
              <span style={{ color: '#e11d48', fontWeight: 600, fontSize: '11px' }}>
                ⚠ Unassigned
              </span>
            );
          }
          return <span className="text-muted" style={{ fontStyle: 'italic' }}>Unassigned</span>;
        }
        return (
          <span title={item.assignee.email} style={{ fontWeight: 500 }}>
            {item.assignee.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      size: 100,
      cell: ({ row }) => {
        const item = row.original;
        const overdue = isOverdue(item);
        return (
          <span
            className={`text-mono text-sm ${overdue ? 'date-text--missing' : ''}`}
            style={{ fontWeight: overdue ? 700 : undefined }}
          >
            {formatDate(item.dueDate)}
            {overdue && ' (OVERDUE)'}
          </span>
        );
      },
    },
    {
      accessorKey: 'resolvedAt',
      header: 'Resolved',
      size: 90,
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        if (!val) return <span className="text-muted">—</span>;
        return <span className="text-mono text-sm">{formatDate(val)}</span>;
      },
    },
  ], [updateMutation]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination?.totalPages || 0,
  });

  return (
    <div className="main-panel">
      <div className="filter-bar">
        <select
          className="filter-select"
          value={filters.status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ESCALATED">Escalated</option>
        </select>

        <select
          className="filter-select"
          value={filters.priority || ''}
          onChange={(e) => updateFilter('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="P0">P0 — Critical</option>
          <option value="P1">P1 — High</option>
          <option value="P2">P2 — Medium</option>
          <option value="P3">P3 — Low</option>
        </select>

        <select
          className="filter-select"
          value={filters.assigneeId || ''}
          onChange={(e) => updateFilter('assigneeId', e.target.value)}
        >
          <option value="">All Assignees</option>
          {assignees.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <button
          className={`filter-toggle ${filters.overdue ? 'filter-toggle--active' : ''}`}
          onClick={() => updateFilter('overdue', filters.overdue ? undefined : true)}
        >
          📅 Overdue
        </button>

        <button
          className={`filter-toggle ${filters.hasAnomaly ? 'filter-toggle--active' : ''}`}
          onClick={() => updateFilter('hasAnomaly', filters.hasAnomaly ? undefined : true)}
        >
          ⚠ Anomalies
        </button>

        <button
          className={`filter-toggle ${filters.isFlagged ? 'filter-toggle--active' : ''}`}
          onClick={() => updateFilter('isFlagged', filters.isFlagged ? undefined : true)}
        >
          🚩 Flagged
        </button>

        <div className="filter-spacer" />

        {pagination && (
          <span className="filter-count">
            {pagination.total} tasks {isFetching && '•••'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__text">No action items match current filters</div>
          <button
            onClick={resetFilters}
            style={{
              marginTop: '12px',
              padding: '8px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--artixio-purple)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {table.getHeaderGroups().map(headerGroup =>
                    headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        onClick={() => {
                          if (['anomaly', 'flagged'].includes(header.column.id)) return;
                          const col = header.column.id;
                          const isCurrentSort = filters.sortBy === col;
                          setFilters(prev => ({
                            ...prev,
                            sortBy: col,
                            sortOrder: isCurrentSort && prev.sortOrder === 'asc' ? 'desc' : 'asc',
                          }));
                        }}
                        className={filters.sortBy === header.column.id ? 'sorted' : ''}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {filters.sortBy === header.column.id && (
                          <span> {filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={row.original.hasDataAnomaly ? 'row-anomaly' : ''}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: 1 }))}
                >
                  «
                </button>
                <button
                  className="pagination-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  ‹ Prev
                </button>
                <span className="pagination-page">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={!pagination.hasMore}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next ›
                </button>
                <button
                  className="pagination-btn"
                  disabled={!pagination.hasMore}
                  onClick={() => setFilters(prev => ({ ...prev, page: pagination.totalPages }))}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
