import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { APP_LIMITS, DETECTION_TYPE_LABELS, FILE_ACCEPT, PRIVACY_PROMISE } from '../../lib/constants';
import { getRedactorWorkerClient } from '../../lib/worker-client';
import type {
  Detection,
  DetectionSource,
  DetectionStatus,
  DetectionType,
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

const toggleFilterValue = <T extends string>(list: T[], value: T, fallback: T[]) => {
  const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
  return next.length ? next : fallback;
};

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
    rejectPage,
    clearManualPage,
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
  const showViewer = Boolean(sourceDocument && pages.length);

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
    document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetSession = async () => {
    if (exportJob.downloadUrl) {
      URL.revokeObjectURL(exportJob.downloadUrl);
    }
    await clientRef.current.reset();
    reset();
    fileRef.current = null;
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 px-4 py-5 text-stone-900 lg:px-6">
      <section className="glass-panel overflow-hidden rounded-[2rem] border border-white/60 shadow-[0_28px_80px_rgba(44,38,25,0.12)]">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.85fr] lg:px-8">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-[#cb8b63]/50 bg-[#fff5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a24]">
              True PDF redaction in the browser
            </span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                Review, redact, and export PDFs without sending them anywhere.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-stone-700 sm:text-lg">
                Searchable pages stay on the native text lane. Scanned pages fall back to OCR. Everything heavy runs in a
                worker so the review UI stays responsive.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatCard label="Local-only pipeline" value="100%" />
              <StatCard label="MVP file cap" value={`${APP_LIMITS.maxFileSizeMb} MB`} />
              <StatCard label="Page cap" value={`${APP_LIMITS.maxPages} pages`} />
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.75rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(252,248,240,0.94))] p-5">
            {PRIVACY_PROMISE.map((line) => (
              <div key={line} className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-stone-700">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#286f69]" />
                <p>{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ReviewToolbar
            canExport={Boolean(showViewer && !isProcessing)}
            canFallbackExport={fallbackExportReady && !isProcessing}
            drawMode={drawMode}
            onExport={() => handleExport('true-redaction')}
            onFallbackExport={() => handleExport('flattened')}
            onReset={resetSession}
            onToggleDrawMode={() => setDrawMode(!drawMode)}
            processing={isProcessing}
            reviewCount={reviewCount}
            approvedCount={approvedCount}
            zoom={zoom}
            onZoomChange={setZoom}
            downloadUrl={exportJob.downloadUrl}
          />

          {!showViewer ? (
            <Dropzone fileInputRef={fileInputRef} onDrop={handleDrop} onFileChange={handleFileChange} error={error} progress={progress} />
          ) : (
            <>
              <div className="glass-panel rounded-[2rem] border border-white/70 p-4 shadow-[0_16px_50px_rgba(53,43,23,0.12)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 pb-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">Current document</p>
                    <h2 className="text-xl font-semibold text-stone-900">{sourceDocument?.name}</h2>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-stone-600">
                    <span className="rounded-full bg-stone-100 px-3 py-1">{formatBytes(sourceDocument?.size ?? 0)}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1">{sourceDocument?.pageCount} pages</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1">{manualRedactions.length} manual edits</span>
                  </div>
                </div>

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
            </>
          )}
        </div>

        <DetectionSidebar
          progress={progress}
          exportJob={exportJob}
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
          onRejectPage={() => rejectPage(activePage)}
          onClearManualPage={() => clearManualPage(activePage)}
          items={deferredItems}
        />
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/70 bg-white/70 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}
