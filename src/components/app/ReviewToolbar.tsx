import type { ReactNode, Ref } from 'react';
import { LassoSelect, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';

import { ReviewPagination } from './ReviewPagination';
import { cn } from '@/lib/cn';
import { REDACTOR_UI } from '../../features/redactor';

export function ReviewToolbar({
  drawMode,
  onToggleDrawMode,
  zoom,
  onZoomChange,
  pageCount,
  activePage,
  onActivatePage,
  toolbarRef,
}: {
  drawMode: boolean;
  onToggleDrawMode: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  pageCount?: number;
  activePage?: number;
  onActivatePage?: (pageIndex: number) => void;
  toolbarRef?: Ref<HTMLDivElement>;
}) {
  return (
    <>
      <div
        className="review-toolbar sticky z-10 grid items-center border-b border-border bg-canvas/95 px-6 py-2.5 backdrop-blur-app-header"
        ref={toolbarRef}
      >
        <div className="review-toolbar-group flex items-center gap-1.5">
          <ToolButton active={!drawMode} label="Select" onClick={onToggleDrawMode}>
            <MousePointer2 size={13} strokeWidth={1.5} />
          </ToolButton>
          <ToolButton active={drawMode} label="Draw" onClick={onToggleDrawMode}>
            <LassoSelect size={13} strokeWidth={1.5} />
          </ToolButton>
        </div>

        {pageCount && pageCount > 0 ? (
          <ReviewPagination
            activePage={activePage}
            className="review-toolbar-pages review-toolbar-pages-desktop"
            onActivatePage={onActivatePage}
            pageCount={pageCount}
          />
        ) : null}

        <div className="review-toolbar-actions flex items-center gap-1.5">
          <div className="review-toolbar-zoom flex items-center">
            <ToolButton onClick={() => onZoomChange(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}>
              <ZoomOut size={13} strokeWidth={1.5} />
            </ToolButton>
            <span className="ui-text-caption min-w-7 text-center font-mono text-content-subtle">
              {Math.round(zoom * 100)}%
            </span>
            <ToolButton onClick={() => onZoomChange(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}>
              <ZoomIn size={13} strokeWidth={1.5} />
            </ToolButton>
          </div>
        </div>
      </div>

      {pageCount && pageCount > 0 ? (
        <div className="review-toolbar-pages review-toolbar-pages-mobile fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-canvas/95 px-2.5 py-2 shadow-[0_16px_40px_-24px_rgba(20,16,10,0.28)] backdrop-blur-app-header">
            <ReviewPagination activePage={activePage} compact onActivatePage={onActivatePage} pageCount={pageCount} />
          </div>
        </div>
      ) : null}
    </>
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
        'ui-text-button-sm inline-flex h-7 items-center gap-1.5 rounded-control border px-2.5 font-medium transition-colors duration-200 ease-standard',
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
