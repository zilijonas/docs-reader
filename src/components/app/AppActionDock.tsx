import type { ReactNode } from 'react';
import { LassoSelect, Layers, MousePointer2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/cn';
import { REDACTOR_UI } from '../../features/redactor';

export function AppActionDock({
  canRedo,
  pendingReviewCount,
  sidebarOpen,
  toolMode,
  onOpenReview,
  onRedo,
  onToolModeChange,
  onZoomChange,
  zoom,
}: {
  canRedo: boolean;
  pendingReviewCount: number;
  sidebarOpen?: boolean;
  toolMode: 'select' | 'draw' | null;
  onOpenReview: () => void;
  onRedo: () => void;
  onToolModeChange: (mode: 'select' | 'draw' | null) => void;
  onZoomChange: (value: number) => void;
  zoom: number;
}) {
  const isSelectMode = toolMode === 'select';
  const isDrawMode = toolMode === 'draw';

  return (
    <div
      className={cn(
        'fixed bottom-6 z-20 flex flex-col-reverse items-center gap-2.5 transition-[right] duration-200 ease-standard',
        sidebarOpen
          ? 'right-4 lg:right-[calc(var(--layout-app-sidebar)+1rem)]'
          : 'right-4',
      )}
    >
      <DockButton
        active={sidebarOpen}
        aria-label={sidebarOpen ? 'Close review sidebar' : `Open review sidebar (${pendingReviewCount} pending)`}
        onClick={onOpenReview}
      >
        <Layers size={20} strokeWidth={1.75} />
        {pendingReviewCount > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -right-0.5 -top-0.5',
              'inline-flex min-w-[1.375rem] items-center justify-center',
              'h-[1.375rem] rounded-full bg-detection px-1 text-[0.6875rem] font-semibold leading-none text-canvas',
              'border-2 border-canvas',
            )}
          >
            {pendingReviewCount > 99 ? '99+' : pendingReviewCount}
          </span>
        ) : null}
      </DockButton>

      <DockButton aria-label="Redo" data-keep-pending-manuals="true" disabled={!canRedo} onClick={onRedo}>
        <RotateCcw size={20} strokeWidth={1.75} />
      </DockButton>

      <DockButton
        aria-label={isSelectMode ? 'Disable select mode' : 'Enable select mode'}
        active={isSelectMode}
        onClick={() => onToolModeChange(isSelectMode ? null : 'select')}
      >
        <MousePointer2 size={20} strokeWidth={1.75} />
      </DockButton>

      <DockButton
        aria-label={isDrawMode ? 'Disable draw mode' : 'Enable draw mode'}
        active={isDrawMode}
        onClick={() => onToolModeChange(isDrawMode ? null : 'draw')}
      >
        <LassoSelect size={20} strokeWidth={1.75} />
      </DockButton>

      <DockButton
        aria-label="Zoom in"
        onClick={() => onZoomChange(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}
      >
        <ZoomIn size={20} strokeWidth={1.75} />
      </DockButton>

      <DockButton
        aria-label="Zoom out"
        onClick={() => onZoomChange(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}
      >
        <ZoomOut size={20} strokeWidth={1.75} />
      </DockButton>
    </div>
  );
}

function DockButton({
  children,
  className,
  active,
  disabled,
  onClick,
  ...props
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  'aria-label': string;
  'data-keep-pending-manuals'?: 'true';
}) {
  return (
    <button
      className={cn(
        'relative flex size-12 items-center justify-center rounded-full',
        'border shadow-float transition-[transform,background-color,border-color,color] duration-200 ease-standard',
        active
          ? 'border-content bg-content text-canvas'
          : 'border-border bg-surface text-content hover:border-border-strong hover:bg-surface-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
