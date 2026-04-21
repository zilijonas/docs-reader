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
  canRedo: boolean;
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
  redoLastChange: () => void;
  reset: () => void;
}

interface ReviewSnapshot {
  detections: Detection[];
  manualRedactions: ManualRedaction[];
}

interface ReviewStoreState extends ReviewState {
  redoHistory: ReviewSnapshot[];
}

const createInitialExportJob = (): ExportJob => initialExportJob();
const createInitialFilters = (): FilterState => ({
  statuses: [...DEFAULT_REVIEW_FILTERS.statuses],
  sources: [...DEFAULT_REVIEW_FILTERS.sources],
  types: [...DEFAULT_REVIEW_FILTERS.types],
});
const MAX_REDO_HISTORY = 100;

const createReviewSnapshot = (state: Pick<ReviewStoreState, 'detections' | 'manualRedactions'>): ReviewSnapshot => ({
  detections: state.detections,
  manualRedactions: state.manualRedactions,
});

const clearRedoHistory = () => ({
  canRedo: false,
  redoHistory: [] as ReviewSnapshot[],
});

const pushRedoHistory = (
  state: ReviewStoreState,
  nextReviewState: Partial<Pick<ReviewStoreState, 'detections' | 'manualRedactions'>>,
) => {
  const detections = nextReviewState.detections ?? state.detections;
  const manualRedactions = nextReviewState.manualRedactions ?? state.manualRedactions;

  if (detections === state.detections && manualRedactions === state.manualRedactions) {
    return state;
  }

  const redoHistory = [...state.redoHistory, createReviewSnapshot(state)].slice(-MAX_REDO_HISTORY);

  return {
    ...nextReviewState,
    detections,
    manualRedactions,
    canRedo: redoHistory.length > 0,
    redoHistory,
  };
};

const boxesEqual = (left: ManualRedaction['box'], right: ManualRedaction['box']) =>
  left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;

export const useReviewStore = create<ReviewStoreState>((set) => ({
  sourceDocument: null,
  pages: [],
  detections: [],
  manualRedactions: [],
  customKeywords: [],
  filters: createInitialFilters(),
  previews: {},
  activePage: 0,
  toolMode: null,
  canRedo: false,
  exportJob: createInitialExportJob(),
  warnings: [],
  fallbackExportReady: false,
  redoHistory: [],
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
        ...clearRedoHistory(),
      };
    }),
  setSourceDocumentName: (name) =>
    set((state) => ({
      sourceDocument: state.sourceDocument ? { ...state.sourceDocument, name } : null,
    })),
  setDetections: (detections) =>
    set({
      detections,
      ...clearRedoHistory(),
    }),
  setActivePage: (pageIndex) => set({ activePage: pageIndex }),
  toggleDetectionStatus: (id) =>
    set((state) => {
      let changed = false;
      const detections = state.detections.map((detection) => {
        if (detection.id !== id) {
          return detection;
        }

        changed = true;
        return { ...detection, status: nextDetectionStatus(detection.status) };
      });

      return changed ? pushRedoHistory(state, { detections }) : state;
    }),
  setDetectionStatus: (id, status) =>
    set((state) => {
      let changed = false;
      const detections = state.detections.map((detection) => {
        if (detection.id !== id || detection.status === status) {
          return detection;
        }

        changed = true;
        return { ...detection, status };
      });

      return changed ? pushRedoHistory(state, { detections }) : state;
    }),
  confirmGroup: (groupId) =>
    set((state) => {
      let changed = false;
      const detections = state.detections.map((detection) => {
        if (detection.groupId !== groupId || detection.status === 'confirmed') {
          return detection;
        }

        changed = true;
        return { ...detection, status: 'confirmed' as const };
      });

      return changed ? pushRedoHistory(state, { detections }) : state;
    }),
  confirmAll: () =>
    set((state) => {
      let detectionsChanged = false;
      let manualRedactionsChanged = false;
      const detections = state.detections.map((detection) => {
        if (detection.status === 'confirmed') {
          return detection;
        }

        detectionsChanged = true;
        return { ...detection, status: 'confirmed' as const };
      });
      const manualRedactions = state.manualRedactions.map((redaction) => {
        if (redaction.status === 'confirmed') {
          return redaction;
        }

        manualRedactionsChanged = true;
        return { ...redaction, status: 'confirmed' as const };
      });

      return detectionsChanged || manualRedactionsChanged
        ? pushRedoHistory(state, { detections, manualRedactions })
        : state;
    }),
  revertAll: () =>
    set((state) => {
      let detectionsChanged = false;
      let manualRedactionsChanged = false;
      const detections = state.detections.map((detection) => {
        if (detection.status === 'unconfirmed') {
          return detection;
        }

        detectionsChanged = true;
        return { ...detection, status: 'unconfirmed' as const };
      });
      const manualRedactions = state.manualRedactions.map((redaction) => {
        if (redaction.status === 'unconfirmed') {
          return redaction;
        }

        manualRedactionsChanged = true;
        return { ...redaction, status: 'unconfirmed' as const };
      });

      return detectionsChanged || manualRedactionsChanged
        ? pushRedoHistory(state, { detections, manualRedactions })
        : state;
    }),
  setFilters: (next) => set((state) => ({ filters: { ...state.filters, ...next } })),
  setToolMode: (mode) => set({ toolMode: mode }),
  addManualRedaction: ({ pageIndex, box, mode, snippet, note }) =>
    set((state) =>
      pushRedoHistory(state, {
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
    set((state) => {
      const normalizedBox = normalizeBox(box);
      let changed = false;
      const manualRedactions = state.manualRedactions.map((redaction) => {
        if (redaction.id !== id || boxesEqual(redaction.box, normalizedBox)) {
          return redaction;
        }

        changed = true;
        return { ...redaction, box: normalizedBox };
      });

      return changed ? pushRedoHistory(state, { manualRedactions }) : state;
    }),
  removeManualRedaction: (id) =>
    set((state) => {
      const manualRedactions = state.manualRedactions.filter((redaction) => redaction.id !== id);
      return manualRedactions.length !== state.manualRedactions.length ? pushRedoHistory(state, { manualRedactions }) : state;
    }),
  clearPendingManualRedactions: () =>
    set((state) => {
      const manualRedactions = state.manualRedactions.filter((redaction) => redaction.status !== 'unconfirmed');
      return manualRedactions.length !== state.manualRedactions.length ? pushRedoHistory(state, { manualRedactions }) : state;
    }),
  setManualStatus: (id, status) =>
    set((state) => {
      let changed = false;
      const manualRedactions = state.manualRedactions.map((redaction) => {
        if (redaction.id !== id || redaction.status === status) {
          return redaction;
        }

        changed = true;
        return { ...redaction, status };
      });

      return changed ? pushRedoHistory(state, { manualRedactions }) : state;
    }),
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
  redoLastChange: () =>
    set((state) => {
      const previousSnapshot = state.redoHistory.at(-1);

      if (!previousSnapshot) {
        return state;
      }

      const redoHistory = state.redoHistory.slice(0, -1);

      return {
        detections: previousSnapshot.detections,
        manualRedactions: previousSnapshot.manualRedactions,
        canRedo: redoHistory.length > 0,
        redoHistory,
      };
    }),
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
        ...clearRedoHistory(),
      };
    }),
}));
