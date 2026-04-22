/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useRef } from 'react';

import type { BoundingBox, ManualRedaction } from '../../../types';
import { usePageBoxInteractions } from './usePageBoxInteractions';

type HarnessBindings = ReturnType<typeof usePageBoxInteractions> & {
  page: HTMLDivElement;
  textLayer: HTMLDivElement;
};

function createPointerEvent(page: HTMLDivElement, clientX: number, clientY: number) {
  return {
    button: 0,
    clientX,
    clientY,
    currentTarget: page,
    pointerId: 1,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: page,
  };
}

function renderHarness({
  isMobileViewport = false,
  manualRedactions = [],
  spans = [],
  toolMode,
  onCreateManual = vi.fn() as Mock<(payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void>,
  onUpdateManual = vi.fn() as Mock<(id: string, box: BoundingBox) => void>,
}: {
  isMobileViewport?: boolean;
  manualRedactions?: ManualRedaction[];
  onCreateManual?: Mock<(payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void>;
  onUpdateManual?: Mock<(id: string, box: BoundingBox) => void>;
  spans?: Array<{ box: BoundingBox; text: string }>;
  toolMode: 'select' | 'draw' | null;
}) {
  const bindings = {} as HarnessBindings;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  function Harness() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const textLayerRef = useRef<HTMLDivElement | null>(null);
    const interactions = usePageBoxInteractions({
      isMobileViewport,
      manualRedactions,
      onCreateManual,
      onDismissPendingManuals: vi.fn(),
      onUpdateManual,
      pageRef,
      spans,
      textLayerRef,
      toolMode,
    });

    return (
      <div>
        <div
          ref={(node) => {
            pageRef.current = node;

            if (node) {
              bindings.page = node;
              Object.assign(bindings, interactions);
            }
          }}
        />
        <div
          ref={(node) => {
            textLayerRef.current = node;

            if (node) {
              bindings.textLayer = node;
            }
          }}
        />
      </div>
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  Object.defineProperties(bindings.page, {
    clientHeight: { configurable: true, value: 400 },
    clientWidth: { configurable: true, value: 300 },
  });
  bindings.page.getBoundingClientRect = () =>
    ({
      bottom: 440,
      height: 400,
      left: 40,
      right: 340,
      top: 40,
      width: 300,
      x: 40,
      y: 40,
      toJSON: () => null,
    }) as DOMRect;
  bindings.page.setPointerCapture = vi.fn();
  bindings.page.releasePointerCapture = vi.fn();

  return {
    bindings,
    onCreateManual,
    onUpdateManual,
    root,
  };
}

describe('usePageBoxInteractions', () => {
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

  it('creates a manual box redaction in draw mode', () => {
    const onCreateManual = vi.fn();
    const harness = renderHarness({ onCreateManual, toolMode: 'draw' });
    root = harness.root;

    act(() => {
      harness.bindings.startDrawing(createPointerEvent(harness.bindings.page, 100, 120) as never);
      harness.bindings.movePointer(createPointerEvent(harness.bindings.page, 220, 280) as never);
      harness.bindings.endPointer(createPointerEvent(harness.bindings.page, 220, 280) as never);
    });

    const payload = onCreateManual.mock.calls[0]?.[0];

    expect(payload?.mode).toBe('box');
    expect(payload?.box.x).toBeCloseTo(0.2, 5);
    expect(payload?.box.y).toBeCloseTo(0.2, 5);
    expect(payload?.box.width).toBeCloseTo(0.4, 5);
    expect(payload?.box.height).toBeCloseTo(0.4, 5);
  });

  it('creates a text manual redaction from mobile select-box overlap', () => {
    const onCreateManual = vi.fn();
    const harness = renderHarness({
      isMobileViewport: true,
      onCreateManual,
      spans: [
        {
          box: {
            height: 0.12,
            width: 0.26,
            x: 0.28,
            y: 0.34,
          },
          text: 'john@example.com',
        },
      ],
      toolMode: 'select',
    });
    root = harness.root;

    act(() => {
      harness.bindings.startDrawing(createPointerEvent(harness.bindings.page, 110, 150) as never);
      harness.bindings.movePointer(createPointerEvent(harness.bindings.page, 210, 230) as never);
      harness.bindings.endPointer(createPointerEvent(harness.bindings.page, 210, 230) as never);
    });

    expect(onCreateManual).toHaveBeenCalledWith({
      box: {
        height: 0.12,
        width: 0.26,
        x: 0.28,
        y: 0.34,
      },
      mode: 'text',
      snippet: 'john@example.com',
    });
  });

  it('updates a dragged manual redaction box', () => {
    const manualRedaction: ManualRedaction = {
      box: {
        height: 0.1,
        width: 0.2,
        x: 0.2,
        y: 0.25,
      },
      id: 'manual-1',
      mode: 'box',
      pageIndex: 0,
      status: 'unconfirmed',
    };
    const onUpdateManual = vi.fn();
    const harness = renderHarness({
      manualRedactions: [manualRedaction],
      onUpdateManual,
      toolMode: null,
    });
    root = harness.root;

    act(() => {
      harness.bindings.beginManualDrag(
        {
          ...createPointerEvent(harness.bindings.page, 130, 170),
          stopPropagation: vi.fn(),
        } as never,
        manualRedaction,
      );
      harness.bindings.movePointer(createPointerEvent(harness.bindings.page, 160, 210) as never);
      harness.bindings.endPointer(createPointerEvent(harness.bindings.page, 160, 210) as never);
    });

    const updateCall = onUpdateManual.mock.calls[0];

    expect(updateCall?.[0]).toBe('manual-1');
    expect(updateCall?.[1].x).toBeCloseTo(0.3, 5);
    expect(updateCall?.[1].y).toBeCloseTo(0.35, 5);
    expect(updateCall?.[1].width).toBeCloseTo(0.2, 5);
    expect(updateCall?.[1].height).toBeCloseTo(0.1, 5);
  });
});
