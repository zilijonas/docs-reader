import type { CSSProperties } from 'react';

import type { BoundingBox } from '../../types';
import { toPercent } from '../../lib/utils';

const BOX_PRIORITY_SCALE = 10_000;
const BOX_PRIORITY_FLOOR = 1;
const BOX_NAVIGATION_ROW_TOLERANCE = 0.002;
type BoxStyleExtras = CSSProperties & Record<`--${string}`, string | number>;

export function getBoxStyle(box: BoundingBox, extra?: BoxStyleExtras): CSSProperties {
  return {
    '--box-left': toPercent(box.x),
    '--box-top': toPercent(box.y),
    '--box-width': toPercent(box.width),
    '--box-height': toPercent(box.height),
    ...extra,
  } as CSSProperties;
}

export function getBoxPriority(box: BoundingBox): number {
  const area = Math.max(0, Math.min(1, box.width * box.height));

  return Math.max(BOX_PRIORITY_FLOOR, Math.round((1 - area) * BOX_PRIORITY_SCALE));
}

export function compareBoxesForFocusOrder(left: BoundingBox, right: BoundingBox): number {
  const topDelta = left.y - right.y;

  if (Math.abs(topDelta) > BOX_NAVIGATION_ROW_TOLERANCE) {
    return topDelta;
  }

  const leftDelta = left.x - right.x;

  if (leftDelta !== 0) {
    return leftDelta;
  }

  return getBoxPriority(right) - getBoxPriority(left);
}
