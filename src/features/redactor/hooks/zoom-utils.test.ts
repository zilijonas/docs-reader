import { describe, expect, it } from 'vitest';

import { createZoomSnapshot, getScrollPositionForZoom } from './zoom-utils';

describe('createZoomSnapshot', () => {
  it('uses the viewer center when no anchor is provided', () => {
    expect(
      createZoomSnapshot({
        geometry: {
          clientHeight: 500,
          clientWidth: 600,
          left: 20,
          scrollHeight: 1600,
          scrollLeft: 120,
          scrollTop: 240,
          scrollWidth: 1800,
          top: 40,
        },
        zoom: 1,
      }),
    ).toEqual({
      anchorOffsetX: 300,
      anchorOffsetY: 250,
      contentX: 420,
      contentY: 490,
      previousZoom: 1,
    });
  });
});

describe('getScrollPositionForZoom', () => {
  it('keeps the same content point under the zoom anchor when zooming in', () => {
    expect(
      getScrollPositionForZoom({
        geometry: {
          clientHeight: 500,
          clientWidth: 600,
          scrollHeight: 2400,
          scrollWidth: 1800,
        },
        nextZoom: 1.5,
        snapshot: {
          anchorOffsetX: 150,
          anchorOffsetY: 200,
          contentX: 450,
          contentY: 700,
          previousZoom: 1,
        },
      }),
    ).toEqual({
      scrollLeft: 525,
      scrollTop: 850,
    });
  });

  it('recenters horizontally when zooming out to content narrower than the viewer', () => {
    expect(
      getScrollPositionForZoom({
        geometry: {
          clientHeight: 500,
          clientWidth: 600,
          scrollHeight: 1200,
          scrollWidth: 600,
        },
        nextZoom: 0.8,
        snapshot: {
          anchorOffsetX: 200,
          anchorOffsetY: 180,
          contentX: 500,
          contentY: 600,
          previousZoom: 1,
        },
      }),
    ).toEqual({
      scrollLeft: 0,
      scrollTop: 300,
    });
  });

  it('clamps scroll positions when zoom math would overshoot the content bounds', () => {
    expect(
      getScrollPositionForZoom({
        geometry: {
          clientHeight: 500,
          clientWidth: 600,
          scrollHeight: 1000,
          scrollWidth: 900,
        },
        nextZoom: 2,
        snapshot: {
          anchorOffsetX: 100,
          anchorOffsetY: 100,
          contentX: 600,
          contentY: 600,
          previousZoom: 1,
        },
      }),
    ).toEqual({
      scrollLeft: 300,
      scrollTop: 500,
    });
  });
});
