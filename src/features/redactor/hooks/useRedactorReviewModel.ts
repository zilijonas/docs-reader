import { useMemo } from 'react';

import type { Detection, FilterState, ManualRedaction, TextSpan } from '../../../lib/types';
import { buildReviewItems, buildSpansByPage, filterReviewItems, getReviewCounts } from '../review-helpers';

export function useRedactorReviewModel({
  detections,
  manualRedactions,
  filters,
  spans,
}: {
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  filters: FilterState;
  spans: TextSpan[];
}) {
  const spansByPage = useMemo(() => buildSpansByPage(spans), [spans]);
  const reviewItems = useMemo(() => buildReviewItems(detections, manualRedactions), [detections, manualRedactions]);
  const filteredReviewItems = useMemo(() => filterReviewItems(reviewItems, filters), [reviewItems, filters]);
  const reviewCounts = useMemo(() => getReviewCounts(detections, manualRedactions), [detections, manualRedactions]);

  return {
    spansByPage,
    reviewItems,
    filteredReviewItems,
    reviewCounts,
  };
}
