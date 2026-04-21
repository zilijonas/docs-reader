import { createContext, useContext, useDeferredValue, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import type {
  BoundingBox,
  Detection,
  DetectionStatus,
  FilterState,
  ManualMode,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  SourceDocument,
} from '../../../types';
import { useReviewStore } from '../../../store/reviewStore';
import { PRIMARY_EXPORT_MODE } from '../config';
import { useRedactorReviewModel } from '../hooks/useRedactorReviewModel';
import { useWorkflowContext } from './WorkflowContext';

interface ReviewContextValue {
  activePage: number;
  addManualRedaction: (payload: {
    pageIndex: number;
    box: BoundingBox;
    mode: ManualMode;
    snippet?: string;
    note?: string;
  }) => void;
  canRedo: boolean;
  clearPendingManualRedactions: () => void;
  confirmAll: () => void;
  confirmedCount: number;
  customKeywords: string[];
  deferredReviewItems: ReturnType<typeof useRedactorReviewModel>['filteredReviewItems'];
  detections: Detection[];
  filters: FilterState;
  handleConfirmAllExport: () => void;
  handleConfirmReset: () => void;
  handlePrimaryExport: () => void;
  handleResetRequest: () => void;
  hasViewer: boolean;
  manualRedactions: ManualRedaction[];
  pages: PageAsset[];
  previews: Record<number, PreviewAsset>;
  redoLastChange: () => void;
  removeManualRedaction: (id: string) => void;
  revertAll: () => void;
  reviewCounts: ReturnType<typeof useRedactorReviewModel>['reviewCounts'];
  setActivePage: (pageIndex: number) => void;
  setDetectionStatus: (id: string, status: DetectionStatus) => void;
  setFilters: (next: Partial<FilterState>) => void;
  setManualStatus: (id: string, status: DetectionStatus) => void;
  setSourceDocumentName: (name: string) => void;
  setToolMode: (mode: 'select' | 'draw' | null) => void;
  sourceDocument: SourceDocument | null;
  spansByPage: ReturnType<typeof useRedactorReviewModel>['spansByPage'];
  toggleDetectionStatus: (id: string) => void;
  toolMode: 'select' | 'draw' | null;
  totalReviewItemCount: number;
  unconfirmedCount: number;
  updateManualRedaction: (id: string, box: BoundingBox) => void;
  warnings: string[];
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: PropsWithChildren) {
  const store = useReviewStore();
  const workflow = useWorkflowContext();
  const { filteredReviewItems, reviewCounts, spansByPage } = useRedactorReviewModel({
    detections: store.detections,
    manualRedactions: store.manualRedactions,
    filters: store.filters,
    spans: workflow.spans,
  });

  const deferredReviewItems = useDeferredValue(filteredReviewItems);
  const hasViewer = Boolean(store.sourceDocument && store.pages.length);
  const totalReviewItemCount = reviewCounts.reviewCount;

  const handlePrimaryExport = () => {
    if (reviewCounts.confirmedCount === 0 && reviewCounts.unconfirmedCount > 0) {
      workflow.openConfirmAllExportModal();
      return;
    }

    void workflow.handleExport(PRIMARY_EXPORT_MODE);
  };

  const handleResetRequest = () => {
    workflow.openResetConfirmModal();
  };

  const handleConfirmReset = () => {
    workflow.closeResetConfirmModal();
    void workflow.resetSession();
  };

  const handleConfirmAllExport = () => {
    workflow.closeConfirmAllExportModal();
    void workflow.handleExport(PRIMARY_EXPORT_MODE, { confirmAllUnconfirmed: true });
  };

  const value = useMemo<ReviewContextValue>(
    () => ({
      activePage: store.activePage,
      addManualRedaction: store.addManualRedaction,
      canRedo: store.canRedo,
      clearPendingManualRedactions: store.clearPendingManualRedactions,
      confirmAll: store.confirmAll,
      confirmedCount: reviewCounts.confirmedCount,
      customKeywords: store.customKeywords,
      deferredReviewItems,
      detections: store.detections,
      filters: store.filters,
      handleConfirmAllExport,
      handleConfirmReset,
      handlePrimaryExport,
      handleResetRequest,
      hasViewer,
      manualRedactions: store.manualRedactions,
      pages: store.pages,
      previews: store.previews,
      redoLastChange: store.redoLastChange,
      removeManualRedaction: store.removeManualRedaction,
      revertAll: store.revertAll,
      reviewCounts,
      setActivePage: store.setActivePage,
      setDetectionStatus: store.setDetectionStatus,
      setFilters: store.setFilters,
      setManualStatus: store.setManualStatus,
      setSourceDocumentName: store.setSourceDocumentName,
      setToolMode: store.setToolMode,
      sourceDocument: store.sourceDocument,
      spansByPage,
      toggleDetectionStatus: store.toggleDetectionStatus,
      toolMode: store.toolMode,
      totalReviewItemCount,
      unconfirmedCount: reviewCounts.unconfirmedCount,
      updateManualRedaction: store.updateManualRedaction,
      warnings: store.warnings,
    }),
    [deferredReviewItems, handleConfirmAllExport, handleConfirmReset, handlePrimaryExport, handleResetRequest, hasViewer, reviewCounts, spansByPage, store],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviewContext() {
  const context = useContext(ReviewContext);

  if (!context) {
    throw new Error('useReviewContext must be used within a ReviewProvider.');
  }

  return context;
}
