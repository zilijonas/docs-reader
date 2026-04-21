import type { ReactNode, Ref } from 'react';
import { LassoSelect, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/cn';
import { REDACTOR_UI } from '../../features/redactor';

export function ReviewToolbar({
  toolMode,
  onToolModeChange,
  zoom,
  onZoomChange,
  toolbarRef,
}: {
  toolMode: 'select' | 'draw' | null;
  onToolModeChange: (mode: 'select' | 'draw' | null) => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  toolbarRef?: Ref<HTMLDivElement>;
}) {
  const isSelectMode = toolMode === 'select';
  const isDrawMode = toolMode === 'draw';

  return (
    <>
      <div
        className="review-toolbar review-toolbar-chrome sticky z-10 flex flex-col gap-3 border-b border-border bg-canvas/95 px-6 py-4 backdrop-blur-app-header"
        ref={toolbarRef}
      >
        <div className="review-toolbar-controls">
          <div className="review-toolbar-mode">
            <ZoomControls compact={false} onZoomChange={onZoomChange} zoom={zoom} />
            <div className="review-toolbar-mode-controls">
              <SegmentedButton active={isSelectMode} onClick={() => onToolModeChange(isSelectMode ? null : 'select')}>
                <MousePointer2 size={14} strokeWidth={1.75} />
                Select
              </SegmentedButton>
              <SegmentedButton active={isDrawMode} onClick={() => onToolModeChange(isDrawMode ? null : 'draw')}>
                <LassoSelect size={14} strokeWidth={1.75} />
                Draw
              </SegmentedButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ZoomControls({
  compact = false,
  onZoomChange,
  zoom,
}: {
  compact?: boolean;
  onZoomChange: (value: number) => void;
  zoom: number;
}) {
  return (
    <div className={cn('review-toolbar-zoom', compact && 'review-toolbar-zoom-compact')}>
      <div className="flex items-center gap-1">
        <IconRing
          aria-label="Zoom out"
          onClick={() => onZoomChange(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}
        >
          <ZoomOut size={14} strokeWidth={1.75} />
        </IconRing>

        <span className="review-toolbar-zoom-value font-mono text-[0.8125rem] tabular-nums text-content">
          {Math.round(zoom * 100)}%
        </span>

        <IconRing
          aria-label="Zoom in"
          onClick={() => onZoomChange(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}
        >
          <ZoomIn size={14} strokeWidth={1.75} />
        </IconRing>
      </div>
    </div>
  );
}

function SegmentedButton({
  active,
  compact,
  iconOnly,
  onClick,
  children,
}: {
  active?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.25 rounded-pill px-3 text-[0.8125rem] font-medium transition-colors duration-200 ease-standard',
        compact && 'h-8 px-3 text-[0.8125rem]',
        iconOnly && 'aspect-square px-0',
        active
          ? 'bg-content text-canvas'
          : 'text-content-muted hover:bg-surface-muted hover:text-content',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function IconRing({
  children,
  ...props
}: {
  children: ReactNode;
  'aria-label': string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex size-10 items-center justify-center rounded-full text-content-muted transition-colors duration-200 ease-standard hover:bg-surface-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:size-8"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
