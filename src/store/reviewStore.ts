import { create } from 'zustand';

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
} from '../lib/types';
import { createId, normalizeBox } from '../lib/utils';
import {
  DEFAULT_REVIEW_FILTERS,
  createManualRedactionRecord,
  initialExportJob,
  nextDetectionStatus,
  updatePreviewRecord,
} from '../features/redactor';

interface ReviewState {
  sourceDocument: SourceDocument | null;
  pages: PageAsset[];
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  customKeywords: string[];
  filters: FilterState;
  previews: Record<number, PreviewAsset>;
  activePage: number;
  toolMode: 'select' | 'draw' | null;
  exportJob: ExportJob;
  warnings: string[];
  fallbackExportReady: boolean;
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
  setExportJob: (payload: Partial<ExportJob>) => void;
  setPreviewState: (pageIndex: number, preview: Partial<PreviewAsset>) => void;
  appendWarning: (message: string) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  reset: () => void;
}

const createInitialExportJob = (): ExportJob => initialExportJob();
const createInitialFilters = (): FilterState => ({
  statuses: [...DEFAULT_REVIEW_FILTERS.statuses],
  sources: [...DEFAULT_REVIEW_FILTERS.sources],
  types: [...DEFAULT_REVIEW_FILTERS.types],
});

export const useReviewStore = create<ReviewState>((set) => ({
  sourceDocument: null,
  pages: [],
  detections: [],
  manualRedactions: [],
  customKeywords: [],
  filters: createInitialFilters(),
  previews: {},
  activePage: 0,
  toolMode: null,
  exportJob: createInitialExportJob(),
  warnings: [],
  fallbackExportReady: false,
  setDocument: ({ sourceDocument, pages, detections, warnings }) =>
    set((state) => {
      Object.values(state.previews).forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });

      return {
        sourceDocument,
        pages,
        detections,
        warnings,
        manualRedactions: [],
        activePage: 0,
        previews: {},
        exportJob: { ...createInitialExportJob(), totalPages: pages.length },
        fallbackExportReady: false,
      };
    }),
  setSourceDocumentName: (name) =>
    set((state) => ({
      sourceDocument: state.sourceDocument ? { ...state.sourceDocument, name } : null,
    })),
  setDetections: (detections) => set({ detections }),
  setActivePage: (pageIndex) => set({ activePage: pageIndex }),
  toggleDetectionStatus: (id) =>
    set((state) => ({
      detections: state.detections.map((detection) => {
        if (detection.id !== id) {
          return detection;
        }
        return { ...detection, status: nextDetectionStatus(detection.status) };
      }),
    })),
  setDetectionStatus: (id, status) =>
    set((state) => ({
      detections: state.detections.map((detection) => (detection.id === id ? { ...detection, status } : detection)),
    })),
  confirmGroup: (groupId) =>
    set((state) => ({
      detections: state.detections.map((detection) =>
        detection.groupId === groupId ? { ...detection, status: 'confirmed' } : detection,
      ),
    })),
  confirmAll: () =>
    set((state) => ({
      detections: state.detections.map((detection) => ({ ...detection, status: 'confirmed' as const })),
      manualRedactions: state.manualRedactions.map((redaction) => ({ ...redaction, status: 'confirmed' as const })),
    })),
  revertAll: () =>
    set((state) => ({
      detections: state.detections.map((detection) => ({ ...detection, status: 'unconfirmed' as const })),
      manualRedactions: state.manualRedactions.map((redaction) => ({ ...redaction, status: 'unconfirmed' as const })),
    })),
  setFilters: (next) => set((state) => ({ filters: { ...state.filters, ...next } })),
  setToolMode: (mode) => set({ toolMode: mode }),
  addManualRedaction: ({ pageIndex, box, mode, snippet, note }) =>
    set((state) => ({
      manualRedactions: [
        ...state.manualRedactions,
        createManualRedactionRecord({
          id: createId('manual'),
          pageIndex,
          box,
          mode,
          snippet,
          note,
        }),
      ],
    })),
  updateManualRedaction: (id, box) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.map((redaction) =>
        redaction.id === id ? { ...redaction, box: normalizeBox(box) } : redaction,
      ),
    })),
  removeManualRedaction: (id) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.filter((redaction) => redaction.id !== id),
    })),
  clearPendingManualRedactions: () =>
    set((state) => ({
      manualRedactions: state.manualRedactions.filter((redaction) => redaction.status !== 'unconfirmed'),
    })),
  setManualStatus: (id, status) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.map((redaction) =>
        redaction.id === id ? { ...redaction, status } : redaction,
      ),
    })),
  setCustomKeywords: (keywords) => set({ customKeywords: keywords }),
  clearManualPage: (pageIndex) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.filter((redaction) => redaction.pageIndex !== pageIndex),
    })),
  setExportJob: (payload) =>
    set((state) => ({
      exportJob: {
        ...state.exportJob,
        ...payload,
      },
    })),
  setPreviewState: (pageIndex, preview) =>
    set((state) => ({
      previews: updatePreviewRecord(state.previews, pageIndex, preview),
    })),
  appendWarning: (message) =>
    set((state) => ({
      warnings: state.warnings.includes(message) ? state.warnings : [...state.warnings, message],
    })),
  setFallbackExportReady: (enabled) => set({ fallbackExportReady: enabled }),
  reset: () =>
    set((state) => {
      Object.values(state.previews).forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });

      return {
        sourceDocument: null,
        pages: [],
        detections: [],
        manualRedactions: [],
        customKeywords: [],
        filters: createInitialFilters(),
        previews: {},
        activePage: 0,
        toolMode: null,
        exportJob: createInitialExportJob(),
        warnings: [],
        fallbackExportReady: false,
      };
    }),
}));
