import {
  Layers,
  RotateCcw,
  SquareDashedMousePointer,
  TypeOutline,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { CircleButton } from '../../components/ui';
import { REDACTOR_UI } from '../../features/redactor';
import { useReviewContext } from '../../features/redactor/context/ReviewContext';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';

export function AppActionDock() {
  const {
    isDesktopSidebarOpen,
    isMobileViewport,
    isSidebarOpen,
    setZoom,
    toggleReviewPanel,
    zoom,
  } = useWorkflowContext();
  const { canRedo, redoLastChange, setToolMode, toolMode, unconfirmedCount } = useReviewContext();
  const sidebarOpen = isMobileViewport ? isSidebarOpen : isDesktopSidebarOpen;
  const isSelectMode = toolMode === 'select';
  const isDrawMode = toolMode === 'draw';

  return (
    <div
      className={cn(
        'z-sticky ease-standard fixed bottom-6 flex flex-col-reverse items-center gap-2.5 transition-[right] duration-200',
        sidebarOpen ? 'right-4 lg:right-[calc(var(--layout-app-sidebar)+1rem)]' : 'right-4',
      )}
    >
      <CircleButton
        active={sidebarOpen}
        aria-label={sidebarOpen ? copy.dock.closeReview : copy.dock.openReview(unconfirmedCount)}
        onClick={toggleReviewPanel}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <Layers size={20} strokeWidth={1.75} />
        {unconfirmedCount > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-0.5 -right-0.5',
              'inline-flex min-w-[1.375rem] items-center justify-center',
              'bg-detection text-canvas text-caption h-[1.375rem] rounded-full px-1 leading-none font-semibold',
              'border-canvas border-2',
            )}
          >
            {unconfirmedCount > 99 ? '99+' : unconfirmedCount}
          </span>
        ) : null}
      </CircleButton>

      <CircleButton
        aria-label={isSelectMode ? copy.dock.disableSelect : copy.dock.enableSelect}
        active={isSelectMode}
        onClick={() => setToolMode(isSelectMode ? null : 'select')}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <TypeOutline size={20} strokeWidth={1.75} />
      </CircleButton>

      <CircleButton
        aria-label={isDrawMode ? copy.dock.disableDraw : copy.dock.enableDraw}
        active={isDrawMode}
        onClick={() => setToolMode(isDrawMode ? null : 'draw')}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <SquareDashedMousePointer size={20} strokeWidth={1.75} />
      </CircleButton>

      <CircleButton
        aria-label={copy.dock.zoomIn}
        onClick={() => setZoom(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <ZoomIn size={20} strokeWidth={1.75} />
      </CircleButton>

      <CircleButton
        aria-label={copy.dock.zoomOut}
        onClick={() => setZoom(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <ZoomOut size={20} strokeWidth={1.75} />
      </CircleButton>

      <CircleButton
        aria-label={copy.dock.redo}
        data-keep-pending-manuals="true"
        disabled={!canRedo}
        onClick={redoLastChange}
        ring="strong"
        size="lg"
        tone="accent"
      >
        <RotateCcw size={20} strokeWidth={1.75} />
      </CircleButton>
    </div>
  );
}
