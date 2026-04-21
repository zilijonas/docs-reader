import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Languages } from 'lucide-react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/constants';
import { useReviewStore } from '../../../store/reviewStore';
import { AppActionDock } from '../../../components/app/AppActionDock';
import { DetectionSidebar } from '../../../components/app/DetectionSidebar';
import { Dropzone } from '../../../components/app/Dropzone';
import { PdfViewer } from '../../../components/app/PdfViewer';
import { ReviewPagination } from '../../../components/app/ReviewPagination';
import { Button, Panel } from '../../../components/ui';
import { PRIMARY_EXPORT_MODE, REDACTOR_UI, getPageAnchorId, getReviewItemAnchorId } from '../config';
import { OcrLanguagePicker } from './OcrLanguagePicker';
import { useRedactorReviewModel } from '../hooks/useRedactorReviewModel';
import { useRedactorWorkflow } from '../hooks/useRedactorWorkflow';
import { AppHeader } from './AppHeader';

export function AppShell() {
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appHeaderRef = useRef<HTMLDivElement | null>(null);
  const viewerColumnRef = useRef<HTMLDivElement | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const [appHeaderHeight, setAppHeaderHeight] = useState(57);
  const [viewerContentWidth, setViewerContentWidth] = useState(780);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showConfirmAllExportModal, setShowConfirmAllExportModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const {
    sourceDocument,
    pages,
    detections,
    manualRedactions,
    customKeywords,
    filters,
    previews,
    activePage,
    toolMode,
    exportJob,
    warnings,
    setActivePage,
    toggleDetectionStatus,
    setDetectionStatus,
    confirmAll,
    revertAll,
    setFilters,
    setToolMode,
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
    handleContinueOcr,
    isProcessing,
    isOcrLanguageModalOpen,
    isSidebarOpen,
    keywordDraft,
    progress,
    resetSession,
    setIsSidebarOpen,
    setKeywordDraft,
    setSelectedOcrLanguages,
    setSourceDocumentName,
    selectedOcrLanguages,
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
  const totalReviewItemCount = reviewCounts.reviewCount;
  const reviewItemPulseDelayMs = 520;

  useEffect(() => {
    if (!hasViewer) {
      setIsSidebarOpen(false);
      setIsDesktopSidebarOpen(false);
    } else {
      setIsDesktopSidebarOpen(true);
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

    if (!appShellElement || !appHeaderElement) {
      return;
    }

    const syncHeights = () => {
      const nextHeaderHeight = Math.round(appHeaderElement.getBoundingClientRect().height);

      setAppHeaderHeight(nextHeaderHeight);
      appShellElement.style.setProperty('--app-header-height', `${nextHeaderHeight}px`);
      appShellElement.style.setProperty('--review-toolbar-height', '0px');
      appShellElement.style.setProperty('--layout-app-header-offset', `${nextHeaderHeight}px`);
    };

    syncHeights();

    const resizeObserver = new ResizeObserver(syncHeights);
    resizeObserver.observe(appHeaderElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasViewer]);

  useEffect(() => {
    const viewerColumn = viewerColumnRef.current;

    if (!viewerColumn) {
      return;
    }

    const syncViewerContentWidth = () => {
      const styles = window.getComputedStyle(viewerColumn);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const nextWidth = Math.round(viewerColumn.clientWidth - paddingLeft - paddingRight);

      if (nextWidth > 0) {
        setViewerContentWidth(nextWidth);
      }
    };

    syncViewerContentWidth();

    const resizeObserver = new ResizeObserver(syncViewerContentWidth);
    resizeObserver.observe(viewerColumn);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasViewer]);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncViewportMode = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewportMode();
    mediaQuery.addEventListener('change', syncViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', syncViewportMode);
    };
  }, []);

  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');

    if (!viewportMeta || !hasViewer || !isMobileViewport) {
      return;
    }

    const previousContent = viewportMeta.getAttribute('content');
    viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );

    return () => {
      if (previousContent) {
        viewportMeta.setAttribute('content', previousContent);
      } else {
        viewportMeta.removeAttribute('content');
      }
    };
  }, [hasViewer, isMobileViewport]);

  useEffect(() => {
    const viewerColumn = viewerColumnRef.current;

    if (!viewerColumn || !hasViewer || !isMobileViewport) {
      return;
    }

    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let pinching = false;

    const getDistance = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinching = true;
        pinchStartDistance = getDistance(event.touches[0], event.touches[1]);
        pinchStartZoom = zoomRef.current;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (pinching && event.touches.length === 2) {
        event.preventDefault();
        const distance = getDistance(event.touches[0], event.touches[1]);
        if (pinchStartDistance <= 0) return;
        const ratio = distance / pinchStartDistance;
        const next = Math.min(REDACTOR_UI.maxZoom, Math.max(REDACTOR_UI.minZoom, pinchStartZoom * ratio));
        setZoom(next);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinching = false;
      }
    };

    viewerColumn.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewerColumn.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewerColumn.addEventListener('touchend', handleTouchEnd, { passive: true });
    viewerColumn.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      viewerColumn.removeEventListener('touchstart', handleTouchStart);
      viewerColumn.removeEventListener('touchmove', handleTouchMove);
      viewerColumn.removeEventListener('touchend', handleTouchEnd);
      viewerColumn.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [hasViewer, isMobileViewport, setZoom]);

  const scrollToPage = (pageIndex: number) => {
    setActivePage(pageIndex);

    requestAnimationFrame(() => {
      const pageElement = document.getElementById(getPageAnchorId(pageIndex));

      if (!pageElement) {
        return;
      }

      const stickyOffset = appHeaderHeight;
      const pageRect = pageElement.getBoundingClientRect();
      const viewerColumn = viewerColumnRef.current;
      const scrollTarget =
        viewerColumn && viewerColumn.scrollHeight > viewerColumn.clientHeight ? viewerColumn : window;

      if (scrollTarget === window) {
        window.scrollTo({
          top: window.scrollY + pageRect.top - stickyOffset - 12,
          behavior: 'smooth',
        });
      } else {
        const viewerRect = (scrollTarget as HTMLDivElement).getBoundingClientRect();
        (scrollTarget as HTMLDivElement).scrollTo({
          top: (scrollTarget as HTMLDivElement).scrollTop + (pageRect.top - viewerRect.top),
          behavior: 'smooth',
        });
      }
    });
  };

  const pulseReviewItem = (itemId: string) => {
    const reviewItem = document.getElementById(getReviewItemAnchorId(itemId));

    if (!reviewItem) {
      return;
    }

    reviewItem.classList.remove('pdf-review-target-pulse');
    void reviewItem.getBoundingClientRect();
    reviewItem.classList.add('pdf-review-target-pulse');

    const handleAnimationEnd = () => {
      reviewItem.classList.remove('pdf-review-target-pulse');
      reviewItem.removeEventListener('animationend', handleAnimationEnd);
    };

    reviewItem.addEventListener('animationend', handleAnimationEnd);
  };

  const scrollToReviewItem = (itemId: string, pageIndex: number) => {
    setActivePage(pageIndex);

    if (isMobileViewport) {
      setIsSidebarOpen(false);
    }

    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }

    requestAnimationFrame(() => {
      const reviewItem = document.getElementById(getReviewItemAnchorId(itemId));

      if (reviewItem) {
        reviewItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        pulseTimeoutRef.current = window.setTimeout(() => {
          pulseReviewItem(itemId);
          pulseTimeoutRef.current = null;
        }, reviewItemPulseDelayMs);
        return;
      }

      scrollToPage(pageIndex);
      pulseTimeoutRef.current = window.setTimeout(() => {
        pulseReviewItem(itemId);
        pulseTimeoutRef.current = null;
      }, reviewItemPulseDelayMs + 80);
    });
  };

  const handlePrimaryExport = () => {
    if (reviewCounts.confirmedCount === 0 && reviewCounts.unconfirmedCount > 0) {
      setShowConfirmAllExportModal(true);
      return;
    }

    void handleExport(PRIMARY_EXPORT_MODE);
  };

  const handleResetRequest = () => {
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirmModal(false);
    void resetSession();
  };

  return (
    <div
      className="app-shell"
      ref={appShellRef}
      style={
        {
          '--app-header-height': `${appHeaderHeight}px`,
          '--review-toolbar-height': '0px',
          '--layout-app-header-offset': `${appHeaderHeight}px`,
        } as CSSProperties
      }
    >
      <AppHeader
        confirmedCount={reviewCounts.confirmedCount}
        hasViewer={hasViewer}
        headerRef={appHeaderRef}
        onExport={handlePrimaryExport}
        onRenameDocument={setSourceDocumentName}
        onReset={handleResetRequest}
        pendingReviewCount={reviewCounts.unconfirmedCount}
        sourceDocument={sourceDocument}
        totalFindings={totalReviewItemCount}
      />

      {!hasViewer ? (
        <Dropzone
          error={error}
          fileInputRef={fileInputRef}
          isProcessing={isProcessing}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          progress={progress}
        />
      ) : (
        <>
          <div className="app-main-grid" data-sidebar-open={isDesktopSidebarOpen}>
            <button
              aria-label="Close review panel"
              className="review-sidebar-backdrop cursor-pointer border-none p-0"
              data-open={isSidebarOpen}
              onClick={() => setIsSidebarOpen(false)}
              type="button"
            />

            <div className="app-viewer-column" ref={viewerColumnRef}>
              <div className="app-viewer-inner">
                <PdfViewer
                  activePage={activePage}
                  detections={detections}
                  toolMode={toolMode}
                  isMobileViewport={isMobileViewport}
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
                  viewerContentWidth={viewerContentWidth}
                  zoom={zoom}
                />
              </div>
            </div>

            <DetectionSidebar
              confirmedCount={reviewCounts.confirmedCount}
              draft={keywordDraft}
              error={error}
              filters={filters}
              items={deferredReviewItems}
              keywords={customKeywords}
              mobileOpen={isSidebarOpen}
              onAddKeyword={handleKeywordSubmit}
              onConfirmAll={confirmAll}
              onConfirmDetection={(id) => setDetectionStatus(id, 'confirmed')}
              onChangeFilters={setFilters}
              onClose={() => { setIsSidebarOpen(false); setIsDesktopSidebarOpen(false); }}
              onDeleteManual={removeManualRedaction}
              onDraftChange={setKeywordDraft}
              onExport={handlePrimaryExport}
              onJumpToItem={scrollToReviewItem}
              onUnconfirmAll={revertAll}
              onUnconfirmDetection={(id) => setDetectionStatus(id, 'unconfirmed')}
              onRemoveKeyword={handleKeywordRemove}
              onReset={handleResetRequest}
              onToggleManualStatus={setManualStatus}
              processing={isProcessing}
              progress={progress}
              unconfirmedCount={reviewCounts.unconfirmedCount}
              warnings={warnings}
            />
          </div>

          <AppActionDock
            toolMode={toolMode}
            sidebarOpen={isMobileViewport ? isSidebarOpen : isDesktopSidebarOpen}
            onOpenReview={() => { setIsSidebarOpen(prev => !prev); setIsDesktopSidebarOpen(prev => !prev); }}
            onToolModeChange={setToolMode}
            onZoomChange={setZoom}
            pendingReviewCount={reviewCounts.unconfirmedCount}
            zoom={zoom}
          />

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-[calc(100vw-7.5rem)] items-center gap-1.5 rounded-full border border-border bg-canvas/95 px-2.5 py-2 shadow-[0_16px_40px_-24px_rgba(20,16,10,0.28)] backdrop-blur-app-header">
              <ReviewPagination
                activePage={activePage}
                compact
                onActivatePage={scrollToPage}
                pageCount={pages.length}
              />
            </div>
          </div>

          {showConfirmAllExportModal ? (
            <div className="app-modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-content/35 px-4 backdrop-blur-sm">
              <Panel className="w-full max-w-md" padding="lg" tone="overlay">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="type-body-lg font-semibold text-content">Nothing confirmed yet</h2>
                    <p className="text-sm leading-6 text-content-muted">
                      No highlights are confirmed for export. Do you want to confirm all current markings, or cancel
                      and keep reviewing first?
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={() => setShowConfirmAllExportModal(false)} variant="secondary">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setShowConfirmAllExportModal(false);
                        void handleExport(PRIMARY_EXPORT_MODE, { confirmAllUnconfirmed: true });
                      }}
                    >
                      Confirm all markings
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}

          {showResetConfirmModal ? (
            <div className="app-modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-content/35 px-4 backdrop-blur-sm">
              <Panel className="w-full max-w-md" padding="lg" tone="overlay">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="type-body-lg font-semibold text-content">Reset session?</h2>
                    <p className="text-sm leading-6 text-content-muted">
                      This clears the loaded PDF, detections, manual redactions, and review state for the current session.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={() => setShowResetConfirmModal(false)} variant="secondary">
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmReset} variant="danger">
                      Reset session
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}

        </>
      )}

      {isOcrLanguageModalOpen ? (
        <div className="app-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-content/35 px-4 backdrop-blur-sm">
          <Panel className="w-full max-w-2xl" padding="lg" tone="overlay">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <div className="type-data flex items-center gap-1.5 text-content">
                  <Languages size={14} strokeWidth={1.6} />
                  Choose OCR languages
                </div>
                <h2 className="type-body-lg font-semibold text-content">This PDF needs a language hint before OCR</h2>
                <p className="text-sm leading-6 text-content-muted">
                  No searchable text was available for auto-detection. Pick the languages visible in this document,
                  then start OCR.
                </p>
              </div>

              <OcrLanguagePicker
                onChange={(next) => setSelectedOcrLanguages(next.length > 0 ? next : [...DEFAULT_OCR_LANGUAGES])}
                selected={selectedOcrLanguages}
              />

              <p className="ui-text-note italic text-content-subtle">
                Extra languages are fetched on demand and cached by your browser.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => {
                    void resetSession();
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isProcessing} onClick={() => void handleContinueOcr()}>
                  Start OCR
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
