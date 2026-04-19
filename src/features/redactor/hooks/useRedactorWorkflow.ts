import type { ChangeEvent, DragEvent } from 'react';
import { startTransition, useEffect, useRef, useState } from 'react';

import { dedupeDetections } from '../../../lib/utils';
import { getRedactorWorkerClient } from '../../../lib/worker-client';
import type { Detection, ExportMode, ProcessingProgress, TextSpan, WorkerResponse } from '../../../lib/types';
import { useReviewStore } from '../../../store/reviewStore';
import { preserveRuleStatuses } from '../review-helpers';
import { validateSelectedFile } from '../fileValidation';

export function useRedactorWorkflow() {
  const {
    sourceDocument,
    pages,
    detections,
    manualRedactions,
    customKeywords,
    previews,
    exportJob,
    setDocument,
    setDetections,
    setActivePage,
    setExportJob,
    setPreviewState,
    appendWarning,
    setFallbackExportReady,
    setCustomKeywords,
    reset,
  } = useReviewStore();

  const clientRef = useRef(getRedactorWorkerClient());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

  const [spans, setSpans] = useState<TextSpan[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    client
      .init({ baseUrl: import.meta.env.BASE_URL })
      .then(() => {
        startTransition(() =>
          setProgress((currentProgress) => (currentProgress?.phase === 'booting' ? null : currentProgress)),
        );
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Could not initialize the worker runtime.');
      });

    return unsubscribe;
  }, [appendWarning]);

  useEffect(() => {
    return () => {
      if (exportJob.downloadUrl) {
        URL.revokeObjectURL(exportJob.downloadUrl);
      }
    };
  }, [exportJob.downloadUrl]);

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
    const persistedRuleDetections = preserveRuleStatuses(response.payload.items, existingRuleDetections);
    setDetections(dedupeDetections([...persistedRuleDetections, ...existingNonRuleDetections]));
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
    const nextKeyword = keywordDraft.trim();
    if (!nextKeyword || customKeywords.includes(nextKeyword)) {
      setKeywordDraft('');
      return;
    }

    setKeywordDraft('');
    await syncKeywords([...customKeywords, nextKeyword]);
  };

  const handleKeywordRemove = async (keyword: string) => {
    await syncKeywords(customKeywords.filter((entry) => entry !== keyword));
  };

  const handleExport = async (mode: ExportMode) => {
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

      const loadedFile = fileRef.current;
      if (loadedFile) {
        const anchor = document.createElement('a');
        const suffix = mode === 'flattened' ? '-flattened-redacted.pdf' : '-redacted.pdf';
        anchor.href = downloadUrl;
        anchor.download = loadedFile.name.replace(/\.pdf$/i, '') + suffix;
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
    const existingPreview = previews[pageIndex];
    if (existingPreview?.status === 'ready' || existingPreview?.status === 'loading') {
      return;
    }

    setPreviewState(pageIndex, { status: 'loading', error: undefined });

    try {
      const response = await clientRef.current.getPagePreview({ pageIndex });
      const previewUrl = URL.createObjectURL(new Blob([response.payload.bytes], { type: response.payload.mimeType }));

      if (existingPreview?.url) {
        URL.revokeObjectURL(existingPreview.url);
      }

      setPreviewState(pageIndex, { status: 'ready', url: previewUrl });
    } catch (caughtError) {
      setPreviewState(pageIndex, {
        status: 'error',
        error: caughtError instanceof Error ? caughtError.message : 'Could not render preview.',
      });
    }
  };

  const handleSidebarJump = (pageIndex: number) => {
    setActivePage(pageIndex);
    setIsSidebarOpen(false);
    document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return {
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
    pages,
    progress,
    resetSession,
    setError,
    setIsSidebarOpen,
    setKeywordDraft,
    setZoom,
    spans,
    ensurePreview,
    zoom,
  };
}
