import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { Button, StatusDot } from '../../components/ui';
import type {
  BoundingBox,
  Detection,
  DetectionStatus,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  TextSpan,
} from '../../lib/types';
import { toPercent } from '../../lib/utils';
import { usePageBoxInteractions } from '../../features/redactor/hooks/usePageBoxInteractions';
import { getPageAnchorId, getPreviewDisplayState, nextDetectionStatus } from '../../features/redactor';

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
    <div className="pdf-viewer flex flex-col gap-7">
      {pages.map((page) => (
        <PagePreviewCard
          active={activePage === page.pageIndex}
          detections={detections.filter((detection) => detection.pageIndex === page.pageIndex)}
          drawMode={drawMode}
          id={getPageAnchorId(page.pageIndex)}
          key={page.pageIndex}
          manualRedactions={manualRedactions.filter((manualRedaction) => manualRedaction.pageIndex === page.pageIndex)}
          onActivate={() => onActivatePage(page.pageIndex)}
          onCreateManual={(payload) => onCreateManual(page.pageIndex, payload)}
          onEnsurePreview={() => onEnsurePreview(page.pageIndex)}
          onRemoveManual={onRemoveManual}
          onSetManualStatus={onSetManualStatus}
          onToggleDetection={onToggleDetection}
          onUpdateManual={onUpdateManual}
          page={page}
          preview={previews[page.pageIndex]}
          spans={spansByPage.get(page.pageIndex) ?? []}
          totalPages={pages.length}
          zoom={zoom}
        />
      ))}

      <div className="mt-2 text-center">
        <span className="font-mono text-[10.5px] tracking-[0.14em] text-content-subtle">
          - end of document -
        </span>
      </div>
    </div>
  );
}

function getBoxStyle(box: BoundingBox, extra?: Record<string, string>): CSSProperties {
  return {
    '--box-left': toPercent(box.x),
    '--box-top': toPercent(box.y),
    '--box-width': toPercent(box.width),
    '--box-height': toPercent(box.height),
    ...extra,
  } as CSSProperties;
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
  const {
    beginManualDrag,
    draftBox,
    endPointer,
    handleTextSelection,
    movePointer,
    startDrawing,
  } = usePageBoxInteractions({
    drawMode,
    onCreateManual,
    onUpdateManual,
    pageRef,
    textLayerRef,
  });

  useEffect(() => {
    if (!preview || preview.status === 'idle') {
      void onEnsurePreview();
    }
  }, [onEnsurePreview, preview]);

  const pageLabel = page.lane === 'ocr' ? 'ocr lane' : 'native text';
  const pageDisplayWidth = page.width * page.previewScale * zoom;
  const pendingCount = detections.filter((detection) => detection.status === 'suggested').length;

  return (
    <div id={id} onClick={onActivate}>
      <PageHeader
        active={active}
        pageIndex={page.pageIndex}
        pageLabel={pageLabel}
        pendingCount={pendingCount}
        totalPages={totalPages}
      />

      <div
        ref={pageRef}
        className={cn(
          'viewer-page-surface relative inline-block w-[var(--page-display-width)] max-w-full overflow-hidden',
          drawMode ? 'cursor-crosshair' : 'cursor-default',
        )}
        onMouseUp={handleTextSelection}
        onPointerCancel={endPointer}
        onPointerDown={startDrawing}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        style={{ '--page-display-width': `${pageDisplayWidth}px` } as CSSProperties}
      >
        <PagePreviewState pageIndex={page.pageIndex} preview={preview} />

        <div
          ref={textLayerRef}
          className={cn('selection-text-layer absolute inset-0', drawMode && 'pointer-events-none select-none')}
        >
          {spans.map((span) => (
            <span
              className="pdf-box pdf-text-span"
              key={span.id}
              style={getBoxStyle(span.box, {
                '--span-font-size': `${Math.max(11, span.box.height * 1000)}%`,
                '--span-line-height': `${Math.max(1.1, span.box.height * 40)}`,
              })}
            >
              {span.text}
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0">
          <DetectionOverlay detections={detections} onToggleDetection={onToggleDetection} />
          <ManualRedactionOverlay
            draftBox={draftBox}
            manualRedactions={manualRedactions}
            onRemoveManual={onRemoveManual}
            onSetManualStatus={onSetManualStatus}
            onStartDrag={beginManualDrag}
          />
        </div>
      </div>
    </div>
  );
}

function PageHeader({
  active,
  pageIndex,
  pageLabel,
  pendingCount,
  totalPages,
}: {
  active: boolean;
  pageIndex: number;
  pageLabel: string;
  pendingCount: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between px-1 pb-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'font-mono text-[10.5px] uppercase tracking-[0.14em]',
            active ? 'text-content' : 'text-content-subtle',
          )}
        >
          Page {pageIndex + 1} / {totalPages}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.75 text-[11px] lowercase text-content-muted">
          {pageLabel === 'ocr lane' ? (
            <ImageIcon size={10} strokeWidth={1.5} />
          ) : (
            <FileText size={10} strokeWidth={1.5} />
          )}
          {pageLabel}
        </span>
      </div>

      <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.04em] text-content-subtle">
        {pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="warning" />
            {pendingCount} pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="safe" />
            page clean
          </span>
        )}
      </div>
    </div>
  );
}

