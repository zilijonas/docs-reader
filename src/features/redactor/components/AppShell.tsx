import { useDeferredValue, useEffect } from 'react';
import type { CSSProperties } from 'react';

import { useReviewStore } from '../../../store/reviewStore';
import { DetectionSidebar } from '../../../components/app/DetectionSidebar';
import { Dropzone } from '../../../components/app/Dropzone';
import { PdfViewer } from '../../../components/app/PdfViewer';
import { ReviewToolbar } from '../../../components/app/ReviewToolbar';
import { useRedactorReviewModel } from '../hooks/useRedactorReviewModel';
import { useRedactorWorkflow } from '../hooks/useRedactorWorkflow';
import { AppHeader } from './AppHeader';

export function AppShell() {
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
    fallbackExportReady,
    setActivePage,
    toggleDetectionStatus,
    setDetectionStatus,
    approveGroup,
    setFilters,
    setDrawMode,
    addManualRedaction,
    updateManualRedaction,
    removeManualRedaction,
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

  return (
    <div className="app-shell">
      <AppHeader
        approvedCount={reviewCounts.approvedCount}
        hasViewer={hasViewer}
        isProcessing={isProcessing}
        onExport={() => handleExport('true-redaction')}
        onOpenReview={() => setIsSidebarOpen(true)}
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
            canExport={!isProcessing}
            canFallbackExport={fallbackExportReady && !isProcessing}
            downloadUrl={exportJob.downloadUrl}
            drawMode={drawMode}
            onActivatePage={(pageIndex) => {
              setActivePage(pageIndex);
              document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onExport={() => handleExport('true-redaction')}
            onFallbackExport={() => handleExport('flattened')}
            onOpenReview={() => setIsSidebarOpen(true)}
            onReset={resetSession}
            onToggleDrawMode={() => setDrawMode(!drawMode)}
            onZoomChange={setZoom}
            pageCount={pages.length}
            processing={isProcessing}
            reviewCount={reviewCounts.reviewCount}
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

            <div className="app-viewer-column">
              <div className="app-viewer-inner" style={{ '--viewer-zoom': zoom } as CSSProperties}>
                <PdfViewer
                  activePage={activePage}
                  detections={detections}
                  drawMode={drawMode}
                  manualRedactions={manualRedactions}
                  onActivatePage={setActivePage}
                  onCreateManual={(pageIndex, payload) => addManualRedaction({ pageIndex, ...payload })}
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
              onApproveDetection={(id) => setDetectionStatus(id, 'approved')}
              onApproveGroup={approveGroup}
              onChangeFilters={setFilters}
              onClose={() => setIsSidebarOpen(false)}
              onDeleteManual={removeManualRedaction}
              onDraftChange={setKeywordDraft}
              onJumpToPage={handleSidebarJump}
              onRejectDetection={(id) => setDetectionStatus(id, 'rejected')}
              onRemoveKeyword={handleKeywordRemove}
              onToggleManualStatus={setManualStatus}
              progress={progress}
              warnings={warnings}
            />
          </div>
        </>
      )}
    </div>
  );
}
