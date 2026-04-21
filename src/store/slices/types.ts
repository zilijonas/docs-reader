import type { StateCreator } from 'zustand';

import type {
  Detection,
  DetectionStatus,
  ExportJob,
  FilterState,
  ManualMode,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  SourceDocument,
} from '../../types';

export interface ReviewSnapshot {
  detections: Detection[];
  manualRedactions: ManualRedaction[];
}

export interface ReviewStoreState {
  sourceDocument: SourceDocument | null;
  pages: PageAsset[];
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  customKeywords: string[];
  filters: FilterState;
  previews: Record<number, PreviewAsset>;
  activePage: number;
  toolMode: 'select' | 'draw' | null;
  canRedo: boolean;
  exportJob: ExportJob;
  warnings: string[];
  fallbackExportReady: boolean;
  redoHistory: ReviewSnapshot[];
  setDocument: (payload: {
    sourceDocument: SourceDocument;
    pages: PageAsset[];
    detections: Detection[];
    warnings: string[];
  }) => void;
  setSourceDocumentName: (name: string) => void;
  setDetections: (detections: Detection[]) => void;
  setActivePage: (pageIndex: number) => void;
  toggleDetectionStatus: (id: string) => void;
  setDetectionStatus: (id: string, status: DetectionStatus) => void;
  confirmGroup: (groupId: string) => void;
  confirmAll: () => void;
  revertAll: () => void;
  setFilters: (next: Partial<FilterState>) => void;
  setToolMode: (mode: 'select' | 'draw' | null) => void;
  addManualRedaction: (payload: {
    pageIndex: number;
    box: ManualRedaction['box'];
    mode: ManualMode;
    snippet?: string;
    note?: string;
  }) => void;
  updateManualRedaction: (id: string, box: ManualRedaction['box']) => void;
  removeManualRedaction: (id: string) => void;
  clearPendingManualRedactions: () => void;
  setManualStatus: (id: string, status: DetectionStatus) => void;
  setCustomKeywords: (keywords: string[]) => void;
  clearManualPage: (pageIndex: number) => void;
  setExportJob: (payload: ExportJob) => void;
  setPreviewState: (pageIndex: number, preview: Partial<PreviewAsset>) => void;
  appendWarning: (message: string) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  redoLastChange: () => void;
  reset: () => void;
}

export type ReviewSliceCreator<T> = StateCreator<ReviewStoreState, [], [], T>;
