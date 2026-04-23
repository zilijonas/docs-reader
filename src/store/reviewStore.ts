import { create } from 'zustand';

import {
  boxesEqual,
  createId,
  createInitialFilters,
  createManualRedactionRecord,
  createRedactionsSlice,
  nextDetectionStatus,
  normalizeBox,
} from './slices/redactions';
import { createExportJobSlice, createInitialExportJob } from './slices/exportJob';
import { clearRedoHistory, createHistorySlice, pushRedoHistory } from './slices/history';
import {
  createPreviewAssetsSlice,
  releasePreviewUrls,
  updatePreviewRecord,
} from './slices/previewAssets';
import type { ReviewStoreState } from './slices/types';

export const useReviewStore = create<ReviewStoreState>((set) => ({
  ...createRedactionsSlice(),
  ...createPreviewAssetsSlice(),
  ...createHistorySlice(),
  ...createExportJobSlice(),
  setDocument: ({ sourceDocument, pages, detections, warnings }) =>
    set((state) => {
      releasePreviewUrls(state.previews);

      return {
        sourceDocument,
        pages,
        detections,
        warnings,
        manualRedactions: [],
        activePage: 0,
        previews: {},
        exportJob: createInitialExportJob(),
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
      }),
    ),
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
      return manualRedactions.length !== state.manualRedactions.length
        ? pushRedoHistory(state, { manualRedactions })
        : state;
    }),
  clearPendingManualRedactions: () =>
    set((state) => {
      const manualRedactions = state.manualRedactions.filter(
        (redaction) => redaction.status !== 'unconfirmed',
      );
      return manualRedactions.length !== state.manualRedactions.length
        ? pushRedoHistory(state, { manualRedactions })
        : state;
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
      manualRedactions: state.manualRedactions.filter(
        (redaction) => redaction.pageIndex !== pageIndex,
      ),
    })),
  setExportJob: (payload) => set({ exportJob: payload }),
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
      releasePreviewUrls(state.previews);

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
