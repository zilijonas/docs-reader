import type { ChangeEvent, DragEvent } from 'react';
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { APP_LIMITS, DETECTION_TYPE_LABELS, FILE_ACCEPT } from '../../lib/constants';
import { getRedactorWorkerClient } from '../../lib/worker-client';
import type {
  Detection,
  ProcessingProgress,
  TextSpan,
  WorkerResponse,
} from '../../lib/types';
import { dedupeDetections, detectionSortOrder, formatBytes } from '../../lib/utils';
import { useReviewStore } from '../../store/reviewStore';
import { DetectionSidebar, type SidebarItem } from './DetectionSidebar';
import { Dropzone } from './Dropzone';
import { PdfViewer } from './PdfViewer';
import { ReviewToolbar } from './ReviewToolbar';

const preserveRuleStatuses = (nextDetections: Detection[], previousDetections: Detection[]) =>
  nextDetections.map((detection) => {
    const match = previousDetections.find(
      (candidate) =>
        candidate.source === detection.source &&
        candidate.pageIndex === detection.pageIndex &&
        candidate.type === detection.type &&
        candidate.normalizedSnippet === detection.normalizedSnippet,
    );

    return match ? { ...detection, status: match.status } : detection;
  });

const validateSelectedFile = (file: File) => {
  if (file.type && file.type !== FILE_ACCEPT) {
    throw new Error('Please choose a PDF file.');
  }

  const maxBytes = APP_LIMITS.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Files over ${APP_LIMITS.maxFileSizeMb} MB are outside the MVP limit.`);
  }
};

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
    setDocument,
    setDetections,
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
    setCustomKeywords,
    setExportJob,
    setPreviewState,
    appendWarning,
    setFallbackExportReady,
    reset,
  } = useReviewStore();

  const clientRef = useRef(getRedactorWorkerClient());
  const [spans, setSpans] = useState<TextSpan[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    const client = clientRef.current;
    const unsubscribe = client.subscribe((message: WorkerResponse) => {
      if (message.type === 'PROGRESS') {
        startTransition(() => setProgress(message.payload));
      }

      if (message.type === 'WARNING') {
        appendWarning(message.payload.message);
      }
    });

    client.init({ baseUrl: import.meta.env.BASE_URL }).catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not initialize the worker runtime.');
    });

    return () => {
      unsubscribe();
    };
  }, [appendWarning]);

  useEffect(() => {
    return () => {
      if (exportJob.downloadUrl) {
        URL.revokeObjectURL(exportJob.downloadUrl);
      }
    };
  }, [exportJob.downloadUrl]);

  const pageSpans = useMemo(() => {
    const map = new Map<number, TextSpan[]>();
    spans.forEach((span) => {
      const existing = map.get(span.pageIndex);
      if (existing) {
        existing.push(span);
      } else {
        map.set(span.pageIndex, [span]);
      }
    });
    return map;
  }, [spans]);

  const combinedItems = useMemo<SidebarItem[]>(() => {
    const manualItems = manualRedactions.map<SidebarItem>((redaction) => ({
      id: redaction.id,
      type: 'manual',
      label: redaction.note || 'Manual redaction',
      source: 'manual',
      status: redaction.status,
      pageIndex: redaction.pageIndex,
      snippet: redaction.snippet || redaction.note || 'Manual box',
      confidence: 1,
      box: redaction.box,
      manual: true,
    }));

    const detectedItems = detections.map<SidebarItem>((detection) => ({
      id: detection.id,
      type: detection.type,
      label: DETECTION_TYPE_LABELS[detection.type],
      source: detection.source,
      status: detection.status,
      pageIndex: detection.pageIndex,
      snippet: detection.snippet,
      confidence: detection.confidence,
      box: detection.box,
      groupId: detection.groupId,
      matchCount: detection.matchCount,
    }));

    return [...detectedItems, ...manualItems];
  }, [detections, manualRedactions]);

  const filteredItems = useMemo(
    () =>
      combinedItems
        .filter((item) => filters.statuses.includes(item.status))
        .filter((item) => filters.sources.includes(item.source))
        .filter((item) => filters.types.includes(item.type))
        .sort((left, right) => {
          if (left.pageIndex !== right.pageIndex) {
            return left.pageIndex - right.pageIndex;
          }
          return detectionSortOrder.indexOf(left.type) - detectionSortOrder.indexOf(right.type);
        }),
    [combinedItems, filters],
  );

  const deferredItems = useDeferredValue(filteredItems);

  const reviewCount =
    detections.filter((detection) => detection.status !== 'rejected').length +
    manualRedactions.filter((redaction) => redaction.status !== 'rejected').length;
  const approvedCount =
    detections.filter((detection) => detection.status === 'approved').length +
    manualRedactions.filter((redaction) => redaction.status === 'approved').length;
  const suggestedCount =
    detections.filter((detection) => detection.status === 'suggested').length;
  const showViewer = Boolean(sourceDocument && pages.length);

  useEffect(() => {
    if (!showViewer) {
      setIsSidebarOpen(false);
    }
  }, [showViewer]);

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
  }, [isSidebarOpen]);

  const runDetections = async (
    keywords: string[],
    existingRuleDetections = detections.filter((detection) => detection.source === 'rule'),
    existingNonRuleDetections = detections.filter((detection) => detection.source !== 'rule'),
    hasLoadedDocument = pages.length > 0,
  ) => {
    setCustomKeywords(keywords);

    if (!hasLoadedDocument) {
      return;
    }

    const response = await clientRef.current.detect({ rules: { keywords } });
    const persistedRules = preserveRuleStatuses(response.payload.items, existingRuleDetections);
    setDetections(dedupeDetections([...persistedRules, ...existingNonRuleDetections]));
  };

  const syncKeywords = async (keywords: string[]) => {
    try {
      await runDetections(keywords);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not update detections.');
    }
  };

  const loadFile = async (selectedFile: File) => {
    setError(null);
    setFallbackExportReady(false);
    if (exportJob.downloadUrl) {
      URL.revokeObjectURL(exportJob.downloadUrl);
    }
    setExportJob({ status: 'idle', completedPages: 0, downloadUrl: undefined, error: undefined, mode: undefined });

    try {
      validateSelectedFile(selectedFile);
      setIsProcessing(true);
      await clientRef.current.reset();
      reset();
      fileRef.current = selectedFile;

      const response = await clientRef.current.loadPdf({
        file: await selectedFile.arrayBuffer(),
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
      });

      setSpans(response.payload.spans);
      setDocument({
        sourceDocument: response.payload.source,
        pages: response.payload.pages,
        detections: [],
        warnings: response.payload.warnings,
      });

      await runDetections(customKeywords, [], [], true);
    } catch (caughtError) {
      fileRef.current = null;
      reset();
      setSpans([]);
      setError(caughtError instanceof Error ? caughtError.message : 'Could not process that PDF.');
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    await loadFile(selectedFile);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      return;
    }
    await loadFile(selectedFile);
  };

  const handleKeywordSubmit = async () => {
    const keyword = keywordDraft.trim();
    if (!keyword || customKeywords.includes(keyword)) {
      setKeywordDraft('');
      return;
    }

    setKeywordDraft('');
    await syncKeywords([...customKeywords, keyword]);
  };

  const handleKeywordRemove = async (keyword: string) => {
    await syncKeywords(customKeywords.filter((entry) => entry !== keyword));
  };

  const handleExport = async (mode: 'true-redaction' | 'flattened') => {
    if (!sourceDocument) {
      return;
    }

    setError(null);
    setExportJob({
      status: 'running',
      completedPages: 0,
      totalPages: sourceDocument.pageCount,
      error: undefined,
      downloadUrl: undefined,
      mode,
    });

    try {
      const response = await clientRef.current.applyRedactions({
        redactions: {
          detections,
          manualRedactions,
          mode,
        },
      });
      const blob = new Blob([response.payload.file], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      setExportJob({
        status: 'done',
        completedPages: sourceDocument.pageCount,
        downloadUrl,
        mode,
      });
      setFallbackExportReady(false);

      const file = fileRef.current;
      if (file) {
        const anchor = document.createElement('a');
        const suffix = mode === 'flattened' ? '-flattened-redacted.pdf' : '-redacted.pdf';
        anchor.href = downloadUrl;
        anchor.download = file.name.replace(/\.pdf$/i, '') + suffix;
        anchor.click();
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Export failed.';
      setExportJob({
        status: 'error',
        error: message,
        mode,
      });
      setError(message);

      if (mode === 'true-redaction') {
        setFallbackExportReady(true);
      }
    }
  };

  const handleSidebarJump = (pageIndex: number) => {
    setActivePage(pageIndex);
    setIsSidebarOpen(false);
    document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetSession = async () => {
    if (exportJob.downloadUrl) {
      URL.revokeObjectURL(exportJob.downloadUrl);
    }
    await clientRef.current.reset();
    reset();
    fileRef.current = null;
    setIsSidebarOpen(false);
    setSpans([]);
    setProgress(null);
    setError(null);
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const ensurePreview = async (pageIndex: number) => {
    const preview = previews[pageIndex];
    if (preview?.status === 'ready' || preview?.status === 'loading') {
      return;
    }

    setPreviewState(pageIndex, { status: 'loading', error: undefined });

    try {
      const response = await clientRef.current.getPagePreview({ pageIndex });
      const url = URL.createObjectURL(new Blob([response.payload.bytes], { type: response.payload.mimeType }));
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
      setPreviewState(pageIndex, { status: 'ready', url });
    } catch (caughtError) {
      setPreviewState(pageIndex, {
        status: 'error',
        error: caughtError instanceof Error ? caughtError.message : 'Could not render preview.',
      });
    }
  };

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header
        className="app-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'color-mix(in oklab, var(--paper) 94%, transparent)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div className="app-header-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth={1.5} />
              <rect x="7" y="10" width="10" height="2.2" fill="currentColor" />
              <rect x="7" y="14" width="6" height="2.2" fill="currentColor" />
            </svg>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, letterSpacing: '-0.01em' }}>Obscura</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          {sourceDocument ? (
            <div className="app-header-doc" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" />
              </svg>
              <span className="app-header-doc-name" style={{ fontSize: 13, color: 'var(--ink)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sourceDocument.name}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                {formatBytes(sourceDocument.size)}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              No document loaded
            </span>
          )}
        </div>
        <div className="app-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
              background: 'color-mix(in oklab, var(--safe) 10%, var(--paper))',
              color: 'var(--safe-ink)',
              border: '1px solid color-mix(in oklab, var(--safe) 25%, var(--line))',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 6v6c0 4.5 3.2 8.3 8 9 4.8-.7 8-4.5 8-9V6l-8-3Z" />
            </svg>
            local only
          </span>
          {showViewer ? (
            <>
              <button
                type="button"
                className="app-mobile-review-trigger"
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  height: 28,
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'var(--surface-1)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                }}
              >
                Review
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{deferredItems.length}</span>
              </button>
              <div className="app-review-summary" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRight: '1px solid var(--line)', height: 28 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  Review
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <span><strong style={{ color: 'var(--ink)' }}>{approvedCount}</strong> <span style={{ color: 'var(--ink-3)' }}>approved</span></span>
                  <span style={{ color: 'var(--line-strong)' }}>·</span>
                  <span><strong style={{ color: 'var(--risk-ink)' }}>{suggestedCount}</strong> <span style={{ color: 'var(--ink-3)' }}>to review</span></span>
                </div>
              </div>
              <button
                type="button"
                disabled={!showViewer || isProcessing}
                onClick={() => handleExport('true-redaction')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  height: 28,
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  cursor: !showViewer || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: !showViewer || isProcessing ? 0.5 : 1,
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: '1px solid var(--ink)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12M6 10l6 6 6-6" /><path d="M4 20h16" />
                </svg>
                Export
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      </header>

      {!showViewer ? (
        <Dropzone fileInputRef={fileInputRef} onDrop={handleDrop} onFileChange={handleFileChange} error={error} progress={progress} />
      ) : (
        <>
          {/* Sub-toolbar */}
          <ReviewToolbar
            canExport={Boolean(showViewer && !isProcessing)}
            canFallbackExport={fallbackExportReady && !isProcessing}
            drawMode={drawMode}
            onOpenReview={() => setIsSidebarOpen(true)}
            onExport={() => handleExport('true-redaction')}
            onFallbackExport={() => handleExport('flattened')}
            onReset={resetSession}
            onToggleDrawMode={() => setDrawMode(!drawMode)}
            processing={isProcessing}
            reviewCount={reviewCount}
            zoom={zoom}
            onZoomChange={setZoom}
            downloadUrl={exportJob.downloadUrl}
            pageCount={pages.length}
            activePage={activePage}
            onActivatePage={(i) => {
              setActivePage(i);
              document.getElementById(`page-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />

          {/* Main grid */}
          <div
            className="app-main-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: 0,
              flex: 1,
              minHeight: 0,
            }}
          >
            <button
              type="button"
              aria-label="Close review panel"
              className="review-sidebar-backdrop"
              data-open={isSidebarOpen}
              onClick={() => setIsSidebarOpen(false)}
              style={{ border: 'none', padding: 0, cursor: 'pointer' }}
            />
            {/* Pages column */}
            <div
              className="app-viewer-column"
              style={{
                padding: '28px 40px 120px',
                overflow: 'auto',
                background: 'color-mix(in oklab, var(--paper) 96%, var(--ink))',
                borderRight: '1px solid var(--line)',
              }}
            >
              <div
                className="app-viewer-inner"
                style={{
                  maxWidth: 780 * zoom,
                  margin: '0 auto',
                }}
              >
                <PdfViewer
                  pages={pages}
                  activePage={activePage}
                  zoom={zoom}
                  drawMode={drawMode}
                  previews={previews}
                  spansByPage={pageSpans}
                  detections={detections}
                  manualRedactions={manualRedactions}
                  onActivatePage={setActivePage}
                  onEnsurePreview={ensurePreview}
                  onCreateManual={(pageIndex, payload) => addManualRedaction({ pageIndex, ...payload })}
                  onUpdateManual={updateManualRedaction}
                  onRemoveManual={removeManualRedaction}
                  onToggleDetection={toggleDetectionStatus}
                  onSetManualStatus={setManualStatus}
                />
              </div>
            </div>

            {/* Sidebar */}
            <DetectionSidebar
              mobileOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              progress={progress}
              warnings={warnings}
              error={error}
              draft={keywordDraft}
              keywords={customKeywords}
              onDraftChange={setKeywordDraft}
              onAddKeyword={handleKeywordSubmit}
              onRemoveKeyword={handleKeywordRemove}
              filters={filters}
              onChangeFilters={setFilters}
              onApproveGroup={approveGroup}
              onApproveDetection={(id) => setDetectionStatus(id, 'approved')}
              onRejectDetection={(id) => setDetectionStatus(id, 'rejected')}
              onToggleDetection={toggleDetectionStatus}
              onToggleManualStatus={(id, status) => setManualStatus(id, status)}
              onDeleteManual={removeManualRedaction}
              onJumpToPage={handleSidebarJump}
              items={deferredItems}
            />
          </div>
        </>
      )}
    </div>
  );
}
