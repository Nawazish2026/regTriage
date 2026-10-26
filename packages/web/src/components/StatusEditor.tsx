import { useState, useRef, useEffect } from 'react';

interface StatusEditorProps {
  currentStatus: string;
  statuses: string[];
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function StatusEditor({ currentStatus, statuses, onStatusChange, disabled }: StatusEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const statusClass = currentStatus.toLowerCase().replace('_', '-');

  return (
    <div className="status-editor" ref={ref}>
      <div
        className="status-editor__trigger"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <span className={`badge badge--${statusClass}`}>
          {currentStatus.replace('_', ' ')}
        </span>
      </div>

      {isOpen && (
        <div className="status-editor__dropdown" onClick={(e) => e.stopPropagation()}>
          {statuses.map(status => (
            <button
              key={status}
              className={`status-editor__option ${status === currentStatus ? 'status-editor__option--active' : ''}`}
              onClick={() => {
                if (status !== currentStatus) {
                  onStatusChange(status);
                }
                setIsOpen(false);
              }}
            >
              <span className={`badge badge--${status.toLowerCase().replace('_', '-')}`}>
                {status.replace('_', ' ')}
              </span>
              {status === currentStatus && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
