import type { FilterState, ManualRedaction } from '../../types';
import {
  DEFAULT_REVIEW_FILTERS,
  createManualRedactionRecord,
  nextDetectionStatus,
} from '../../features/redactor';
import { createId, normalizeBox } from '../../lib/utils';
import type { ReviewStoreState } from './types';

export const createInitialFilters = (): FilterState => ({
  statuses: [...DEFAULT_REVIEW_FILTERS.statuses],
  sources: [...DEFAULT_REVIEW_FILTERS.sources],
  types: [...DEFAULT_REVIEW_FILTERS.types],
});

const boxesEqual = (left: ManualRedaction['box'], right: ManualRedaction['box']) =>
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height;

export const createRedactionsSlice = (): Pick<
  ReviewStoreState,
  | 'sourceDocument'
  | 'pages'
  | 'detections'
  | 'manualRedactions'
  | 'customKeywords'
  | 'filters'
  | 'activePage'
  | 'toolMode'
  | 'setDocument'
  | 'setSourceDocumentName'
  | 'setDetections'
  | 'setActivePage'
  | 'toggleDetectionStatus'
  | 'setDetectionStatus'
  | 'confirmGroup'
  | 'confirmAll'
  | 'revertAll'
  | 'setFilters'
  | 'setToolMode'
  | 'addManualRedaction'
  | 'updateManualRedaction'
  | 'removeManualRedaction'
  | 'clearPendingManualRedactions'
  | 'setManualStatus'
  | 'setCustomKeywords'
  | 'clearManualPage'
> => ({
  sourceDocument: null,
  pages: [],
  detections: [],
  manualRedactions: [],
  customKeywords: [],
  filters: createInitialFilters(),
  activePage: 0,
  toolMode: null,
  setDocument: () => undefined,
  setSourceDocumentName: () => undefined,
  setDetections: () => undefined,
  setActivePage: () => undefined,
  toggleDetectionStatus: () => undefined,
  setDetectionStatus: () => undefined,
  confirmGroup: () => undefined,
  confirmAll: () => undefined,
  revertAll: () => undefined,
  setFilters: () => undefined,
  setToolMode: () => undefined,
  addManualRedaction: () => undefined,
  updateManualRedaction: () => undefined,
  removeManualRedaction: () => undefined,
  clearPendingManualRedactions: () => undefined,
  setManualStatus: () => undefined,
  setCustomKeywords: () => undefined,
  clearManualPage: () => undefined,
});

export { boxesEqual, createId, createManualRedactionRecord, nextDetectionStatus, normalizeBox };
