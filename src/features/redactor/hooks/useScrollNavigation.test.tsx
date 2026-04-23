/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useRef, useState } from 'react';

import { REDACTOR_UI } from '../config';
import { useScrollNavigation } from './useScrollNavigation';

class ResizeObserverStub {
  observe() {}

  disconnect() {}
}

type HarnessProps = {
  isMobileViewport?: boolean;
  zoom?: number;
};

type HarnessBindings = {
  appHeader: HTMLElement;
  setZoomState: Mock<(value: number) => void>;
  viewer: HTMLDivElement;
};

function configureViewerGeometry(viewer: HTMLDivElement) {
  Object.defineProperties(viewer, {
    clientHeight: { configurable: true, value: 500 },
    clientWidth: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 1200, writable: true },
    scrollLeft: { configurable: true, value: 0, writable: true },
    scrollTop: { configurable: true, value: 0, writable: true },
    scrollWidth: { configurable: true, value: 1200, writable: true },
  });
  viewer.getBoundingClientRect = () =>
    ({
      bottom: 550,
      height: 500,
      left: 50,
      right: 650,
      top: 50,
      width: 600,
      x: 50,
      y: 50,
      toJSON: () => null,
    }) as DOMRect;
  viewer.scrollTo = vi.fn((options?: ScrollToOptions | number, top?: number) => {
    const left = typeof options === 'number' ? options : (options?.left ?? 0);
    const nextTop = typeof options === 'number' ? (top ?? 0) : (options?.top ?? 0);
    viewer.scrollLeft = left;
    viewer.scrollTop = nextTop;
  }) as typeof viewer.scrollTo;
}

function renderHarness(props: HarnessProps = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const bindings = {} as HarnessBindings;

  function Harness() {
    const [zoom, setZoom] = useState(props.zoom ?? 1);
    const setZoomStateRef = useRef<Mock<(value: number) => void> | null>(null);

    if (!setZoomStateRef.current) {
      setZoomStateRef.current = vi.fn((value: number) => {
        setZoom(value);
      });
    }

    const setZoomState = (value: number) => {
      setZoomStateRef.current?.(value);
    };
    const { appHeaderRef, appShellRef, viewerColumnRef } = useScrollNavigation({
      appHeaderHeight: 57,
      hasViewer: true,
      isMobileViewport: props.isMobileViewport ?? false,
      isSidebarOpen: false,
      setActivePage: vi.fn(),
      setAppHeaderHeight: vi.fn(),
      setReviewPanelOpen: vi.fn(),
      setViewerContentWidth: vi.fn(),
      setZoomState,
      zoom,
    });

    return (
      <div ref={appShellRef}>
        <header ref={appHeaderRef} />
        <div
          ref={(node) => {
            viewerColumnRef.current = node;

            if (node) {
              bindings.viewer = node;
              bindings.setZoomState = setZoomStateRef.current!;
            }
          }}
        />
      </div>
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  bindings.appHeader = container.querySelector('header') as HTMLElement;
  bindings.appHeader.getBoundingClientRect = () =>
    ({
      bottom: 57,
      height: 57,
      left: 0,
      right: 1000,
      top: 0,
      width: 1000,
      x: 0,
      y: 0,
      toJSON: () => null,
    }) as DOMRect;
  configureViewerGeometry(bindings.viewer);

  return {
    ...bindings,
    root,
  };
}

describe('useScrollNavigation zoom interactions', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('maps ctrl-wheel zoom to viewer zoom around the pointer', () => {
    const harness = renderHarness();
    root = harness.root;

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 250,
      ctrlKey: true,
      deltaY: -120,
    });

    act(() => {
      harness.viewer.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(harness.setZoomState).toHaveBeenCalledTimes(1);
    expect(harness.setZoomState.mock.calls[0]?.[0]).toBeGreaterThan(1);
  });

  it('ignores browser zoom keyboard shortcuts while editing an input', () => {
    const harness = renderHarness({ zoom: 1.2 });
    root = harness.root;
    const input = document.createElement('input');
    document.body.append(input);

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: '+',
    });

    act(() => {
      input.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(harness.setZoomState).not.toHaveBeenCalled();
  });

  it('resets to default zoom for ctrl/cmd+0 outside editable fields', () => {
    const harness = renderHarness({ zoom: 1.4 });
    root = harness.root;

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: '0',
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(harness.setZoomState).toHaveBeenCalledWith(REDACTOR_UI.defaultZoom);
  });

  it('uses the pinch centroid as the zoom anchor on mobile', () => {
    const harness = renderHarness({ isMobileViewport: true });
    root = harness.root;
    const makeTouch = (clientX: number, clientY: number, identifier: number) =>
      ({
        clientX,
        clientY,
        identifier,
        target: harness.viewer,
      }) as unknown as Touch;

    const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, 'touches', {
      configurable: true,
      value: [makeTouch(100, 120, 1), makeTouch(220, 120, 2)],
    });
    Object.defineProperty(touchStart, 'targetTouches', {
      configurable: true,
      value: [makeTouch(100, 120, 1), makeTouch(220, 120, 2)],
    });
    Object.defineProperty(touchStart, 'changedTouches', {
      configurable: true,
      value: [makeTouch(100, 120, 1), makeTouch(220, 120, 2)],
    });

    const touchMove = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(touchMove, 'touches', {
      configurable: true,
      value: [makeTouch(80, 110, 1), makeTouch(260, 130, 2)],
    });
    Object.defineProperty(touchMove, 'targetTouches', {
      configurable: true,
      value: [makeTouch(80, 110, 1), makeTouch(260, 130, 2)],
    });
    Object.defineProperty(touchMove, 'changedTouches', {
      configurable: true,
      value: [makeTouch(80, 110, 1), makeTouch(260, 130, 2)],
    });

    act(() => {
      harness.viewer.dispatchEvent(touchStart);
      harness.viewer.dispatchEvent(touchMove);
    });

    expect(touchMove.defaultPrevented).toBe(true);
    expect(harness.setZoomState).toHaveBeenCalledTimes(1);
    expect(harness.setZoomState.mock.calls[0]?.[0]).toBeCloseTo(1.5092308563562362, 5);
    expect(harness.viewer.scrollLeft).toBeCloseTo(61.10770276274834, 5);
    expect(harness.viewer.scrollTop).toBeCloseTo(35.646159944936535, 5);
  });
});