function PagePreviewState({
  pageIndex,
  preview,
}: {
  pageIndex: number;
  preview?: PreviewAsset;
}) {
  const displayState = getPreviewDisplayState(preview);

  if (displayState === 'ready' && preview?.url) {
    return <img alt={`Preview of page ${pageIndex + 1}`} className="block w-full" draggable={false} src={preview.url} />;
  }

  if (displayState === 'error') {
    return (
      <div className="flex min-h-64 items-center justify-center px-6 py-10 text-center text-sm text-danger">
        {preview?.error}
      </div>
    );
  }

  return (
    <div className="flex min-h-64 items-center justify-center px-6 py-10 text-center text-sm text-content-subtle">
      Rendering page preview locally.
    </div>
  );
}

function DetectionOverlay({
  detections,
  onToggleDetection,
}: {
  detections: Detection[];
  onToggleDetection: (id: string) => void;
}) {
  return (
    <>
      {detections.map((detection) => (
        <button
          aria-label={`Toggle ${detection.snippet}`}
          className={cn(
            'pdf-box pdf-detection pointer-events-auto rounded-sm border transition',
            detection.status === 'approved'
              ? 'border-success bg-success/[0.18]'
              : detection.status === 'suggested'
                ? 'border-warning bg-warning/[0.14]'
                : 'border-border-strong bg-border-strong/[0.18]',
          )}
          key={detection.id}
          onClick={(event) => {
            event.stopPropagation();
            onToggleDetection(detection.id);
          }}
          style={getBoxStyle(detection.box)}
          type="button"
        />
      ))}
    </>
  );
}

function ManualRedactionOverlay({
  manualRedactions,
  draftBox,
  onStartDrag,
  onSetManualStatus,
  onRemoveManual,
}: {
  manualRedactions: ManualRedaction[];
  draftBox: BoundingBox | null;
  onStartDrag: (event: ReactPointerEvent<HTMLDivElement>, manualRedaction: ManualRedaction) => void;
  onSetManualStatus: (id: string, status: DetectionStatus) => void;
  onRemoveManual: (id: string) => void;
}) {
  return (
    <>
      {manualRedactions.map((manualRedaction) => (
        <div
          className={cn(
            'pdf-box pdf-manual pointer-events-auto rounded-sm border-2',
            manualRedaction.status === 'rejected'
              ? 'border-border-strong bg-border-strong/20'
              : 'border-content bg-content/20',
          )}
          key={manualRedaction.id}
          onPointerDown={(event) => onStartDrag(event, manualRedaction)}
          style={getBoxStyle(manualRedaction.box)}
        >
          <div className="absolute -top-3 right-0 flex gap-1">
            <Button
              className="h-5 rounded-[4px] border-border-strong bg-surface px-1.5 text-[10px] text-content-muted"
              onClick={(event) => {
                event.stopPropagation();
                onSetManualStatus(manualRedaction.id, nextDetectionStatus(manualRedaction.status));
              }}
              size="sm"
              variant="secondary"
            >
              {manualRedaction.status}
            </Button>
            <Button
              className="h-5 rounded-[4px] px-1.5 text-[10px]"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveManual(manualRedaction.id);
              }}
              size="sm"
              variant="danger"
            >
              remove
            </Button>
          </div>
        </div>
      ))}

      {draftBox ? (
        <div
          className="pdf-box absolute rounded-sm border-2 border-dashed border-content bg-brand-soft"
          style={getBoxStyle(draftBox)}
        />
      ) : null}
    </>
  );
}
