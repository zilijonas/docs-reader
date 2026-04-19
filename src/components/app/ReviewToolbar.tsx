import type { ReactNode } from 'react';
import { ArrowRight, Download, MousePointer2, Square, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '../../components/ui';
import { cn } from '@/lib/cn';
import { REDACTOR_UI } from '../../features/redactor';

export function ReviewToolbar({
  canExport,
  canFallbackExport,
  drawMode,
  onOpenReview,
  onExport,
  onFallbackExport,
  onReset,
  onToggleDrawMode,
  processing,
  reviewCount,
  zoom,
  onZoomChange,
  downloadUrl,
  pageCount,
  activePage,
  onActivatePage,
}: {
  canExport: boolean;
  canFallbackExport: boolean;
  drawMode: boolean;
  onOpenReview: () => void;
  onExport: () => void;
  onFallbackExport: () => void;
  onReset: () => void | Promise<void>;
  onToggleDrawMode: () => void;
  processing: boolean;
  reviewCount: number;
  zoom: number;
  onZoomChange: (value: number) => void;
  downloadUrl?: string;
  pageCount?: number;
  activePage?: number;
  onActivatePage?: (pageIndex: number) => void;
}) {
  return (
    <div className="review-toolbar flex flex-wrap items-center justify-between gap-5 border-b border-border bg-canvas px-6 py-2.5">
      <div className="review-toolbar-group flex items-center gap-1.5">
        <ToolButton active={!drawMode} label="Select" onClick={onToggleDrawMode}>
          <MousePointer2 size={13} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton active={drawMode} label="Draw" onClick={onToggleDrawMode}>
          <Square size={13} strokeWidth={1.5} />
        </ToolButton>

        <div className="mx-1.5 h-5 w-px bg-border" />

        <ToolButton onClick={() => onZoomChange(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}>
          <ZoomOut size={13} strokeWidth={1.5} />
        </ToolButton>
        <span className="min-w-10 text-center font-mono text-[11px] text-content-subtle">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => onZoomChange(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}>
          <ZoomIn size={13} strokeWidth={1.5} />
        </ToolButton>

        <Button className="toolbar-mobile-review-trigger" onClick={onOpenReview} size="sm" variant="secondary">
          Review
          <span className="font-mono text-[10.5px] text-content-subtle">{reviewCount}</span>
        </Button>
      </div>

      {pageCount && pageCount > 0 ? (
        <div className="review-toolbar-pages flex items-center gap-1.5">
          {Array.from({ length: pageCount }, (_, pageIndex) => (
            <button
              className={cn(
                'flex size-7 items-center justify-center rounded-[var(--radius-control)] border font-mono text-[11px] transition-colors duration-200 ease-standard',
                activePage === pageIndex
                  ? 'border-content bg-content text-canvas'
                  : 'border-border bg-canvas text-content-muted hover:border-border-strong hover:bg-surface-muted',
              )}
              key={pageIndex}
              onClick={() => onActivatePage?.(pageIndex)}
              type="button"
            >
              {pageIndex + 1}
            </button>
          ))}
        </div>
      ) : null}

      <div className="review-toolbar-actions flex items-center gap-1.5">
        <Button onClick={onReset} size="sm" variant="ghost">
          Reset session
        </Button>

        {downloadUrl ? (
          <Button download href={downloadUrl} size="sm" variant="secondary">
            <Download size={12} strokeWidth={1.5} />
            Last export
          </Button>
        ) : null}

        {canFallbackExport ? (
          <Button disabled={processing} onClick={onFallbackExport} size="sm" variant="secondary">
            Flattened fallback
          </Button>
        ) : null}

        <Button disabled={!canExport || processing} onClick={onExport} size="sm">
          <Download size={14} strokeWidth={1.5} />
          Export
          <ArrowRight size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-xs font-medium transition-colors duration-200 ease-standard',
        active
          ? 'border-content bg-content text-canvas'
          : 'border-transparent bg-transparent text-content-muted hover:bg-surface-muted hover:text-content',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
