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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
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
          totalPages={pages.length}
        />
      ))}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
          — end of document —
        </span>
      </div>
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
  totalPages,
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
  totalPages: number;
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

  useEffect(() => { draftBoxRef.current = draftBox; }, [draftBox]);
  useEffect(() => { drawingStartRef.current = drawingStart; }, [drawingStart]);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

  const getNormalizedPoint = (clientX: number, clientY: number) => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) };
  };

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawMode || event.button !== 0) return;
    const point = getNormalizedPoint(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawingStart(point);
    setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrawingStart = drawingStartRef.current;
    if (activeDrawingStart) {
      const point = getNormalizedPoint(event.clientX, event.clientY);
      if (!point) return;
      setDraftBox(normalizeBox({
        x: Math.min(activeDrawingStart.x, point.x),
        y: Math.min(activeDrawingStart.y, point.y),
        width: Math.abs(point.x - activeDrawingStart.x),
        height: Math.abs(point.y - activeDrawingStart.y),
      }));
      return;
    }

    const activeDragState = dragStateRef.current;
    if (!activeDragState || drawMode) return;
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const deltaX = (event.clientX - activeDragState.pointerX) / rect.width;
    const deltaY = (event.clientY - activeDragState.pointerY) / rect.height;
    onUpdateManual(activeDragState.id, normalizeBox({
      x: activeDragState.origin.x + deltaX,
      y: activeDragState.origin.y + deltaY,
      width: activeDragState.origin.width,
      height: activeDragState.origin.height,
    }));
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
    if (drawMode || !pageRef.current || !textLayerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text) return;
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const boxes = Array.from(range.getClientRects())
      .map((rect) => normalizeBox({
        x: (rect.left - pageRect.left) / pageRect.width,
        y: (rect.top - pageRect.top) / pageRect.height,
        width: rect.width / pageRect.width,
        height: rect.height / pageRect.height,
      }))
      .filter((box) => box.width > 0.002 && box.height > 0.002);
    if (boxes.length) {
      onCreateManual({ box: unionBoxes(boxes), mode: 'text', snippet: text });
    }
    selection.removeAllRanges();
  };

  const onManualPointerDown = (event: ReactPointerEvent<HTMLDivElement>, redaction: ManualRedaction) => {
    if (drawMode || event.button !== 0) return;
    event.stopPropagation();
    pageRef.current?.setPointerCapture(event.pointerId);
    setDragState({ id: redaction.id, origin: redaction.box, pointerX: event.clientX, pointerY: event.clientY });
  };

  const pageLabel = page.lane === 'ocr' ? 'OCR lane' : 'Native text';
  const displayWidth = page.width * page.previewScale * zoom;
  const pendingCount = detections.filter((d) => d.status === 'suggested').length;

  return (
    <div id={id} onClick={onActivate}>
      {/* Page header strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
            }}
          >
            Page {page.pageIndex + 1} / {totalPages}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
              background: page.lane === 'ocr' ? 'var(--surface-1)' : 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            {page.lane === 'ocr' ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
            )}
            {page.lane === 'ocr' ? 'ocr lane' : 'native text'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
          {pendingCount > 0 ? (
            <span><span style={{ color: 'var(--risk-ink)' }}>●</span> {pendingCount} pending</span>
          ) : (
            <span><span style={{ color: 'var(--safe)' }}>●</span> page clean</span>
          )}
        </div>
      </div>

      {/* Page card */}
      <div
        ref={pageRef}
        className={clsx(drawMode ? 'cursor-crosshair' : 'cursor-default')}
        style={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: '100%',
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid var(--page-edge)',
          background: 'var(--page-paper)',
          boxShadow: '0 1px 0 var(--page-edge), 0 16px 40px -24px rgba(20,16,10,0.18)',
          width: `${displayWidth}px`,
        }}
        onPointerDown={startDrawing}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onMouseUp={handleTextSelection}
      >
        {preview?.status === 'ready' && preview.url ? (
          <img src={preview.url} alt={`Preview of page ${page.pageIndex + 1}`} className="block w-full" draggable={false} />
        ) : preview?.status === 'error' ? (
          <div style={{ display: 'flex', minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', fontSize: 14, color: 'var(--error)' }}>
            {preview.error}
          </div>
        ) : (
          <div style={{ display: 'flex', minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
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
              className="pointer-events-auto absolute rounded-sm border transition"
              style={{
                left: toPercent(detection.box.x),
                top: toPercent(detection.box.y),
                width: toPercent(detection.box.width),
                height: toPercent(detection.box.height),
                borderColor: detection.status === 'approved'
                  ? 'var(--safe)'
                  : detection.status === 'suggested'
                  ? 'var(--risk)'
                  : 'var(--line-strong)',
                background: detection.status === 'approved'
                  ? 'rgba(16, 185, 129, 0.18)'
                  : detection.status === 'suggested'
                  ? 'var(--risk-soft)'
                  : 'rgba(217, 217, 223, 0.18)',
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
              className="pointer-events-auto absolute"
              style={{
                left: toPercent(redaction.box.x),
                top: toPercent(redaction.box.y),
                width: toPercent(redaction.box.width),
                height: toPercent(redaction.box.height),
                borderRadius: 2,
                border: redaction.status === 'rejected' ? '2px solid var(--line-strong)' : '2px solid rgba(0,0,0,0.8)',
                background: redaction.status === 'rejected' ? 'rgba(217, 217, 223, 0.2)' : 'rgba(0,0,0,0.2)',
              }}
              onPointerDown={(event) => onManualPointerDown(event, redaction)}
            >
              <div className="absolute -top-3 right-0 flex gap-1">
                <button
                  type="button"
                  style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'var(--paper)',
                    border: '1px solid var(--line-strong)',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--ink-2)',
                    cursor: 'pointer',
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetManualStatus(redaction.id, nextStatus(redaction.status));
                  }}
                >
                  {redaction.status}
                </button>
                <button
                  type="button"
                  style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'var(--paper)',
                    border: '1px solid var(--line-strong)',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--error)',
                    cursor: 'pointer',
                  }}
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
              className="absolute rounded-sm border-2 border-dashed"
              style={{
                left: toPercent(draftBox.x),
                top: toPercent(draftBox.y),
                width: toPercent(draftBox.width),
                height: toPercent(draftBox.height),
                borderColor: 'var(--ink)',
                background: 'rgba(17, 17, 17, 0.12)',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const nextStatus = (status: DetectionStatus): DetectionStatus => {
  if (status === 'suggested') return 'approved';
  if (status === 'approved') return 'rejected';
  return 'suggested';
};
