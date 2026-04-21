import type { ChangeEvent, DragEvent } from 'react';
import { startTransition, useEffect, useRef, useState } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/constants';
import { dedupeDetections } from '../../../lib/utils';
import { getRedactorWorkerClient } from '../../../lib/worker-client';
import type { ExportMode, ProcessingProgress, TextSpan, WorkerResponse } from '../../../lib/types';
import { useReviewStore } from '../../../store/reviewStore';
import { EXPORT_MODE_META, PRIMARY_EXPORT_MODE, REDACTOR_UI, getPageAnchorId } from '../config';
import { preserveRuleStatuses } from '../review-helpers';
import { validateSelectedFile } from '../fileValidation';

const triggerAnchorDownload = (blob: Blob, fileName: string) => {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};

const writeBlobToFile = async (blob: Blob, fileName: string) => {
  const windowWithSavePicker = window as Window & typeof globalThis & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (windowWithSavePicker.showSaveFilePicker) {
    try {
      const handle = await windowWithSavePicker.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === 'AbortError') {
        return;
      }
      console.warn('showSaveFilePicker failed, falling back to download anchor.', pickerError);
    }
  }

  triggerAnchorDownload(blob, fileName);
};

const buildExportFileName = (documentName: string, suffix: string) => {
  const trimmedName = documentName.trim();
  const safeName = trimmedName.length > 0 ? trimmedName : 'document.pdf';
  const hasPdfExtension = /\.pdf$/i.test(safeName);
  const baseName = hasPdfExtension ? safeName.replace(/\.pdf$/i, '') : safeName;

  return `${baseName}${suffix}`;
};

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
    setSourceDocumentName,
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
  const [zoom, setZoom] = useState<number>(REDACTOR_UI.defaultZoom);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOcrLanguageModalOpen, setIsOcrLanguageModalOpen] = useState(false);
  const [selectedOcrLanguages, setSelectedOcrLanguages] = useState<string[]>([...DEFAULT_OCR_LANGUAGES]);

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

    try {
      const response = await clientRef.current.detect({ rules: { keywords } });
      const persistedRuleDetections = preserveRuleStatuses(response.payload.items, existingRuleDetections);
      setDetections(dedupeDetections([...persistedRuleDetections, ...existingNonRuleDetections]));
    } finally {
      setProgress(null);
    }
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
      setIsOcrLanguageModalOpen(false);
      setSelectedOcrLanguages([...DEFAULT_OCR_LANGUAGES]);
      await clientRef.current.reset();
      reset();
      fileRef.current = selectedFile;

      const response = await clientRef.current.loadPdf({
        file: await selectedFile.arrayBuffer(),
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
      });

      setSelectedOcrLanguages(
        response.payload.ocrLanguages.length > 0 ? response.payload.ocrLanguages : [...DEFAULT_OCR_LANGUAGES],
      );

      if (response.payload.needsOcrLanguageSelection) {
        // Defer committing the document to the store until OCR finishes so the
        // viewer doesn't mount behind the language modal.
        setProgress(null);
        setIsOcrLanguageModalOpen(true);
      } else {
        setSpans(response.payload.spans);
        setDocument({
          sourceDocument: response.payload.source,
          pages: response.payload.pages,
          detections: [],
          warnings: response.payload.warnings,
        });

        if (response.payload.ocrCompleted) {
          await runDetections(customKeywords, [], [], true);
        }
      }
    } catch (caughtError) {
      fileRef.current = null;
      reset();
      setSpans([]);
      setIsOcrLanguageModalOpen(false);
      setSelectedOcrLanguages([...DEFAULT_OCR_LANGUAGES]);
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

  const handleContinueOcr = async () => {
    setError(null);
    // Close the modal immediately so the dropzone loader (isProcessing) is
    // visible while Tesseract works — otherwise the modal sits frozen for the
    // duration of OCR and the viewer only appears at the very end.
    setIsOcrLanguageModalOpen(false);
    setIsProcessing(true);
    setProgress({ phase: 'ocr', progress: 0.3, message: 'Starting OCR…' });

    try {
      const response = await clientRef.current.continueOcr({
        ocrLanguages: selectedOcrLanguages,
      });

      setSpans(response.payload.spans);
      setDocument({
        sourceDocument: response.payload.source,
        pages: response.payload.pages,
        detections: [],
        warnings: response.payload.warnings,
      });
      setSelectedOcrLanguages(response.payload.ocrLanguages);

      await runDetections(customKeywords, [], [], true);
    } catch (caughtError) {
      setProgress(null);
      setError(caughtError instanceof Error ? caughtError.message : 'Could not finish OCR.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (mode: ExportMode, options?: { confirmAllUnconfirmed?: boolean }) => {
    if (!sourceDocument) {
      return;
    }

    const exportDetections = options?.confirmAllUnconfirmed
      ? detections.map((detection) =>
          detection.status === 'unconfirmed' ? { ...detection, status: 'confirmed' as const } : detection,
        )
      : detections;
    const exportManualRedactions = options?.confirmAllUnconfirmed
      ? manualRedactions.map((redaction) =>
          redaction.status === 'unconfirmed' ? { ...redaction, status: 'confirmed' as const } : redaction,
        )
      : manualRedactions;

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
          detections: exportDetections,
          manualRedactions: exportManualRedactions,
          mode,
        },
      });
      const blob = new Blob([response.payload.file], { type: 'application/pdf' });

      setExportJob({
        status: 'done',
        completedPages: sourceDocument.pageCount,
        downloadUrl: undefined,
        mode,
      });
      setFallbackExportReady(false);

      const loadedFile = fileRef.current;
      const exportFileName = buildExportFileName(
        sourceDocument.name || loadedFile?.name || 'document.pdf',
        EXPORT_MODE_META[mode].filenameSuffix,
      );
      await writeBlobToFile(blob, exportFileName);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Export failed.';
      setExportJob({
        status: 'error',
        error: message,
        mode,
      });
      setError(message);

      if (mode === PRIMARY_EXPORT_MODE) {
        setFallbackExportReady(true);
      }
    } finally {
      setProgress(null);
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
    setIsOcrLanguageModalOpen(false);
    setSelectedOcrLanguages([...DEFAULT_OCR_LANGUAGES]);
    setSpans([]);
    setProgress(null);
    setError(null);
    setZoom(REDACTOR_UI.defaultZoom);

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
    document.getElementById(getPageAnchorId(pageIndex))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    handleContinueOcr,
    isProcessing,
    isOcrLanguageModalOpen,
    isSidebarOpen,
    keywordDraft,
    pages,
    progress,
    resetSession,
    setError,
    setIsSidebarOpen,
    setKeywordDraft,
    setIsOcrLanguageModalOpen,
    setSelectedOcrLanguages,
    setSourceDocumentName,
    selectedOcrLanguages,
    setZoom,
    spans,
    ensurePreview,
    zoom,
  };
}
