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
import { DEFAULT_OCR_LANGUAGES } from '../lib/constants';
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
  ocrLanguages: string[];
  filters: FilterState;
  previews: Record<number, PreviewAsset>;
  activePage: number;
  drawMode: boolean;
  exportJob: ExportJob;
  warnings: string[];
  fallbackExportReady: boolean;
  setDocument: (payload: {
    sourceDocument: SourceDocument;
    pages: PageAsset[];
    detections: Detection[];
    warnings: string[];
  }) => void;
  setDetections: (detections: Detection[]) => void;
  setActivePage: (pageIndex: number) => void;
  toggleDetectionStatus: (id: string) => void;
  setDetectionStatus: (id: string, status: DetectionStatus) => void;
  approveGroup: (groupId: string) => void;
  approveAll: () => void;
  rejectAll: () => void;
  setFilters: (next: Partial<FilterState>) => void;
  setDrawMode: (enabled: boolean) => void;
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
  setOcrLanguages: (languages: string[]) => void;
  rejectPage: (pageIndex: number) => void;
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
  ocrLanguages: [...DEFAULT_OCR_LANGUAGES],
  filters: createInitialFilters(),
  previews: {},
  activePage: 0,
  drawMode: false,
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
  approveGroup: (groupId) =>
    set((state) => ({
      detections: state.detections.map((detection) =>
        detection.groupId === groupId ? { ...detection, status: 'approved' } : detection,
      ),
    })),
  approveAll: () =>
    set((state) => ({
      detections: state.detections.map((detection) => ({ ...detection, status: 'approved' as const })),
      manualRedactions: state.manualRedactions.map((redaction) => ({ ...redaction, status: 'approved' as const })),
    })),
  rejectAll: () =>
    set((state) => ({
      detections: state.detections.map((detection) => ({ ...detection, status: 'rejected' as const })),
      manualRedactions: state.manualRedactions.map((redaction) => ({ ...redaction, status: 'rejected' as const })),
    })),
  setFilters: (next) => set((state) => ({ filters: { ...state.filters, ...next } })),
  setDrawMode: (enabled) => set({ drawMode: enabled }),
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
      manualRedactions: state.manualRedactions.filter((redaction) => redaction.status !== 'suggested'),
    })),
  setManualStatus: (id, status) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.map((redaction) =>
        redaction.id === id ? { ...redaction, status } : redaction,
      ),
    })),
  setCustomKeywords: (keywords) => set({ customKeywords: keywords }),
  setOcrLanguages: (languages) => {
    const unique = Array.from(new Set(languages.filter(Boolean)));
    set({ ocrLanguages: unique.length > 0 ? unique : [...DEFAULT_OCR_LANGUAGES] });
  },
  rejectPage: (pageIndex) =>
    set((state) => ({
      detections: state.detections.map((detection) =>
        detection.pageIndex === pageIndex ? { ...detection, status: 'rejected' } : detection,
      ),
      manualRedactions: state.manualRedactions.map((redaction) =>
        redaction.pageIndex === pageIndex ? { ...redaction, status: 'rejected' } : redaction,
      ),
    })),
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
        ocrLanguages: [...DEFAULT_OCR_LANGUAGES],
        filters: createInitialFilters(),
        previews: {},
        activePage: 0,
        drawMode: false,
        exportJob: createInitialExportJob(),
        warnings: [],
        fallbackExportReady: false,
      };
    }),
}));
