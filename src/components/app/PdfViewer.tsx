import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Check, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';

import { IconButton, StatusDot } from '../../components/ui';
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
import { getPageAnchorId, getPreviewDisplayState } from '../../features/redactor';

export function PdfViewer({
  pages,
  activePage,
  viewerContentWidth,
  zoom,
  drawMode,
  previews,
  spansByPage,
  detections,
  manualRedactions,
  onActivatePage,
  onEnsurePreview,
  onCreateManual,
  onDismissPendingManuals,
  onUpdateManual,
  onRemoveManual,
  onToggleDetection,
  onSetManualStatus,
}: {
  pages: PageAsset[];
  activePage: number;
  viewerContentWidth: number;
  zoom: number;
  drawMode: boolean;
  previews: Record<number, PreviewAsset>;
  spansByPage: Map<number, TextSpan[]>;
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  onActivatePage: (pageIndex: number) => void;
  onEnsurePreview: (pageIndex: number) => Promise<void>;
  onCreateManual: (pageIndex: number, payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onDismissPendingManuals: () => void;
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
          onDismissPendingManuals={onDismissPendingManuals}
          onEnsurePreview={() => onEnsurePreview(page.pageIndex)}
          onRemoveManual={onRemoveManual}
          onSetManualStatus={onSetManualStatus}
          onToggleDetection={onToggleDetection}
          onUpdateManual={onUpdateManual}
          page={page}
          preview={previews[page.pageIndex]}
          spans={spansByPage.get(page.pageIndex) ?? []}
          totalPages={pages.length}
          viewerContentWidth={viewerContentWidth}
          zoom={zoom}
        />
      ))}

      <div className="mt-2 text-center">
        <span className="ui-text-label font-mono tracking-ui-data text-content-subtle">
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
  viewerContentWidth,
  zoom,
  drawMode,
  spans,
  detections,
  manualRedactions,
  onActivate,
  onEnsurePreview,
  onCreateManual,
  onDismissPendingManuals,
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
  viewerContentWidth: number;
  zoom: number;
  drawMode: boolean;
  spans: TextSpan[];
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  onActivate: () => void;
  onEnsurePreview: () => Promise<void>;
  onCreateManual: (payload: { box: BoundingBox; mode: 'text' | 'box'; snippet?: string }) => void;
  onDismissPendingManuals: () => void;
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
    manualRedactions,
    onCreateManual,
    onDismissPendingManuals,
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
  const fitWidthScale = viewerContentWidth / Math.max(page.width * page.previewScale, 1);
  const pageBaseWidth = page.width * page.previewScale * fitWidthScale;
  const pageDisplayWidth = pageBaseWidth * zoom;
  const pageDisplayHeight = page.height * page.previewScale * fitWidthScale * zoom;
  const pendingCount = detections.filter((detection) => detection.status === 'suggested').length;

  return (
    <div id={id} onClick={onActivate}>
      <PageHeader
        active={active}
        headerWidth={pageBaseWidth}
        pageIndex={page.pageIndex}
        pageLabel={pageLabel}
        pendingCount={pendingCount}
        totalPages={totalPages}
      />

      <div
        ref={pageRef}
        className={cn(
          'viewer-page-surface relative inline-block w-[var(--page-display-width)] overflow-hidden',
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
                '--span-font-size': `${Math.max(10, span.box.height * pageDisplayHeight)}px`,
                '--span-line-height': `${Math.max(10, span.box.height * pageDisplayHeight)}px`,
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
  headerWidth,
  pageIndex,
  pageLabel,
  pendingCount,
  totalPages,
}: {
  active: boolean;
  headerWidth: number;
  pageIndex: number;
  pageLabel: string;
  pendingCount: number;
  totalPages: number;
}) {
  return (
    <div
      className="sticky left-0 z-[1] flex items-center justify-between px-1 pb-2.5"
      style={{ width: `${headerWidth}px` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'ui-text-label font-mono uppercase tracking-ui-data',
            active ? 'text-content' : 'text-content-subtle',
          )}
        >
          Page {pageIndex + 1} / {totalPages}
        </span>

        <span className="ui-text-caption inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.75 lowercase text-content-muted">
          {pageLabel === 'ocr lane' ? (
            <ImageIcon size={10} strokeWidth={1.5} />
          ) : (
            <FileText size={10} strokeWidth={1.5} />
          )}
          {pageLabel}
        </span>
      </div>

      <div className="ui-text-label flex items-center gap-2.5 font-mono tracking-ui-tight text-content-subtle">
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
            manualRedaction.status === 'approved'
              ? 'border-success bg-success/[0.18]'
              : manualRedaction.status === 'rejected'
                ? 'border-border-strong bg-border-strong/20'
                : 'border-warning border-dashed bg-warning/[0.14]',
          )}
          key={manualRedaction.id}
          data-manual-pending={manualRedaction.status === 'suggested' ? 'true' : undefined}
          onPointerDown={(event) => {
            if (manualRedaction.status !== 'suggested') {
              return;
            }

            onStartDrag(event, manualRedaction);
          }}
          style={getBoxStyle(manualRedaction.box)}
        >
          {manualRedaction.status === 'suggested' ? (
            <div
              className="absolute bottom-full right-0 z-10 mb-1.5 flex gap-1 rounded-full bg-canvas/92 p-1 shadow-lg ring-1 ring-border-strong backdrop-blur-sm"
              data-manual-pending="true"
            >
              <IconButton
                aria-label="Approve manual highlight"
                className="opacity-100 shadow-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetManualStatus(manualRedaction.id, 'approved');
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                shape="pill"
                size="sm"
                tone="surface"
              >
                <Check size={12} strokeWidth={2} />
              </IconButton>
              <IconButton
                aria-label="Remove manual highlight"
                className="opacity-100 shadow-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveManual(manualRedaction.id);
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                shape="pill"
                size="sm"
                tone="danger"
              >
                <Trash2 size={12} strokeWidth={2} />
              </IconButton>
            </div>
          ) : null}
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
