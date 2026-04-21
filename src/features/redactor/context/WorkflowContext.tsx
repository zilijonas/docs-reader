import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent, PropsWithChildren, RefObject } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/constants';
import type { ExportMode, ProcessingProgress, TextSpan } from '../../../lib/types';
import { useReviewStore } from '../../../store/reviewStore';
import { useDetectionRunner } from '../hooks/useDetectionRunner';
import { useExportRunner } from '../hooks/useExportRunner';
import { useFileUpload } from '../hooks/useFileUpload';
import { usePreviewCache } from '../hooks/usePreviewCache';
import { useScrollNavigation } from '../hooks/useScrollNavigation';
import { useUiState } from '../hooks/useUiState';
import { useViewportMode } from '../hooks/useViewportMode';
import { useWorkerClient } from '../hooks/useWorkerClient';

interface WorkflowContextValue {
  appHeaderHeight: number;
  appHeaderRef: RefObject<HTMLElement | null>;
  appShellRef: RefObject<HTMLDivElement | null>;
  closeConfirmAllExportModal: () => void;
  closeOcrLanguageModal: () => void;
  closeResetConfirmModal: () => void;
  closeReviewPanel: () => void;
  ensurePreview: (pageIndex: number) => Promise<void>;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleContinueOcr: () => Promise<void>;
  handleDrop: (event: DragEvent<HTMLLabelElement>) => Promise<void>;
  handleExport: (mode: ExportMode, options?: { confirmAllUnconfirmed?: boolean }) => Promise<void>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleKeywordRemove: (keyword: string) => Promise<void>;
  handleKeywordSubmit: () => Promise<void>;
  isDesktopSidebarOpen: boolean;
  isMobileViewport: boolean;
  isOcrLanguageModalOpen: boolean;
  isProcessing: boolean;
  isSidebarOpen: boolean;
  keywordDraft: string;
  openConfirmAllExportModal: () => void;
  openResetConfirmModal: () => void;
  progress: ProcessingProgress | null;
  resetSession: () => Promise<void>;
  scrollToPage: (pageIndex: number) => void;
  scrollToReviewItem: (itemId: string, pageIndex: number) => void;
  selectedOcrLanguages: string[];
  setDesktopSidebarOpen: (value: boolean) => void;
  setKeywordDraft: (value: string) => void;
  setReviewPanelOpen: (value: boolean) => void;
  setSelectedOcrLanguages: (languages: string[]) => void;
  setZoom: (value: number) => void;
  showConfirmAllExportModal: boolean;
  showResetConfirmModal: boolean;
  spans: TextSpan[];
  toggleReviewPanel: () => void;
  viewerColumnRef: RefObject<HTMLDivElement | null>;
  viewerContentWidth: number;
  zoom: number;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: PropsWithChildren) {
  const {
    customKeywords,
    detections,
    exportJob,
    manualRedactions,
    pages,
    previews,
    sourceDocument,
    appendWarning,
    reset,
    setActivePage,
    setCustomKeywords,
    setDetections,
    setDocument,
    setExportJob,
    setFallbackExportReady,
    setPreviewState,
  } = useReviewStore();

  const [spans, setSpans] = useState<TextSpan[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    closeConfirmAllExportModal,
    closeOcrLanguageModal,
    closeResetConfirmModal,
    closeReviewPanel,
    openConfirmAllExportModal,
    openOcrLanguageModal,
    openResetConfirmModal,
    resetWorkflowUi,
    setAppHeaderHeight,
    setDesktopSidebarOpen,
    setKeywordDraft,
    setMobileViewport,
    setReviewPanelOpen,
    setSelectedOcrLanguages,
    setViewerContentWidth,
    setZoom,
    state,
    toggleReviewPanel,
  } = useUiState();

  const hasViewer = Boolean(sourceDocument && pages.length);

  const clientRef = useWorkerClient({
    onInitError: setError,
    onProgress: setProgress,
    onWarning: appendWarning,
  });

  const { runDetections, syncKeywords } = useDetectionRunner({
    clientRef,
    detections,
    hasLoadedDocument: pages.length > 0,
    setCustomKeywords,
    setDetections,
    setError,
    setProgress,
  });

  const { fileInputRef, fileRef, handleDrop, handleFileChange } = useFileUpload({
    clientRef,
    customKeywords,
    exportJob,
    openOcrLanguageModal,
    resetReviewStore: reset,
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
  });

  const { ensurePreview } = usePreviewCache({
    clientRef,
    previews,
    setPreviewState,
  });

  const { handleExport } = useExportRunner({
    clientRef,
    detections,
    fileRef,
    manualRedactions,
    setError,
    setExportJob,
    setFallbackExportReady,
    setProgress,
    sourceDocument,
  });

  const { appHeaderRef, appShellRef, scrollToPage, scrollToReviewItem, viewerColumnRef } = useScrollNavigation({
    appHeaderHeight: state.appHeaderHeight,
    hasViewer,
    isMobileViewport: state.isMobileViewport,
    isSidebarOpen: state.isSidebarOpen,
    setActivePage,
    setAppHeaderHeight,
    setReviewPanelOpen,
    setViewerContentWidth,
    setZoom,
    zoom: state.zoom,
  });

  useViewportMode(setMobileViewport);

  useEffect(() => {
    if (!hasViewer) {
      closeReviewPanel();
      return;
    }

    setDesktopSidebarOpen(true);
  }, [closeReviewPanel, hasViewer, setDesktopSidebarOpen]);

  useEffect(() => {
    return () => {
      if (exportJob.downloadUrl) {
        URL.revokeObjectURL(exportJob.downloadUrl);
      }
    };
  }, [exportJob.downloadUrl]);

  const handleKeywordSubmit = async () => {
    const nextKeyword = state.keywordDraft.trim();
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
    closeOcrLanguageModal();
    setIsProcessing(true);
    setProgress({ phase: 'ocr', progress: 0.3, message: 'Starting OCR…' });

    try {
      const response = await clientRef.current.continueOcr({
        ocrLanguages: state.selectedOcrLanguages,
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

  const resetSession = async () => {
    if (exportJob.downloadUrl) {
      URL.revokeObjectURL(exportJob.downloadUrl);
    }

    await clientRef.current.reset();
    reset();
    fileRef.current = null;
    resetWorkflowUi();
    setSpans([]);
    setProgress(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const value = useMemo<WorkflowContextValue>(
    () => ({
      appHeaderHeight: state.appHeaderHeight,
      appHeaderRef,
      appShellRef,
      closeConfirmAllExportModal,
      closeOcrLanguageModal,
      closeResetConfirmModal,
      closeReviewPanel,
      ensurePreview,
      error,
      fileInputRef,
      handleContinueOcr,
      handleDrop,
      handleExport,
      handleFileChange,
      handleKeywordRemove,
      handleKeywordSubmit,
      isDesktopSidebarOpen: state.isDesktopSidebarOpen,
      isMobileViewport: state.isMobileViewport,
      isOcrLanguageModalOpen: state.isOcrLanguageModalOpen,
      isProcessing,
      isSidebarOpen: state.isSidebarOpen,
      keywordDraft: state.keywordDraft,
      openConfirmAllExportModal,
      openResetConfirmModal,
      progress,
      resetSession,
      scrollToPage,
      scrollToReviewItem,
      selectedOcrLanguages: state.selectedOcrLanguages,
      setDesktopSidebarOpen,
      setKeywordDraft,
      setReviewPanelOpen,
      setSelectedOcrLanguages,
      setZoom,
      showConfirmAllExportModal: state.showConfirmAllExportModal,
      showResetConfirmModal: state.showResetConfirmModal,
      spans,
      toggleReviewPanel,
      viewerColumnRef,
      viewerContentWidth: state.viewerContentWidth,
      zoom: state.zoom,
    }),
    [
      appHeaderRef,
      appShellRef,
      closeConfirmAllExportModal,
      closeOcrLanguageModal,
      closeResetConfirmModal,
      closeReviewPanel,
      ensurePreview,
      error,
      fileInputRef,
      handleContinueOcr,
      handleDrop,
      handleExport,
      handleFileChange,
      handleKeywordRemove,
      handleKeywordSubmit,
      isProcessing,
      openConfirmAllExportModal,
      openResetConfirmModal,
      progress,
      resetSession,
      scrollToPage,
      scrollToReviewItem,
      setDesktopSidebarOpen,
      setKeywordDraft,
      setReviewPanelOpen,
      setSelectedOcrLanguages,
      setZoom,
      spans,
      state.isDesktopSidebarOpen,
      state.appHeaderHeight,
      state.isMobileViewport,
      state.isOcrLanguageModalOpen,
      state.isSidebarOpen,
      state.keywordDraft,
      state.selectedOcrLanguages,
      state.showConfirmAllExportModal,
      state.showResetConfirmModal,
      state.viewerContentWidth,
      state.zoom,
      toggleReviewPanel,
      viewerColumnRef,
    ],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);

  if (!context) {
    throw new Error('useWorkflowContext must be used within a WorkflowProvider.');
  }

  return context;
}

export type { WorkflowContextValue };
