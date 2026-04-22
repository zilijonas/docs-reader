import type { CSSProperties } from 'react';

import { AppActionDock } from '../../../components/app/AppActionDock';
import { DetectionSidebar } from '../../../components/app/DetectionSidebar';
import { Dropzone } from '../../../components/app/Dropzone';
import { PdfViewer } from '../../../components/app/PdfViewer';
import { ZoomLayer } from '../../../components/app/ZoomLayer';
import { cn } from '@/lib/cn';
import { ReviewPagination } from '../../../components/app/ReviewPagination';
import { ReviewProvider, useReviewContext } from '../context/ReviewContext';
import { WorkflowProvider, useWorkflowContext } from '../context/WorkflowContext';
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

function AppShellContent() {
  const {
    appHeaderHeight,
    appShellRef,
    isDesktopSidebarOpen,
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
    <div className="app-shell" ref={appShellRef} style={getAppShellStyle(appHeaderHeight)}>
      <AppHeader />

      {!hasViewer ? (
        <Dropzone />
      ) : (
        <>
          <div className="app-main-grid" data-sidebar-open={isDesktopSidebarOpen}>
            <button
              aria-label="Close review panel"
              className="review-sidebar-backdrop cursor-pointer border-none p-0"
              data-open={isSidebarOpen}
              onClick={() => setReviewPanelOpen(false)}
              type="button"
            />

            <div className="app-viewer-column" data-zoomed={zoom > 1} ref={viewerColumnRef}>
              <div className="app-viewer-inner">
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

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-sticky flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-[calc(100vw-7.5rem)] items-center gap-1.5 rounded-full border border-border bg-canvas/95 px-2.5 py-2 shadow-[0_16px_40px_-24px_rgba(20,16,10,0.28)] backdrop-blur-app-header">
              <ReviewPagination activePage={activePage} compact onActivatePage={scrollToPage} pageCount={pages.length} />
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

export function AppShell() {
  return (
    <WorkflowProvider>
      <ReviewProvider>
        <AppShellContent />
      </ReviewProvider>
    </WorkflowProvider>
  );
}
