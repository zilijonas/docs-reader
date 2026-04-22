import { describe, expect, it } from 'vitest';

import { createZoomSnapshot, getScrollPositionForZoom } from './zoom-utils';

describe('createZoomSnapshot', () => {
  it('uses the viewer center when no anchor is provided', () => {
    expect(
      createZoomSnapshot({
        contentOffsetX: 0,
        contentOffsetY: 0,
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

  it('records content coordinates relative to centered content offsets', () => {
    expect(
      createZoomSnapshot({
        contentOffsetX: 50,
        contentOffsetY: 24,
        geometry: {
          clientHeight: 500,
          clientWidth: 600,
          left: 20,
          scrollHeight: 1600,
          scrollLeft: 0,
          scrollTop: 0,
          scrollWidth: 600,
          top: 40,
        },
        zoom: 0.8,
      }),
    ).toEqual({
      anchorOffsetX: 300,
      anchorOffsetY: 250,
      contentX: 250,
      contentY: 226,
      previousZoom: 0.8,
    });
  });
});

describe('getScrollPositionForZoom', () => {
  it('keeps the same content point under the zoom anchor when zooming in', () => {
    expect(
      getScrollPositionForZoom({
        contentOffsetX: 0,
        contentOffsetY: 0,
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
        contentOffsetX: 0,
        contentOffsetY: 0,
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
        contentOffsetX: 0,
        contentOffsetY: 0,
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

  it('preserves the pinch anchor when centered content grows from zoomed-out state', () => {
    const nextScroll = getScrollPositionForZoom({
      contentOffsetX: 0,
      contentOffsetY: 24,
      geometry: {
        clientHeight: 500,
        clientWidth: 600,
        scrollHeight: 1600,
        scrollWidth: 960,
      },
      nextZoom: 1.2,
      snapshot: {
        anchorOffsetX: 300,
        anchorOffsetY: 250,
        contentX: 250,
        contentY: 226,
        previousZoom: 0.8,
      },
    });

    expect(nextScroll.scrollLeft).toBeCloseTo(75, 5);
    expect(nextScroll.scrollTop).toBeCloseTo(113, 5);
  });
});
