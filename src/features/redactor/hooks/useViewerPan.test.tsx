/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HTMLAttributes } from 'react';
import { useRef } from 'react';
import type { Mock } from 'vitest';

import { canStartViewerPan, getViewerPanScrollPosition, useViewerPan } from './useViewerPan';

type HarnessBindings = {
  bindProps: HTMLAttributes<HTMLDivElement>;
  handlePointerDownCapture: ReturnType<typeof useViewerPan>['handlePointerDownCapture'];
  setZoom: Mock<
    (value: number, anchor?: { clientX?: number; clientY?: number; source: string }) => void
  >;
  viewer: HTMLDivElement;
};

function renderHarness({
  toolMode = null,
  zoom,
}: {
  toolMode?: 'select' | 'draw' | null;
  zoom: number;
}) {
  const bindings = {} as HarnessBindings;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  function Harness() {
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const setZoomRef = useRef<HarnessBindings['setZoom'] | null>(null);

    if (!setZoomRef.current) {
      setZoomRef.current = vi.fn();
    }

    const pan = useViewerPan({
      setZoom: setZoomRef.current,
      toolMode,
      viewerRef,
      zoom,
    });
    const bindProps = pan.bind();

    return (
      <div
        ref={(node) => {
          viewerRef.current = node;

          if (node) {
            bindings.bindProps = bindProps;
            bindings.handlePointerDownCapture = pan.handlePointerDownCapture;
            bindings.setZoom = setZoomRef.current!;
            bindings.viewer = node;
          }
        }}
        {...bindProps}
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  Object.defineProperties(bindings.viewer, {
    clientHeight: { configurable: true, value: 500 },
    clientWidth: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 1200, writable: true },
    scrollLeft: { configurable: true, value: 180, writable: true },
    scrollTop: { configurable: true, value: 220, writable: true },
    scrollWidth: { configurable: true, value: 1400, writable: true },
  });
  bindings.viewer.setPointerCapture = vi.fn();
  bindings.viewer.releasePointerCapture = vi.fn();

  return {
    bindings,
    root,
  };
}

describe('useViewerPan', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('drags the viewer in both axes when zoomed in', () => {
    expect(
      getViewerPanScrollPosition({
        movementX: 60,
        movementY: 60,
        scrollLeft: 180,
        scrollTop: 220,
      }),
    ).toEqual({
      scrollLeft: 120,
      scrollTop: 160,
    });
  });

  it('does nothing at base zoom', () => {
    const harness = renderHarness({ zoom: 1 });
    root = harness.root;

    expect(
      canStartViewerPan({
        target: harness.bindings.viewer,
        toolMode: null,
        viewerElement: harness.bindings.viewer,
        zoom: 1,
      }),
    ).toBe(false);
  });

  it('ignores drag starts on interactive descendants', () => {
    const harness = renderHarness({ zoom: 1.5 });
    root = harness.root;
    const button = document.createElement('button');
    harness.bindings.viewer.append(button);

    expect(
      canStartViewerPan({
        target: button,
        toolMode: null,
        viewerElement: harness.bindings.viewer,
        zoom: 1.5,
      }),
    ).toBe(false);
  });

  it('toggles zoom on double tap', () => {
    const harness = renderHarness({ zoom: 1 });
    root = harness.root;

    act(() => {
      harness.bindings.handlePointerDownCapture({
        button: 0,
        clientX: 200,
        clientY: 210,
        preventDefault: vi.fn(),
        target: harness.bindings.viewer,
        timeStamp: 100,
      } as never);
      harness.bindings.handlePointerDownCapture({
        button: 0,
        clientX: 206,
        clientY: 214,
        preventDefault: vi.fn(),
        target: harness.bindings.viewer,
        timeStamp: 260,
      } as never);
    });

    expect(harness.bindings.setZoom).toHaveBeenCalledWith(2, {
      clientX: 206,
      clientY: 214,
      source: 'control',
    });
  });

  it('blocks pan gestures while a drawing tool is active', () => {
    const harness = renderHarness({ toolMode: 'draw', zoom: 1.5 });
    root = harness.root;

    expect(
      canStartViewerPan({
        target: harness.bindings.viewer,
        toolMode: 'draw',
        viewerElement: harness.bindings.viewer,
        zoom: 1.5,
      }),
    ).toBe(false);

    act(() => {
      harness.bindings.handlePointerDownCapture({
        button: 0,
        clientX: 220,
        clientY: 260,
        preventDefault: vi.fn(),
        target: harness.bindings.viewer,
        timeStamp: 100,
      } as never);
      harness.bindings.handlePointerDownCapture({
        button: 0,
        clientX: 220,
        clientY: 260,
        preventDefault: vi.fn(),
        target: harness.bindings.viewer,
        timeStamp: 200,
      } as never);
    });

    expect(harness.bindings.setZoom).not.toHaveBeenCalled();
  });
});
