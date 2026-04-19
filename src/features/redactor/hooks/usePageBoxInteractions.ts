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
  drawMode,
  pageRef,
  textLayerRef,
  onCreateManual,
  onUpdateManual,
}: {
  drawMode: boolean;
  pageRef: RefObject<HTMLDivElement | null>;
  textLayerRef: RefObject<HTMLDivElement | null>;
  onCreateManual: (payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onUpdateManual: (id: string, box: BoundingBox) => void;
}) {
  const [draftBox, setDraftBox] = useState<BoundingBox | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<ManualDragState | null>(null);

  const draftBoxRef = useRef<BoundingBox | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<ManualDragState | null>(null);

  useEffect(() => {
    draftBoxRef.current = draftBox;
  }, [draftBox]);

  useEffect(() => {
    drawingStartRef.current = drawingStart;
  }, [drawingStart]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

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
    if (!drawMode || event.button !== 0) {
      return;
    }

    const point = getNormalizedPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawingStart(point);
    setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrawingStart = drawingStartRef.current;
    if (activeDrawingStart) {
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
    if (!activeDragState || drawMode) {
      return;
    }

    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const deltaX = (event.clientX - activeDragState.pointerX) / rect.width;
    const deltaY = (event.clientY - activeDragState.pointerY) / rect.height;
    onUpdateManual(
      activeDragState.id,
      normalizeBox({
        x: activeDragState.origin.x + deltaX,
        y: activeDragState.origin.y + deltaY,
        width: activeDragState.origin.width,
        height: activeDragState.origin.height,
      }),
    );
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawingStartRef.current && draftBoxRef.current) {
      if (
        draftBoxRef.current.width > REDACTOR_INTERACTION.minManualBoxSize &&
        draftBoxRef.current.height > REDACTOR_INTERACTION.minManualBoxSize
      ) {
        onCreateManual({ box: draftBoxRef.current, mode: 'box' });
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      setDrawingStart(null);
      setDraftBox(null);
    }

    if (dragStateRef.current) {
      pageRef.current?.releasePointerCapture(event.pointerId);
      setDragState(null);
    }
  };

  const handleTextSelection = () => {
    if (drawMode || !pageRef.current || !textLayerRef.current) {
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
    if (drawMode || event.button !== 0) {
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
  };

  return {
    beginManualDrag,
    draftBox,
    endPointer,
    handleTextSelection,
    movePointer,
    startDrawing,
  };
}
