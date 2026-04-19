import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import type {
  BoundingBox,
  Detection,
  DetectionStatus,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  TextSpan,
} from '../../lib/types';
import { clamp, normalizeBox, toPercent, unionBoxes } from '../../lib/utils';

type ManualDragState = {
  id: string;
  origin: BoundingBox;
  pointerX: number;
  pointerY: number;
};

export function PdfViewer({
  pages,
  activePage,
  zoom,
  drawMode,
  previews,
  spansByPage,
  detections,
  manualRedactions,
  onActivatePage,
  onEnsurePreview,
  onCreateManual,
  onUpdateManual,
  onRemoveManual,
  onToggleDetection,
  onSetManualStatus,
}: {
  pages: PageAsset[];
  activePage: number;
  zoom: number;
  drawMode: boolean;
  previews: Record<number, PreviewAsset>;
  spansByPage: Map<number, TextSpan[]>;
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  onActivatePage: (pageIndex: number) => void;
  onEnsurePreview: (pageIndex: number) => Promise<void>;
  onCreateManual: (pageIndex: number, payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onUpdateManual: (id: string, box: BoundingBox) => void;
  onRemoveManual: (id: string) => void;
  onToggleDetection: (id: string) => void;
  onSetManualStatus: (id: string, status: DetectionStatus) => void;
}) {
  return (
    <div className="space-y-5">
      {pages.map((page) => (
        <PagePreviewCard
          key={page.pageIndex}
          id={`page-${page.pageIndex}`}
          page={page}
          preview={previews[page.pageIndex]}
          active={activePage === page.pageIndex}
          zoom={zoom}
          drawMode={drawMode}
          spans={spansByPage.get(page.pageIndex) ?? []}
          detections={detections.filter((detection) => detection.pageIndex === page.pageIndex)}
          manualRedactions={manualRedactions.filter((redaction) => redaction.pageIndex === page.pageIndex)}
          onActivate={() => onActivatePage(page.pageIndex)}
          onEnsurePreview={() => onEnsurePreview(page.pageIndex)}
          onCreateManual={(payload) => onCreateManual(page.pageIndex, payload)}
          onUpdateManual={onUpdateManual}
          onRemoveManual={onRemoveManual}
          onToggleDetection={onToggleDetection}
          onSetManualStatus={onSetManualStatus}
        />
      ))}
    </div>
  );
}

function PagePreviewCard({
  id,
  page,
  preview,
  active,
  zoom,
  drawMode,
  spans,
  detections,
  manualRedactions,
  onActivate,
  onEnsurePreview,
  onCreateManual,
  onUpdateManual,
  onRemoveManual,
  onToggleDetection,
  onSetManualStatus,
}: {
  id: string;
  page: PageAsset;
  preview?: PreviewAsset;
  active: boolean;
  zoom: number;
  drawMode: boolean;
  spans: TextSpan[];
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  onActivate: () => void;
  onEnsurePreview: () => Promise<void>;
  onCreateManual: (payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onUpdateManual: (id: string, box: BoundingBox) => void;
  onRemoveManual: (id: string) => void;
  onToggleDetection: (id: string) => void;
  onSetManualStatus: (id: string, status: DetectionStatus) => void;
}) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const [draftBox, setDraftBox] = useState<BoundingBox | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<ManualDragState | null>(null);
  const draftBoxRef = useRef<BoundingBox | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<ManualDragState | null>(null);

  useEffect(() => {
    if (!preview || preview.status === 'idle') {
      onEnsurePreview();
    }
  }, [onEnsurePreview, preview]);

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
      if (draftBoxRef.current.width > 0.01 && draftBoxRef.current.height > 0.01) {
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

    const text = selection.toString().trim();
    if (!text) {
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
      .filter((box) => box.width > 0.002 && box.height > 0.002);

    if (boxes.length) {
      onCreateManual({ box: unionBoxes(boxes), mode: 'text', snippet: text });
    }

    selection.removeAllRanges();
  };

  const onManualPointerDown = (event: ReactPointerEvent<HTMLDivElement>, redaction: ManualRedaction) => {
    if (drawMode || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    pageRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      id: redaction.id,
      origin: redaction.box,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  };

  const pageLabel = page.lane === 'ocr' ? 'OCR lane' : 'Searchable text lane';
  const displayWidth = page.width * page.previewScale * zoom;

  return (
    <section
      id={id}
      className={clsx(
        'rounded-[1.75rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(252,248,240,0.72))] p-4 shadow-[0_16px_50px_rgba(53,43,23,0.08)] transition',
        active ? 'border-[#286f69]/45 ring-2 ring-[#286f69]/15' : 'border-white/70',
      )}
      onClick={onActivate}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Page {page.pageIndex + 1}</h3>
          <p className="text-sm text-stone-600">
            {pageLabel} • OCR status: {page.ocrStatus}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-stone-500">
          <span className="rounded-full bg-white px-3 py-1">click highlights to cycle status</span>
          <span className="rounded-full bg-white px-3 py-1">{drawMode ? 'draw mode on' : 'select text or drag manual boxes'}</span>
        </div>
      </div>

      <div
        ref={pageRef}
        className={clsx(
          'relative mx-auto inline-block max-w-full overflow-hidden rounded-[1.35rem] border border-stone-200 bg-white shadow-inner',
          drawMode ? 'cursor-crosshair' : 'cursor-default',
        )}
        style={{ width: `${displayWidth}px` }}
        onPointerDown={startDrawing}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onMouseUp={handleTextSelection}
      >
        {preview?.status === 'ready' && preview.url ? (
          <img src={preview.url} alt={`Preview of page ${page.pageIndex + 1}`} className="block w-full" draggable={false} />
        ) : preview?.status === 'error' ? (
          <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-rose-700">{preview.error}</div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-stone-600">
            Rendering page preview locally.
          </div>
        )}

        <div ref={textLayerRef} className={clsx('selection-text-layer absolute inset-0', drawMode && 'pointer-events-none select-none')}>
          {spans.map((span) => (
            <span
              key={span.id}
              style={{
                left: toPercent(span.box.x),
                top: toPercent(span.box.y),
                width: toPercent(span.box.width),
                height: toPercent(span.box.height),
                fontSize: `${Math.max(11, span.box.height * 1000)}%`,
                lineHeight: `${Math.max(1.1, span.box.height * 40)}`,
              }}
            >
              {span.text}
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0">
          {detections.map((detection) => (
            <button
              key={detection.id}
              type="button"
              className={clsx(
                'pointer-events-auto absolute rounded-md border transition',
                detection.status === 'approved' && 'border-[#286f69] bg-[#286f69]/18',
                detection.status === 'suggested' && 'border-[#d26c36] bg-[#d26c36]/18',
                detection.status === 'rejected' && 'border-stone-400 bg-stone-300/18',
              )}
              style={{
                left: toPercent(detection.box.x),
                top: toPercent(detection.box.y),
                width: toPercent(detection.box.width),
                height: toPercent(detection.box.height),
              }}
              onClick={(event) => {
                event.stopPropagation();
                onToggleDetection(detection.id);
              }}
              aria-label={`Toggle ${detection.snippet}`}
            />
          ))}

          {manualRedactions.map((redaction) => (
            <div
              key={redaction.id}
              className={clsx(
                'pointer-events-auto absolute rounded-md border-2 border-black/80 bg-black/20',
                redaction.status === 'rejected' && 'border-stone-400 bg-stone-300/20',
              )}
              style={{
                left: toPercent(redaction.box.x),
                top: toPercent(redaction.box.y),
                width: toPercent(redaction.box.width),
                height: toPercent(redaction.box.height),
              }}
              onPointerDown={(event) => onManualPointerDown(event, redaction)}
            >
              <div className="absolute -top-3 right-0 flex gap-1">
                <button
                  type="button"
                  className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 shadow"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetManualStatus(redaction.id, nextStatus(redaction.status));
                  }}
                >
                  {redaction.status}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 shadow"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveManual(redaction.id);
                  }}
                >
                  remove
                </button>
              </div>
            </div>
          ))}

          {draftBox ? (
            <div
              className="absolute rounded-md border-2 border-dashed border-[#286f69] bg-[#286f69]/18"
              style={{
                left: toPercent(draftBox.x),
                top: toPercent(draftBox.y),
                width: toPercent(draftBox.width),
                height: toPercent(draftBox.height),
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

const nextStatus = (status: DetectionStatus): DetectionStatus => {
  if (status === 'suggested') return 'approved';
  if (status === 'approved') return 'rejected';
  return 'suggested';
};
