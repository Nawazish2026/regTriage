import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useDirectives, useDirective, useUpdateDirective } from '../hooks/useQueries';
import { DirectiveDetailPanel } from './DirectiveDetailPanel';
import { StatusEditor } from './StatusEditor';
import type {
  ComplianceDirective,
  RegulatoryAuthority,
  DirectiveFilters,
} from '../types';

interface DirectivesViewProps {
  authorities: RegulatoryAuthority[];
}

export function DirectivesView({ authorities }: DirectivesViewProps) {
  const [filters, setFilters] = useState<DirectiveFilters>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: response, isLoading, isFetching } = useDirectives(filters);
  const { data: detailData } = useDirective(selectedId);
  const updateMutation = useUpdateDirective();

  const directives = response?.data || [];
  const pagination = response?.pagination;
  const selectedDirective = detailData?.data;

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, page: 1, search: value || undefined }));
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      [key]: value || undefined,
    }));
  }, []);

  const columns = useMemo<ColumnDef<ComplianceDirective>[]>(() => [
    {
      id: 'anomaly',
      header: '',
      size: 30,
      cell: ({ row }) => {
        const d = row.original;
        if (!d.hasDataAnomaly) return null;
        return (
          <div className="anomaly-tooltip">
            <span className="anomaly-icon" title={d.anomalyDetails || ''}>⚠</span>
            <div className="anomaly-tooltip__content">
              {d.anomalyDetails?.split(' | ').map((detail, i) => (
                <div key={i}>• {detail}</div>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'referenceCode',
      header: 'Ref Code',
      size: 140,
      cell: ({ getValue }) => (
        <span className="ref-code">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'authority',
      header: 'Authority',
      size: 80,
      cell: ({ row }) => (
        <span className="authority-tag">{row.original.authority.acronym}</span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      size: 350,
      cell: ({ getValue }) => (
        <span className="text-truncate" title={getValue<string>()}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      size: 120,
      cell: ({ getValue }) => {
        const cat = getValue<string>();
        return (
          <span className="badge badge--category">
            {cat.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      size: 80,
      cell: ({ getValue }) => {
        const sev = getValue<string>();
        return (
          <span className={`badge badge--${sev.toLowerCase()}`}>{sev}</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ row }) => {
        const d = row.original;
        return (
          <StatusEditor
            currentStatus={d.status}
            statuses={['DRAFT', 'PUBLISHED', 'UNDER_REVIEW', 'SUPERSEDED', 'WITHDRAWN']}
            onStatusChange={(newStatus) => {
              updateMutation.mutate({
                id: d.id,
                data: { status: newStatus },
              });
            }}
            disabled={updateMutation.isPending}
          />
        );
      },
    },
    {
      accessorKey: 'effectiveDate',
      header: 'Effective',
      size: 90,
      cell: ({ getValue }) => {
        const date = getValue<string | null>();
        if (!date) return <span className="text-muted" style={{ fontStyle: 'italic' }}>—</span>;
        return <span className="text-mono text-sm">{new Date(date).toLocaleDateString()}</span>;
      },
    },
    {
      id: 'actionItems',
      header: 'Tasks',
      size: 50,
      cell: ({ row }) => (
        <span className="text-mono" style={{ fontWeight: 600 }}>{row.original._count.actionItems}</span>
      ),
    },
    {
      id: 'products',
      header: 'Drugs',
      size: 50,
      cell: ({ row }) => (
        <span className="text-mono" style={{ fontWeight: 600 }}>{row.original.affectedProducts.length}</span>
      ),
    },
  ], [updateMutation]);

  const table = useReactTable({
    data: directives,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination?.totalPages || 0,
  });

  return (
    <>
      <div className="main-panel">
        <div className="filter-bar">
          <input
            className="filter-search"
            type="text"
            placeholder="Search directives, codes, descriptions..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <select
            className="filter-select"
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="SUPERSEDED">Superseded</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          <select
            className="filter-select"
            value={filters.severity || ''}
            onChange={(e) => updateFilter('severity', e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <select
            className="filter-select"
            value={filters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="GUIDANCE">Guidance</option>
            <option value="RULE">Rule</option>
            <option value="RECALL">Recall</option>
            <option value="SAFETY_ALERT">Safety Alert</option>
            <option value="LABELING_CHANGE">Labeling Change</option>
          </select>

          <select
            className="filter-select"
            value={filters.authorityId || ''}
            onChange={(e) => updateFilter('authorityId', e.target.value)}
          >
            <option value="">All Authorities</option>
            {authorities.map(a => (
              <option key={a.id} value={a.id}>{a.acronym} — {a.name}</option>
            ))}
          </select>

          <button
            className={`filter-toggle ${filters.hasAnomaly ? 'filter-toggle--active' : ''}`}
            onClick={() => updateFilter('hasAnomaly', filters.hasAnomaly ? undefined : true)}
          >
            ⚠ Anomalies Only
          </button>

          <div className="filter-spacer" />

          {pagination && (
            <span className="filter-count">
              {pagination.total} records {isFetching && '•••'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        ) : directives.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📭</div>
            <div className="empty-state__text">No directives match current filters</div>
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
                            if (header.column.id === 'anomaly') return;
                            const col = header.column.id === 'authority' ? 'title' : header.column.id;
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
                      className={[
                        row.original.hasDataAnomaly ? 'row-anomaly' : '',
                        selectedId === row.original.id ? 'row-selected' : '',
                      ].join(' ')}
                      onClick={() => setSelectedId(
                        selectedId === row.original.id ? null : row.original.id
                      )}
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

      {selectedId ? (
        <DirectiveDetailPanel
          directive={selectedDirective || null}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <div className="detail-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--artixio-deep-plum)' }}>
              Select a Directive
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '240px' }}>
              Click any record in the table to inspect details, affected drug products, and action items.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
