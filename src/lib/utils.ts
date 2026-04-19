import type { BoundingBox, Detection, DetectionType, TextSpan } from './types';

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

export const boxesClose = (a: BoundingBox, b: BoundingBox) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dw = Math.abs(a.width - b.width);
  const dh = Math.abs(a.height - b.height);
  return dx < 0.01 && dy < 0.01 && dw < 0.02 && dh < 0.02;
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sortSpansForReadingOrder = (spans: TextSpan[]) =>
  [...spans].sort((left, right) => {
    const lineDelta = Math.abs(left.box.y - right.box.y);
    if (lineDelta > 0.012) {
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

export const dedupeDetections = (detections: Detection[]) => {
  const deduped: Detection[] = [];

  detections.forEach((candidate) => {
    const existing = deduped.find(
      (current) =>
        current.pageIndex === candidate.pageIndex &&
        current.type === candidate.type &&
        (current.normalizedSnippet === candidate.normalizedSnippet ||
          boxesClose(current.box, candidate.box)),
    );

    if (!existing) {
      deduped.push(candidate);
      return;
    }

    if (candidate.confidence > existing.confidence) {
      existing.box = candidate.box;
      existing.confidence = candidate.confidence;
    }

    if (candidate.source !== existing.source && candidate.confidence >= existing.confidence - 0.05) {
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

export const detectionSortOrder: DetectionType[] = [
  'email',
  'phone',
  'url',
  'iban',
  'card',
  'date',
  'id',
  'number',
  'keyword',
  'manual',
];
