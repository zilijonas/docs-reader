import type { BoundingBox, TextSpan } from '../types';

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

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

export const boxArea = (box: BoundingBox) => box.width * box.height;

const getOverlapArea = (a: BoundingBox, b: BoundingBox) => {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX * overlapY;
};

export const overlapRatioToSmallerBox = (a: BoundingBox, b: BoundingBox) => {
  const smallerArea = Math.min(boxArea(a), boxArea(b));
  if (smallerArea === 0) {
    return 0;
  }

  return getOverlapArea(a, b) / smallerArea;
};

export const BOX_CLOSENESS_THRESHOLD = {
  position: 0.01,
  size: 0.02,
} as const;

export const OVERLAP_RATIO_THRESHOLD = 0.7;

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

// Clips a span's bounding box to [rangeStart, rangeEnd] by linear
// interpolation over character count — good enough for proportional fonts.
export const clipBoxToRange = (
  span: TextSpan,
  rangeStart: number,
  rangeEnd: number,
): BoundingBox => {
  const spanLen = Math.max(1, span.end - span.start);
  const clippedStart = Math.max(rangeStart, span.start);
  const clippedEnd = Math.min(rangeEnd, span.end);
  if (clippedEnd <= clippedStart) {
    return span.box;
  }
  const leftFrac = Math.max(0, Math.min(1, (clippedStart - span.start) / spanLen));
  const rightFrac = Math.max(0, Math.min(1, (clippedEnd - span.start) / spanLen));
  const width = Math.max(0, rightFrac - leftFrac) * span.box.width;
  return {
    x: span.box.x + leftFrac * span.box.width,
    y: span.box.y,
    width,
    height: span.box.height,
  };
};
