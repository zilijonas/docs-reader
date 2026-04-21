import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { BoundingBox, ManualRedaction } from '../../../lib/types';
import { clamp, normalizeBox, unionBoxes } from '../../../lib/utils';
import { REDACTOR_INTERACTION } from '../config';

type ManualDragState = {
  id: string;
  origin: BoundingBox;
  pointerX: number;
  pointerY: number;
};

export function usePageBoxInteractions({
  toolMode,
  isMobileViewport,
  manualRedactions,
  pageRef,
  spans,
  textLayerRef,
  onCreateManual,
  onDismissPendingManuals,
  onUpdateManual,
}: {
  toolMode: 'select' | 'draw' | null;
  isMobileViewport: boolean;
  manualRedactions: ManualRedaction[];
  pageRef: RefObject<HTMLDivElement | null>;
  spans: Array<{ box: BoundingBox; text: string }>;
  textLayerRef: RefObject<HTMLDivElement | null>;
  onCreateManual: (payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onDismissPendingManuals: () => void;
  onUpdateManual: (id: string, box: BoundingBox) => void;
}) {
  const [draftBox, setDraftBox] = useState<BoundingBox | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<ManualDragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; box: BoundingBox } | null>(null);
  const activeDraftModeRef = useRef<'box' | 'touch-text' | null>(null);

  const draftBoxRef = useRef<BoundingBox | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<ManualDragState | null>(null);
  const dragPreviewRef = useRef<{ id: string; box: BoundingBox } | null>(null);

  useEffect(() => {
    draftBoxRef.current = draftBox;
  }, [draftBox]);

  useEffect(() => {
    drawingStartRef.current = drawingStart;
  }, [drawingStart]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  useEffect(() => {
    const hasPendingManual = manualRedactions.some((manualRedaction) => manualRedaction.status === 'unconfirmed');
    if (!hasPendingManual) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('[data-manual-pending="true"]') || target.closest('[data-keep-pending-manuals="true"]')) {
        return;
      }

      onDismissPendingManuals();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [manualRedactions, onDismissPendingManuals]);

  const getNormalizedPoint = (clientX: number, clientY: number) => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const point = getNormalizedPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    if (toolMode === null) {
      return;
    }

    if (toolMode === 'select' && !isMobileViewport) {
      return;
    }

    if (isMobileViewport) {
      event.preventDefault();
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activeDraftModeRef.current = toolMode === 'draw' ? 'box' : 'touch-text';
    setDrawingStart(point);
    setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrawingStart = drawingStartRef.current;
    if (activeDrawingStart) {
      if (isMobileViewport) {
        event.preventDefault();
      }

      const point = getNormalizedPoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      setDraftBox(
        normalizeBox({
          x: Math.min(activeDrawingStart.x, point.x),
          y: Math.min(activeDrawingStart.y, point.y),
          width: Math.abs(point.x - activeDrawingStart.x),
          height: Math.abs(point.y - activeDrawingStart.y),
        }),
      );
      return;
    }

    const activeDragState = dragStateRef.current;
    if (!activeDragState || toolMode === 'draw') {
      return;
    }

    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const deltaX = (event.clientX - activeDragState.pointerX) / rect.width;
    const deltaY = (event.clientY - activeDragState.pointerY) / rect.height;
    setDragPreview({
      id: activeDragState.id,
      box: normalizeBox({
        x: activeDragState.origin.x + deltaX,
        y: activeDragState.origin.y + deltaY,
        width: activeDragState.origin.width,
        height: activeDragState.origin.height,
      }),
    });
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawingStartRef.current && draftBoxRef.current) {
      if (isMobileViewport) {
        event.preventDefault();
      }

      if (
        activeDraftModeRef.current === 'box' &&
        draftBoxRef.current.width > REDACTOR_INTERACTION.minManualBoxSize &&
        draftBoxRef.current.height > REDACTOR_INTERACTION.minManualBoxSize
      ) {
        onCreateManual({ box: draftBoxRef.current, mode: 'box' });
      }

      if (
        activeDraftModeRef.current === 'touch-text' &&
        draftBoxRef.current.width > REDACTOR_INTERACTION.minTextSelectionBoxSize &&
        draftBoxRef.current.height > REDACTOR_INTERACTION.minTextSelectionBoxSize
      ) {
        const selectedSpans = spans.filter((span) => boxesOverlap(span.box, draftBoxRef.current!));

        if (selectedSpans.length > 0) {
          onCreateManual({
            box: unionBoxes(selectedSpans.map((span) => span.box)),
            mode: 'text',
            snippet: selectedSpans.map((span) => span.text).join(' ').replace(/\s+/g, ' ').trim(),
          });
        }
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      activeDraftModeRef.current = null;
      setDrawingStart(null);
      setDraftBox(null);
    }

    if (dragStateRef.current) {
      const activeDragState = dragStateRef.current;
      const activeDragPreview = dragPreviewRef.current;

      if (activeDragPreview && !boxesOverlapExactly(activeDragPreview.box, activeDragState.origin)) {
        onUpdateManual(activeDragState.id, activeDragPreview.box);
      }

      pageRef.current?.releasePointerCapture(event.pointerId);
      setDragState(null);
      setDragPreview(null);
    }
  };

  const handleTextSelection = () => {
    if (toolMode !== 'select' || !pageRef.current || !textLayerRef.current) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const pageRect = pageRef.current.getBoundingClientRect();
    const boxes = Array.from(range.getClientRects())
      .map((rect) =>
        normalizeBox({
          x: (rect.left - pageRect.left) / pageRect.width,
          y: (rect.top - pageRect.top) / pageRect.height,
          width: rect.width / pageRect.width,
          height: rect.height / pageRect.height,
        }),
      )
      .filter(
        (box) =>
          box.width > REDACTOR_INTERACTION.minTextSelectionBoxSize &&
          box.height > REDACTOR_INTERACTION.minTextSelectionBoxSize,
      );

    if (boxes.length > 0) {
      onCreateManual({ box: unionBoxes(boxes), mode: 'text', snippet: selectedText });
    }

    selection.removeAllRanges();
  };

  const beginManualDrag = (event: ReactPointerEvent<HTMLDivElement>, manualRedaction: ManualRedaction) => {
    if (toolMode === 'draw' || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    pageRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      id: manualRedaction.id,
      origin: manualRedaction.box,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
    setDragPreview({
      id: manualRedaction.id,
      box: manualRedaction.box,
    });
  };

  return {
    beginManualDrag,
    draftBox,
    dragPreview,
    endPointer,
    handleTextSelection,
    movePointer,
    startDrawing,
  };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function boxesOverlapExactly(a: BoundingBox, b: BoundingBox) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
