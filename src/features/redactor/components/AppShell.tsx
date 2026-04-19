import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Shield } from 'lucide-react';

import { useReviewStore } from '../../../store/reviewStore';
import { DetectionSidebar } from '../../../components/app/DetectionSidebar';
import { Dropzone } from '../../../components/app/Dropzone';
import { PdfViewer } from '../../../components/app/PdfViewer';
import { ReviewToolbar } from '../../../components/app/ReviewToolbar';
import { Badge, Button, Panel } from '../../../components/ui';
import { PRIMARY_EXPORT_MODE, REDACTOR_UI, getPageAnchorId } from '../config';
import { useRedactorReviewModel } from '../hooks/useRedactorReviewModel';
import { useRedactorWorkflow } from '../hooks/useRedactorWorkflow';
import { AppHeader } from './AppHeader';

export function AppShell() {
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appHeaderRef = useRef<HTMLDivElement | null>(null);
  const reviewToolbarRef = useRef<HTMLDivElement | null>(null);
  const viewerColumnRef = useRef<HTMLDivElement | null>(null);
  const [appHeaderHeight, setAppHeaderHeight] = useState(57);
  const [reviewToolbarHeight, setReviewToolbarHeight] = useState(44);
  const [showApproveAllExportModal, setShowApproveAllExportModal] = useState(false);

  const {
    sourceDocument,
    pages,
    detections,
    manualRedactions,
    customKeywords,
    filters,
    previews,
    activePage,
    drawMode,
    exportJob,
    warnings,
    setActivePage,
    toggleDetectionStatus,
    setDetectionStatus,
    approveGroup,
    approveAll,
    setFilters,
    setDrawMode,
    addManualRedaction,
    updateManualRedaction,
    removeManualRedaction,
    clearPendingManualRedactions,
    setManualStatus,
  } = useReviewStore();

  const {
    error,
    fileInputRef,
    handleDrop,
    handleExport,
    handleFileChange,
    handleKeywordRemove,
    handleKeywordSubmit,
    handleSidebarJump,
    isProcessing,
    isSidebarOpen,
    keywordDraft,
    progress,
    resetSession,
    setIsSidebarOpen,
    setKeywordDraft,
    setZoom,
    spans,
    ensurePreview,
    zoom,
  } = useRedactorWorkflow();

  const { spansByPage, filteredReviewItems, reviewCounts } = useRedactorReviewModel({
    detections,
    manualRedactions,
    filters,
    spans,
  });

  const deferredReviewItems = useDeferredValue(filteredReviewItems);
  const hasViewer = Boolean(sourceDocument && pages.length);

  useEffect(() => {
    if (!hasViewer) {
      setIsSidebarOpen(false);
    }
  }, [hasViewer, setIsSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  useEffect(() => {
    const appShellElement = appShellRef.current;
    const appHeaderElement = appHeaderRef.current;
    const reviewToolbarElement = reviewToolbarRef.current;

    if (!appShellElement || !appHeaderElement) {
      return;
    }

    const syncHeights = () => {
      const nextHeaderHeight = Math.round(appHeaderElement.getBoundingClientRect().height);
      const nextToolbarHeight = reviewToolbarElement ? Math.round(reviewToolbarElement.getBoundingClientRect().height) : 0;

      setAppHeaderHeight(nextHeaderHeight);
      setReviewToolbarHeight(nextToolbarHeight);
      appShellElement.style.setProperty('--app-header-height', `${nextHeaderHeight}px`);
      appShellElement.style.setProperty('--review-toolbar-height', `${nextToolbarHeight}px`);
      appShellElement.style.setProperty('--layout-app-header-offset', `${nextHeaderHeight + nextToolbarHeight}px`);
    };

    syncHeights();

    const resizeObserver = new ResizeObserver(syncHeights);
    resizeObserver.observe(appHeaderElement);

    if (reviewToolbarElement) {
      resizeObserver.observe(reviewToolbarElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasViewer]);

  const scrollToPage = (pageIndex: number) => {
    const viewerColumn = viewerColumnRef.current;
    const pageElement = document.getElementById(getPageAnchorId(pageIndex));

    setActivePage(pageIndex);

    if (!viewerColumn || !pageElement) {
      return;
    }

    const viewerRect = viewerColumn.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    const top = viewerColumn.scrollTop + (pageRect.top - viewerRect.top);

    viewerColumn.scrollTo({ top, behavior: 'smooth' });
  };

  const handlePrimaryExport = () => {
    if (reviewCounts.approvedCount === 0 && reviewCounts.suggestedCount > 0) {
      setShowApproveAllExportModal(true);
      return;
    }

    void handleExport(PRIMARY_EXPORT_MODE);
  };

  return (
    <div
      className="app-shell"
      ref={appShellRef}
      style={
        {
          '--app-header-height': `${appHeaderHeight}px`,
          '--review-toolbar-height': `${reviewToolbarHeight}px`,
          '--layout-app-header-offset': `${appHeaderHeight + reviewToolbarHeight}px`,
        } as CSSProperties
      }
    >
      {hasViewer ? (
        <div className="app-mobile-status-banner border-b border-border px-6 py-3">
          <div className="flex items-center justify-center md:justify-end gap-2 text-center">
            <Badge tone="safe">
              <Shield size={10} strokeWidth={1.75} />
              local only
            </Badge>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
              <span className="whitespace-nowrap">
                <strong className="text-content">{reviewCounts.approvedCount}</strong>{' '}
                <span className="text-content-subtle whitespace-nowrap">approved</span>
              </span>
              <span className="whitespace-nowrap">
                <strong className="text-warning-ink">{reviewCounts.suggestedCount}</strong>{' '}
                <span className="text-content-subtle whitespace-nowrap">to review</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <AppHeader
        approvedCount={reviewCounts.approvedCount}
        hasViewer={hasViewer}
        headerRef={appHeaderRef}
        isProcessing={isProcessing}
        onExport={handlePrimaryExport}
        onOpenReview={() => setIsSidebarOpen(true)}
        onReset={resetSession}
        pendingReviewCount={reviewCounts.suggestedCount}
        reviewItemCount={deferredReviewItems.length}
        sourceDocument={sourceDocument}
      />

      {!hasViewer ? (
        <Dropzone
          error={error}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          progress={progress}
        />
      ) : (
        <>
          <ReviewToolbar
            activePage={activePage}
            drawMode={drawMode}
            onActivatePage={scrollToPage}
            onToggleDrawMode={() => setDrawMode(!drawMode)}
            onZoomChange={setZoom}
            pageCount={pages.length}
            toolbarRef={reviewToolbarRef}
            zoom={zoom}
          />

          <div className="app-main-grid">
            <button
              aria-label="Close review panel"
              className="review-sidebar-backdrop cursor-pointer border-none p-0"
              data-open={isSidebarOpen}
              onClick={() => setIsSidebarOpen(false)}
              type="button"
            />

            <div className="app-viewer-column" ref={viewerColumnRef}>
              <div
                className="app-viewer-inner"
                style={
                  {
                    '--viewer-base-width': `${REDACTOR_UI.viewerBaseWidth}px`,
                    '--viewer-zoom': zoom,
                  } as CSSProperties
                }
              >
                <PdfViewer
                  activePage={activePage}
                  detections={detections}
                  drawMode={drawMode}
                  manualRedactions={manualRedactions}
                  onActivatePage={setActivePage}
                  onCreateManual={(pageIndex, payload) => addManualRedaction({ pageIndex, ...payload })}
                  onDismissPendingManuals={clearPendingManualRedactions}
                  onEnsurePreview={ensurePreview}
                  onRemoveManual={removeManualRedaction}
                  onSetManualStatus={setManualStatus}
                  onToggleDetection={toggleDetectionStatus}
                  onUpdateManual={updateManualRedaction}
                  pages={pages}
                  previews={previews}
                  spansByPage={spansByPage}
                  zoom={zoom}
                />
              </div>
            </div>

            <DetectionSidebar
              draft={keywordDraft}
              error={error}
              filters={filters}
              items={deferredReviewItems}
              keywords={customKeywords}
              mobileOpen={isSidebarOpen}
              onAddKeyword={handleKeywordSubmit}
              onApproveAll={approveAll}
              onApproveDetection={(id) => setDetectionStatus(id, 'approved')}
              onApproveGroup={approveGroup}
              onChangeFilters={setFilters}
              onClose={() => setIsSidebarOpen(false)}
              onDeleteManual={removeManualRedaction}
              onDraftChange={setKeywordDraft}
              onExport={handlePrimaryExport}
              onJumpToPage={(pageIndex) => {
                handleSidebarJump(pageIndex);
                requestAnimationFrame(() => scrollToPage(pageIndex));
              }}
              onRejectDetection={(id) => setDetectionStatus(id, 'rejected')}
              onRemoveKeyword={handleKeywordRemove}
              onReset={resetSession}
              onToggleManualStatus={setManualStatus}
              processing={isProcessing}
              progress={progress}
              warnings={warnings}
            />
          </div>

          {showApproveAllExportModal ? (
            <div className="app-modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-content/35 px-4 backdrop-blur-sm">
              <Panel className="w-full max-w-md" padding="lg" tone="overlay">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="type-body-lg font-semibold text-content">Nothing approved yet</h2>
                    <p className="text-sm leading-6 text-content-muted">
                      No highlights are approved for export. Do you want to apply all current markings, or cancel and
                      keep reviewing first?
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={() => setShowApproveAllExportModal(false)} variant="secondary">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setShowApproveAllExportModal(false);
                        void handleExport(PRIMARY_EXPORT_MODE, { approveAllSuggested: true });
                      }}
                    >
                      Apply all markings
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
