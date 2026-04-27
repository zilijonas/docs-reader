import type { ChangeEvent, DragEvent, MutableRefObject } from 'react';
import { useRef } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/app-config';
import type { ExportJob, OcrLanguageDetection, ProcessingProgress, TextSpan } from '../../../types';
import type { RedactorWorkerClient } from '../../../lib/worker-client';
import { validateSelectedFile } from '../fileValidation';

export function useFileUpload({
  clientRef,
  customKeywords,
  openOcrLanguageModal,
  resetReviewStore,
  resetWorkflowUi,
  setDocument,
  setError,
  setExportJob,
  setFallbackExportReady,
  setIsProcessing,
  setProgress,
  setOcrLanguageDetection,
  setSelectedOcrLanguages,
  setSpans,
}: {
  clientRef: MutableRefObject<RedactorWorkerClient>;
  customKeywords: string[];
  openOcrLanguageModal: () => void;
  resetReviewStore: () => void;
  resetWorkflowUi: () => void;
  setDocument: (payload: {
    sourceDocument: import('../../../types').SourceDocument;
    pages: import('../../../types').PageAsset[];
    detections: import('../../../types').Detection[];
    warnings: string[];
  }) => void;
  setError: (message: string | null) => void;
  setExportJob: (payload: ExportJob) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setProgress: (progress: ProcessingProgress | null) => void;
  setOcrLanguageDetection: (detection: OcrLanguageDetection | null) => void;
  setSelectedOcrLanguages: (languages: string[]) => void;
  setSpans: (spans: TextSpan[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

  const loadFile = async (selectedFile: File) => {
    setError(null);
    setFallbackExportReady(false);
    setExportJob({ status: 'idle' });

    try {
      validateSelectedFile(selectedFile);
      setIsProcessing(true);
      setSelectedOcrLanguages([...DEFAULT_OCR_LANGUAGES]);
      await clientRef.current.reset();
      resetReviewStore();
      resetWorkflowUi();
      fileRef.current = selectedFile;

      const response = await clientRef.current.loadPdf({
        file: await selectedFile.arrayBuffer(),
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
      });

      const nextOcrLanguages =
        Array.isArray(response.payload.ocrLanguages) && response.payload.ocrLanguages.length > 0
          ? response.payload.ocrLanguages
          : [...DEFAULT_OCR_LANGUAGES];
      const nextSpans = Array.isArray(response.payload.spans) ? response.payload.spans : [];
      const nextPages = Array.isArray(response.payload.pages) ? response.payload.pages : [];
      const nextWarnings = Array.isArray(response.payload.warnings)
        ? response.payload.warnings
        : [];

      setSelectedOcrLanguages(nextOcrLanguages);
      setOcrLanguageDetection(response.payload.ocrLanguageDetection);

      if (response.payload.needsOcrLanguageSelection) {
        setProgress(null);
        openOcrLanguageModal();
      } else {
        setSpans(nextSpans);

        let initialDetections: import('../../../types').Detection[] = [];
        if (response.payload.ocrCompleted) {
          try {
            const detectResponse = await clientRef.current.detect({
              rules: { keywords: customKeywords },
            });
            initialDetections = detectResponse.payload.items;
          } catch (detectError) {
            console.warn('Initial detection failed.', detectError);
          }
        }

        setDocument({
          sourceDocument: response.payload.source,
          pages: nextPages,
          detections: initialDetections,
          warnings: nextWarnings,
        });
        setProgress(null);
      }
    } catch (caughtError) {
      fileRef.current = null;
      resetReviewStore();
      resetWorkflowUi();
      setSpans([]);
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

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      return;
    }

    await loadFile(selectedFile);
  };

  return {
    fileInputRef,
    fileRef,
    handleDrop,
    handleFileChange,
  };
}
