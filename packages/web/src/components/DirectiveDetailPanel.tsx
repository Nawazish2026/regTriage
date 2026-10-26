import { useUpdateActionItem } from '../hooks/useQueries';
import { StatusEditor } from './StatusEditor';
import type { ComplianceDirective, ActionItem } from '../types';

interface DirectiveDetailPanelProps {
  directive: ComplianceDirective | null;
  onClose: () => void;
}

export function DirectiveDetailPanel({ directive, onClose }: DirectiveDetailPanelProps) {
  const updateActionItem = useUpdateActionItem();

  if (!directive) {
    return (
      <div className="detail-panel">
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (item: ActionItem) => {
    return item.status === 'PENDING' && item.dueDate && new Date(item.dueDate) < new Date();
  };

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <div className="detail-panel__title">Directive Details</div>
        <button className="detail-panel__close" onClick={onClose}>×</button>
      </div>

      <div className="detail-panel__content">
        {directive.hasDataAnomaly && (
          <div className="anomaly-banner">
            <div className="anomaly-banner__title">
              ⚠ Data Quality Issues Detected
            </div>
            <div className="anomaly-banner__details">
              {directive.anomalyDetails?.split(' | ').map((detail, i) => (
                <div key={i}>• {detail}</div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-label">Identification</div>
          <div className="detail-grid">
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Reference</span>
              <span className="ref-code">{directive.referenceCode}</span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Authority</span>
              <span className="authority-tag">{directive.authority.acronym}</span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Category</span>
              <span className="badge badge--category">
                {directive.category.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Severity</span>
              <span className={`badge badge--${directive.severity.toLowerCase()}`}>
                {directive.severity}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">Status & Dates</div>
          <div className="detail-grid">
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Status</span>
              <span className={`badge badge--${directive.status.toLowerCase().replace('_', '-')}`}>
                {directive.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Published</span>
              <span className="text-mono" style={{ fontSize: '11px' }}>
                {formatDate(directive.publishedDate) || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Effective</span>
              <span className="text-mono" style={{ fontSize: '11px', color: !directive.effectiveDate ? '#e11d48' : undefined }}>
                {formatDate(directive.effectiveDate) || '⚠ Missing'}
              </span>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Comment Deadline</span>
              <span className="text-mono" style={{ fontSize: '11px' }}>
                {formatDate(directive.commentDeadline) || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">Summary</div>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
            {directive.title}
          </div>
          {directive.description && (
            <div className="detail-value" style={{ fontSize: '12px' }}>{directive.description}</div>
          )}
        </div>

        {directive.affectedProducts && directive.affectedProducts.length > 0 && (
          <div className="detail-section">
            <div className="detail-label">
              Affected Products ({directive.affectedProducts.length})
            </div>
            <div className="product-list">
              {directive.affectedProducts.map((p) => (
                <span key={p.id} className="product-tag" title={p.ndcCode || 'No NDC'}>
                  💊 {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {directive.actionItems && (
          <div className="detail-section">
            <div className="detail-label">
              Action Items ({directive.actionItems.length})
            </div>
            <div className="action-items-list">
              {directive.actionItems.map((item) => (
                <div
                  key={item.id}
                  className={`action-item-card ${isOverdue(item) ? 'action-item-card--overdue' : ''}`}
                >
                  <div className="action-item-card__header">
                    <span className={`badge badge--${item.priority.toLowerCase()}`}>
                      {item.priority}
                    </span>
                    <span className="action-item-card__title">{item.title}</span>
                    {item.hasDataAnomaly && (
                      <span title={item.anomalyDetails || ''} style={{ cursor: 'help' }}>⚠</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <StatusEditor
                      currentStatus={item.status}
                      statuses={['PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED']}
                      onStatusChange={(newStatus) => {
                        updateActionItem.mutate({
                          id: item.id,
                          data: { status: newStatus },
                        });
                      }}
                      disabled={updateActionItem.isPending}
                    />
                    {item.assignee && (
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        👤 {item.assignee.name}
                      </span>
                    )}
                    {!item.assignee && item.priority === 'P0' && (
                      <span style={{ color: '#e11d48', fontSize: '11px', fontWeight: 600 }}>
                        ⚠ Unassigned
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="text-mono" style={{ fontSize: '11px', color: isOverdue(item) ? '#ea580c' : undefined }}>
                        📅 {formatDate(item.dueDate)} {isOverdue(item) ? '(OVERDUE)' : ''}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {directive.rawMetadata && (
          <div className="detail-section">
            <div className="detail-label">Source Metadata</div>
            <pre className="metadata-viewer">
              {JSON.stringify(directive.rawMetadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
