import type { CSSProperties } from 'react';

import type { BoundingBox } from '../../types';
import { toPercent } from '../../lib/utils';

export function getBoxStyle(box: BoundingBox, extra?: Record<string, string>): CSSProperties {
  return {
    '--box-left': toPercent(box.x),
    '--box-top': toPercent(box.y),
    '--box-width': toPercent(box.width),
    '--box-height': toPercent(box.height),
    ...extra,
  } as CSSProperties;
}
