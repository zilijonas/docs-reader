import { create } from 'zustand';

import type {
  Detection,
  DetectionSource,
  DetectionStatus,
  DetectionType,
  ExportJob,
  FilterState,
  ManualMode,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  SourceDocument,
} from '../lib/types';
import { createId, normalizeBox } from '../lib/utils';

interface ReviewState {
  sourceDocument: SourceDocument | null;
  pages: PageAsset[];
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  customKeywords: string[];
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
  setManualStatus: (id: string, status: DetectionStatus) => void;
  setCustomKeywords: (keywords: string[]) => void;
  rejectPage: (pageIndex: number) => void;
  clearManualPage: (pageIndex: number) => void;
  setExportJob: (payload: Partial<ExportJob>) => void;
  setPreviewState: (pageIndex: number, preview: Partial<PreviewAsset>) => void;
  appendWarning: (message: string) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  reset: () => void;
}

const allStatuses: DetectionStatus[] = ['suggested', 'approved', 'rejected'];
const allSources: DetectionSource[] = ['rule', 'manual'];
const allTypes: DetectionType[] = ['email', 'phone', 'url', 'iban', 'card', 'date', 'id', 'number', 'keyword', 'manual'];

const initialExport: ExportJob = {
  totalPages: 0,
  completedPages: 0,
  status: 'idle',
};

const initialFilters: FilterState = {
  statuses: allStatuses,
  sources: allSources,
  types: allTypes,
};

export const useReviewStore = create<ReviewState>((set) => ({
  sourceDocument: null,
  pages: [],
  detections: [],
  manualRedactions: [],
  customKeywords: [],
  filters: initialFilters,
  previews: {},
  activePage: 0,
  drawMode: false,
  exportJob: initialExport,
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
        exportJob: { ...initialExport, totalPages: pages.length },
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
        const next: Record<DetectionStatus, DetectionStatus> = {
          suggested: 'approved',
          approved: 'rejected',
          rejected: 'suggested',
        };
        return { ...detection, status: next[detection.status] };
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
  setFilters: (next) => set((state) => ({ filters: { ...state.filters, ...next } })),
  setDrawMode: (enabled) => set({ drawMode: enabled }),
  addManualRedaction: ({ pageIndex, box, mode, snippet, note }) =>
    set((state) => ({
      manualRedactions: [
        ...state.manualRedactions,
        {
          id: createId('manual'),
          pageIndex,
          box: normalizeBox(box),
          mode,
          snippet,
          note,
          status: 'approved',
        },
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
  setManualStatus: (id, status) =>
    set((state) => ({
      manualRedactions: state.manualRedactions.map((redaction) =>
        redaction.id === id ? { ...redaction, status } : redaction,
      ),
    })),
  setCustomKeywords: (keywords) => set({ customKeywords: keywords }),
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
      previews: {
        ...state.previews,
        [pageIndex]: {
          ...state.previews[pageIndex],
          pageIndex,
          status: 'idle',
          ...preview,
        },
      },
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
        filters: initialFilters,
        previews: {},
        activePage: 0,
        drawMode: false,
        exportJob: initialExport,
        warnings: [],
        fallbackExportReady: false,
      };
    }),
}));
