import type {
  BoundingBox,
  Detection,
  DetectionStatus,
  FilterState,
  ManualRedaction,
  PreviewAsset,
  TextSpan,
} from '../../lib/types';
import { normalizeBox } from '../../lib/utils';
import { DETECTION_TYPE_LABELS, DETECTION_TYPE_ORDER } from './config';

export interface ReviewCounts {
  confirmedCount: number;
  unconfirmedCount: number;
  reviewCount: number;
}

export interface ReviewItem {
  id: string;
  type: Detection['type'];
  label: string;
  source: Detection['source'];
  status: DetectionStatus;
  pageIndex: number;
  snippet: string;
  confidence: number;
  box: BoundingBox;
  groupId?: string;
  matchCount?: number;
  manual?: boolean;
}

export const initialExportJob = () => ({
  totalPages: 0,
  completedPages: 0,
  status: 'idle' as const,
});

export const nextDetectionStatus = (status: DetectionStatus): DetectionStatus => {
  return status === 'unconfirmed' ? 'confirmed' : 'unconfirmed';
};

export const buildSpansByPage = (spans: TextSpan[]) => {
  const spansByPage = new Map<number, TextSpan[]>();

  spans.forEach((span) => {
    const pageSpans = spansByPage.get(span.pageIndex);

    if (pageSpans) {
      pageSpans.push(span);
      return;
    }

    spansByPage.set(span.pageIndex, [span]);
  });

  return spansByPage;
};

export const buildReviewItems = (detections: Detection[], manualRedactions: ManualRedaction[]): ReviewItem[] => {
  const detectionItems = detections.map<ReviewItem>((detection) => ({
    id: detection.id,
    type: detection.type,
    label: DETECTION_TYPE_LABELS[detection.type],
    source: detection.source,
    status: detection.status,
    pageIndex: detection.pageIndex,
    snippet: detection.snippet,
    confidence: detection.confidence,
    box: detection.box,
    groupId: detection.groupId,
    matchCount: detection.matchCount,
  }));

  const manualItems = manualRedactions.map<ReviewItem>((manualRedaction) => ({
    id: manualRedaction.id,
    type: 'manual',
    label: DETECTION_TYPE_LABELS.manual,
    source: 'manual',
    status: manualRedaction.status,
    pageIndex: manualRedaction.pageIndex,
    snippet: manualRedaction.snippet || manualRedaction.note || 'Manual box',
    confidence: 1,
    box: manualRedaction.box,
    manual: true,
  }));

  return [...detectionItems, ...manualItems];
};

export const filterReviewItems = (reviewItems: ReviewItem[], filters: FilterState) =>
  reviewItems
    .filter((reviewItem) => filters.statuses.includes(reviewItem.status))
    .filter((reviewItem) => filters.sources.includes(reviewItem.source))
    .filter((reviewItem) => filters.types.includes(reviewItem.type))
    .sort((left, right) => {
      if (left.pageIndex !== right.pageIndex) {
        return left.pageIndex - right.pageIndex;
      }

      return DETECTION_TYPE_ORDER.indexOf(left.type) - DETECTION_TYPE_ORDER.indexOf(right.type);
    });

export const groupReviewItemsByType = (reviewItems: ReviewItem[]) =>
  reviewItems.reduce<Record<string, ReviewItem[]>>((groups, reviewItem) => {
    groups[reviewItem.type] ??= [];
    groups[reviewItem.type].push(reviewItem);
    return groups;
  }, {});

export const getReviewCounts = (detections: Detection[], manualRedactions: ManualRedaction[]): ReviewCounts => {
  const unconfirmedCount =
    detections.filter((detection) => detection.status === 'unconfirmed').length +
    manualRedactions.filter((manualRedaction) => manualRedaction.status === 'unconfirmed').length;
  const confirmedCount =
    detections.filter((detection) => detection.status === 'confirmed').length +
    manualRedactions.filter((manualRedaction) => manualRedaction.status === 'confirmed').length;

  return {
    unconfirmedCount,
    confirmedCount,
    reviewCount: unconfirmedCount + confirmedCount,
  };
};

export const updatePreviewRecord = (
  previews: Record<number, PreviewAsset>,
  pageIndex: number,
  nextPreview: Partial<PreviewAsset>,
) => ({
  ...previews,
  [pageIndex]: {
    ...previews[pageIndex],
    pageIndex,
    status: 'idle' as const,
    ...nextPreview,
  },
});

export const createManualRedactionRecord = ({
  id,
  pageIndex,
  box,
  mode,
  snippet,
  note,
}: {
  id: string;
  pageIndex: number;
  box: BoundingBox;
  mode: ManualRedaction['mode'];
  snippet?: string;
  note?: string;
}): ManualRedaction => ({
  id,
  pageIndex,
  box: normalizeBox(box),
  mode,
  snippet,
  note,
  status: 'unconfirmed',
});

export const preserveRuleStatuses = (nextDetections: Detection[], previousDetections: Detection[]) =>
  nextDetections.map((detection) => {
    const previousMatch = previousDetections.find(
      (candidate) =>
        candidate.source === detection.source &&
        candidate.pageIndex === detection.pageIndex &&
        candidate.type === detection.type &&
        candidate.normalizedSnippet === detection.normalizedSnippet,
    );

    return previousMatch ? { ...detection, status: previousMatch.status } : detection;
  });

export const getPreviewDisplayState = (preview?: PreviewAsset) => {
  if (preview?.status === 'ready' && preview.url) {
    return 'ready' as const;
  }

  if (preview?.status === 'error') {
    return 'error' as const;
  }

  return 'loading' as const;
};
