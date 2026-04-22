import { useDrag } from '@use-gesture/react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import { REDACTOR_UI } from '../config';
import type { ZoomAnchor } from './zoom-utils';

const DOUBLE_TAP_DISTANCE_PX = 24;
const DOUBLE_TAP_WINDOW_MS = 300;
const PAN_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [data-highlight-focus="true"], [data-manual-pending="true"]';

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PAN_INTERACTIVE_SELECTOR));
}

export function canStartViewerPan({
  target,
  toolMode,
  viewerElement,
  zoom,
}: {
  target: EventTarget | null;
  toolMode: 'select' | 'draw' | null;
  viewerElement: HTMLDivElement | null;
  zoom: number;
}) {
  if (!viewerElement || zoom <= 1 || toolMode !== null || isInteractiveTarget(target)) {
    return false;
  }

  return viewerElement.scrollWidth > viewerElement.clientWidth || viewerElement.scrollHeight > viewerElement.clientHeight;
}

export function getViewerPanScrollPosition({
  movementX,
  movementY,
  scrollLeft,
  scrollTop,
}: {
  movementX: number;
  movementY: number;
  scrollLeft: number;
  scrollTop: number;
}) {
  return {
    scrollLeft: scrollLeft - movementX,
    scrollTop: scrollTop - movementY,
  };
}

export function useViewerPan({
  setZoom,
  toolMode,
  viewerRef,
  zoom,
}: {
  setZoom: (value: number, anchor?: ZoomAnchor) => void;
  toolMode: 'select' | 'draw' | null;
  viewerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
}) {
  const [isPanning, setIsPanning] = useState(false);
  const lastTapRef = useRef<{ clientX: number; clientY: number; timeStamp: number } | null>(null);

  useEffect(() => {
    if (zoom <= 1 || toolMode !== null) {
      setIsPanning(false);
    }
  }, [toolMode, zoom]);

  const bind = useDrag(
    ({ event, first, last, memo, movement: [movementX, movementY], cancel }) => {
      const viewerElement = viewerRef.current;
      let nextMemo = memo;

      if (!viewerElement) {
        cancel();
        setIsPanning(false);
        return nextMemo;
      }

      if (first) {
        if (!canStartViewerPan({ target: event.target, toolMode, viewerElement, zoom })) {
          cancel();
          setIsPanning(false);
          return memo;
        }

        if (event.cancelable) {
          event.preventDefault();
        }

        setIsPanning(true);

        nextMemo = {
          scrollLeft: viewerElement.scrollLeft,
          scrollTop: viewerElement.scrollTop,
        };
      }

      if (!nextMemo) {
        return nextMemo;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const nextScroll = getViewerPanScrollPosition({
        movementX,
        movementY,
        scrollLeft: nextMemo.scrollLeft,
        scrollTop: nextMemo.scrollTop,
      });

      viewerElement.scrollLeft = nextScroll.scrollLeft;
      viewerElement.scrollTop = nextScroll.scrollTop;

      if (last) {
        setIsPanning(false);
      }

      return nextMemo;
    },
    {
      enabled: zoom > 1 && toolMode === null,
      eventOptions: { passive: false },
      filterTaps: true,
      pointer: {
        capture: false,
        keys: false,
        mouse: true,
        touch: true,
      },
      threshold: 3,
    },
  );

  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      toolMode !== null ||
      event.button !== 0 ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }

    const now = event.timeStamp;

    const lastTap = lastTapRef.current;

    if (lastTap && now - lastTap.timeStamp <= DOUBLE_TAP_WINDOW_MS && Math.hypot(event.clientX - lastTap.clientX, event.clientY - lastTap.clientY) <= DOUBLE_TAP_DISTANCE_PX) {
      event.preventDefault();
      lastTapRef.current = null;
      setZoom(zoom > REDACTOR_UI.defaultZoom ? REDACTOR_UI.defaultZoom : 2, {
        clientX: event.clientX,
        clientY: event.clientY,
        source: 'control',
      });
      return;
    }

    lastTapRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: now,
    };
  };

  return {
    bind,
    handlePointerDownCapture,
    isPanning,
  };
}
