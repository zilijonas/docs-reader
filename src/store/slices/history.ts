import type { Detection, ManualRedaction } from '../../types';
import type { ReviewSliceCreator, ReviewSnapshot, ReviewStoreState } from './types';

const MAX_REDO_HISTORY = 100;

export const createReviewSnapshot = (state: Pick<ReviewStoreState, 'detections' | 'manualRedactions'>): ReviewSnapshot => ({
  detections: state.detections,
  manualRedactions: state.manualRedactions,
});

export const clearRedoHistory = () => ({
  canRedo: false,
  redoHistory: [] as ReviewSnapshot[],
});

export const pushRedoHistory = (
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

export const createHistorySlice = (): Pick<ReviewStoreState, 'canRedo' | 'redoHistory' | 'redoLastChange'> => ({
  canRedo: false,
  redoHistory: [],
  redoLastChange: () => undefined,
});
