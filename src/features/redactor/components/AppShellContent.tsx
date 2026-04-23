import type { CSSProperties } from 'react';

import { AppActionDock } from '../../../components/app/AppActionDock';
import { DetectionSidebar } from '../../../components/app/DetectionSidebar';
import { Dropzone } from '../../../components/app/Dropzone';
import { PdfViewer } from '../../../components/app/PdfViewer';
import { ReviewPagination } from '../../../components/app/ReviewPagination';
import { ZoomLayer } from '../../../components/app/ZoomLayer';
import { cn } from '@/lib/cn';
import { useReviewContext } from '../context/ReviewContext';
import { useWorkflowContext } from '../context/WorkflowContext';
import { useViewerPan } from '../hooks/useViewerPan';
import { AppHeader } from './AppHeader';
import { ConfirmAllExportDialog } from './ConfirmAllExportDialog';
import { OcrLanguageDialog } from './OcrLanguageDialog';
import { ResetSessionDialog } from './ResetSessionDialog';

const getAppShellStyle = (appHeaderHeight: number): CSSProperties =>
  ({
    '--app-header-height': `${appHeaderHeight}px`,
    '--review-toolbar-height': '0px',
    '--layout-app-header-offset': `${appHeaderHeight}px`,
  }) as CSSProperties;

export function AppShellContent() {
  const {
    appHeaderHeight,
    appShellRef,
    isDesktopSidebarOpen,
    isMobileViewport,
    isSidebarOpen,
    scrollToPage,
    setZoom,
    setReviewPanelOpen,
    viewerColumnRef,
    zoom,
  } = useWorkflowContext();
  const { activePage, hasViewer, pages, toolMode } = useReviewContext();
  const { bind, handlePointerDownCapture, isPanning } = useViewerPan({
    setZoom,
    toolMode,
    viewerRef: viewerColumnRef,
    zoom,
  });

  return (
    <div
      className="bg-canvas flex min-h-[100dvh] flex-col"
      ref={appShellRef}
      style={getAppShellStyle(appHeaderHeight)}
    >
      <AppHeader />

      {!hasViewer ? (
        <Dropzone />
      ) : (
        <>
          <div
            className="lg:ease-standard relative grid min-h-0 flex-1 grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_var(--layout-app-sidebar)] lg:transition-[grid-template-columns] lg:duration-200 lg:data-[sidebar-open=false]:[grid-template-columns:minmax(0,1fr)_0px]"
            data-sidebar-open={isDesktopSidebarOpen}
          >
            {isMobileViewport ? (
              <button
                aria-label="Close review panel"
                className="z-drawer-backdrop bg-content/40 fixed inset-0 hidden cursor-pointer border-none p-0 backdrop-blur-[4px] data-[open=true]:block"
                data-open={isSidebarOpen}
                onClick={() => setReviewPanelOpen(false)}
                type="button"
              />
            ) : null}

            <div
              className="lg:border-border h-[calc(100dvh-var(--layout-app-header-offset))] min-h-0 min-w-0 [touch-action:pan-y] [scroll-padding-top:calc(var(--app-header-height)+0.75rem)] overflow-auto [overscroll-behavior:contain] [scroll-behavior:auto] bg-[color:color-mix(in_oklab,var(--theme-canvas)_96%,var(--theme-content))] px-5 py-5 pb-26 data-[zoomed=true]:[touch-action:none] lg:border-r lg:px-10 lg:py-7 lg:pb-30"
              data-zoomed={zoom > 1}
              ref={viewerColumnRef}
            >
              <div className="mx-auto flex w-max max-w-none min-w-full justify-center">
                <ZoomLayer
                  innerProps={{
                    ...bind(),
                    className: cn(
                      toolMode === null && zoom > 1 && 'cursor-grab',
                      isPanning && 'cursor-grabbing',
                    ),
                    onPointerDownCapture: handlePointerDownCapture,
                  }}
                  zoom={zoom}
                >
                  <PdfViewer isPanning={isPanning} />
                </ZoomLayer>
              </div>
            </div>

            <DetectionSidebar />
          </div>

          <AppActionDock />

          <div className="z-sticky pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4">
            <div className="border-border bg-canvas/95 backdrop-blur-app-header max-w-action-dock pointer-events-auto flex items-center gap-1.5 rounded-full border px-2.5 py-2 shadow-[0_16px_40px_-24px_rgba(20,16,10,0.28)]">
              <ReviewPagination
                activePage={activePage}
                compact
                onActivatePage={scrollToPage}
                pageCount={pages.length}
              />
            </div>
          </div>

          <ConfirmAllExportDialog />
          <ResetSessionDialog />
        </>
      )}

      <OcrLanguageDialog />
    </div>
  );
}
