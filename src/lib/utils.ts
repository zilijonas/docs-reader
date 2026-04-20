import type { BoundingBox, Detection, TextSpan } from './types';

const BOX_CLOSENESS_THRESHOLD = {
  position: 0.01,
  size: 0.02,
} as const;

const READING_ORDER_LINE_THRESHOLD = 0.012;

const SOURCE_CONFIDENCE_MERGE_THRESHOLD = 0.05;
const OVERLAP_RATIO_THRESHOLD = 0.7;

const DETECTION_TYPE_PRIORITY: Record<Detection['type'], number> = {
  email: 90,
  phone: 80,
  url: 80,
  iban: 100,
  card: 95,
  date: 60,
  id: 85,
  number: 10,
  postal: 75,
  address: 75,
  vat: 95,
  nationalId: 100,
  keyword: 70,
  manual: 110,
};

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const toPercent = (value: number) => `${(value * 100).toFixed(3)}%`;

export const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const normalizeBox = (box: BoundingBox): BoundingBox => ({
  x: clamp(box.x),
  y: clamp(box.y),
  width: clamp(box.width, 0, 1 - clamp(box.x)),
  height: clamp(box.height, 0, 1 - clamp(box.y)),
});

export const unionBoxes = (boxes: BoundingBox[]): BoundingBox => {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return normalizeBox({
    x,
    y,
    width: maxX - x,
    height: maxY - y,
  });
};

export const overlaps = (a: BoundingBox, b: BoundingBox) => {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX > 0 && overlapY > 0;
};

const boxArea = (box: BoundingBox) => box.width * box.height;

const getOverlapArea = (a: BoundingBox, b: BoundingBox) => {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX * overlapY;
};

const overlapRatioToSmallerBox = (a: BoundingBox, b: BoundingBox) => {
  const smallerArea = Math.min(boxArea(a), boxArea(b));
  if (smallerArea === 0) {
    return 0;
  }

  return getOverlapArea(a, b) / smallerArea;
};

export const boxesClose = (a: BoundingBox, b: BoundingBox) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dw = Math.abs(a.width - b.width);
  const dh = Math.abs(a.height - b.height);
  return (
    dx < BOX_CLOSENESS_THRESHOLD.position &&
    dy < BOX_CLOSENESS_THRESHOLD.position &&
    dw < BOX_CLOSENESS_THRESHOLD.size &&
    dh < BOX_CLOSENESS_THRESHOLD.size
  );
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sortSpansForReadingOrder = (spans: TextSpan[]) =>
  [...spans].sort((left, right) => {
    const lineDelta = Math.abs(left.box.y - right.box.y);
    if (lineDelta > READING_ORDER_LINE_THRESHOLD) {
      return left.box.y - right.box.y;
    }
    return left.box.x - right.box.x;
  });

export const rebuildPageText = (spans: TextSpan[]) => {
  const ordered = sortSpansForReadingOrder(spans);
  let cursor = 0;
  const enriched = ordered.map((span, index) => {
    const prefix = index === 0 ? '' : ' ';
    const start = cursor + prefix.length;
    const text = prefix + span.text.trim();
    cursor += text.length;
    return {
      ...span,
      start,
      end: start + span.text.trim().length,
    };
  });

  return {
    text: enriched.map((span, index) => `${index === 0 ? '' : ' '}${span.text.trim()}`).join(''),
    spans: enriched,
  };
};

export const findSpansInRange = (spans: TextSpan[], start: number, end: number) =>
  spans.filter((span) => span.end > start && span.start < end);

export const detectionKey = (detection: Detection) =>
  `${detection.pageIndex}:${detection.type}:${detection.normalizedSnippet}:${detection.box.x.toFixed(3)}:${detection.box.y.toFixed(3)}`;

export const normalizeSnippet = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

const snippetsOverlap = (left: Detection, right: Detection) =>
  left.normalizedSnippet === right.normalizedSnippet ||
  left.normalizedSnippet.includes(right.normalizedSnippet) ||
  right.normalizedSnippet.includes(left.normalizedSnippet);

const shouldMergeDetections = (current: Detection, candidate: Detection) => {
  if (current.pageIndex !== candidate.pageIndex) {
    return false;
  }

  const sameType = current.type === candidate.type;
  const sameSnippet = current.normalizedSnippet === candidate.normalizedSnippet;
  const nestedSnippet = snippetsOverlap(current, candidate);
  const spatiallySame =
    boxesClose(current.box, candidate.box) ||
    overlapRatioToSmallerBox(current.box, candidate.box) >= OVERLAP_RATIO_THRESHOLD;

  if (!spatiallySame) {
    return false;
  }

  if (sameType || sameSnippet) {
    return true;
  }

  return nestedSnippet && (current.type === 'number' || candidate.type === 'number');
};

const selectPreferredDetection = (current: Detection, candidate: Detection) => {
  const currentPriority = DETECTION_TYPE_PRIORITY[current.type];
  const candidatePriority = DETECTION_TYPE_PRIORITY[candidate.type];

  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }

  if (candidate.confidence !== current.confidence) {
    return candidate.confidence > current.confidence ? candidate : current;
  }

  if (candidate.normalizedSnippet === current.normalizedSnippet) {
    return boxArea(candidate.box) < boxArea(current.box) ? candidate : current;
  }

  return candidate.normalizedSnippet.length > current.normalizedSnippet.length ? candidate : current;
};

export const dedupeDetections = (detections: Detection[]) => {
  const deduped: Detection[] = [];

  detections.forEach((candidate) => {
    const existing = deduped.find((current) => shouldMergeDetections(current, candidate));

    if (!existing) {
      deduped.push(candidate);
      return;
    }

    const preferred = selectPreferredDetection(existing, candidate);
    existing.id = preferred.id;
    existing.type = preferred.type;
    existing.label = preferred.label;
    existing.box = preferred.box;
    existing.snippet = preferred.snippet;
    existing.normalizedSnippet = preferred.normalizedSnippet;
    existing.source = preferred.source;
    existing.confidence = preferred.confidence;
    existing.status = preferred.status;
    existing.groupId = preferred.groupId;
    existing.matchCount = preferred.matchCount;

    if (
      candidate.source !== existing.source &&
      candidate.confidence >= existing.confidence - SOURCE_CONFIDENCE_MERGE_THRESHOLD
    ) {
      existing.source = candidate.source;
    }
  });

  return deduped;
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
