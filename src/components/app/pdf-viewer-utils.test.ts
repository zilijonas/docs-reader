import { describe, expect, it } from 'vitest';

import { compareBoxesForFocusOrder, getBoxPriority } from './pdf-viewer-utils';

describe('getBoxPriority', () => {
  it('gives smaller boxes higher stacking priority', () => {
    expect(getBoxPriority({ x: 0, y: 0, width: 0.1, height: 0.1 })).toBeGreaterThan(
      getBoxPriority({ x: 0, y: 0, width: 0.5, height: 0.5 }),
    );
  });

  it('keeps a positive priority for full-page boxes', () => {
    expect(getBoxPriority({ x: 0, y: 0, width: 1, height: 1 })).toBe(1);
  });
});

describe('compareBoxesForFocusOrder', () => {
  it('orders higher boxes before lower boxes', () => {
    expect(
      compareBoxesForFocusOrder(
        { x: 0.4, y: 0.1, width: 0.05, height: 0.02 },
        { x: 0.1, y: 0.7, width: 0.05, height: 0.02 },
      ),
    ).toBeLessThan(0);
  });

  it('orders boxes on the same row from left to right', () => {
    expect(
      compareBoxesForFocusOrder(
        { x: 0.1, y: 0.3, width: 0.05, height: 0.02 },
        { x: 0.4, y: 0.301, width: 0.05, height: 0.02 },
      ),
    ).toBeLessThan(0);
  });
});
