import type { ChangeEvent, DragEvent, MutableRefObject } from 'react';
import { useRef } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/constants';
import type { ExportJob, ProcessingProgress, TextSpan } from '../../../lib/types';
import type { RedactorWorkerClient } from '../../../lib/worker-client';
import { validateSelectedFile } from '../fileValidation';

export function useFileUpload({
  clientRef,
  customKeywords,
  exportJob,
  openOcrLanguageModal,
  resetReviewStore,
  resetWorkflowUi,
  runDetections,
  setDocument,
  setError,
  setExportJob,
  setFallbackExportReady,
  setIsProcessing,
  setProgress,
  setSelectedOcrLanguages,
  setSpans,
}: {
  clientRef: MutableRefObject<RedactorWorkerClient>;
  customKeywords: string[];
  exportJob: ExportJob;
  openOcrLanguageModal: () => void;
  resetReviewStore: () => void;
  resetWorkflowUi: () => void;
  runDetections: (
    keywords: string[],
    existingRuleDetections?: import('../../../lib/types').Detection[],
    existingNonRuleDetections?: import('../../../lib/types').Detection[],
    hasLoadedDocumentOverride?: boolean,
  ) => Promise<void>;
  setDocument: (payload: {
    sourceDocument: import('../../../lib/types').SourceDocument;
    pages: import('../../../lib/types').PageAsset[];
    detections: import('../../../lib/types').Detection[];
    warnings: string[];
  }) => void;
  setError: (message: string | null) => void;
  setExportJob: (payload: Partial<ExportJob>) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setProgress: (progress: ProcessingProgress | null) => void;
  setSelectedOcrLanguages: (languages: string[]) => void;
  setSpans: (spans: TextSpan[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

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

      setSelectedOcrLanguages(
        response.payload.ocrLanguages.length > 0 ? response.payload.ocrLanguages : [...DEFAULT_OCR_LANGUAGES],
      );

      if (response.payload.needsOcrLanguageSelection) {
        setProgress(null);
        openOcrLanguageModal();
      } else {
        setSpans(response.payload.spans);
        setDocument({
          sourceDocument: response.payload.source,
          pages: response.payload.pages,
          detections: [],
          warnings: response.payload.warnings,
        });

        if (response.payload.ocrCompleted) {
          await runDetections(customKeywords, [], []);
        }
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

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
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
