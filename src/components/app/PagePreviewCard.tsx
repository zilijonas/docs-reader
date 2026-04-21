import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import type {
  BoundingBox,
  Detection,
  DetectionStatus,
  ManualRedaction,
  PageAsset,
  PreviewAsset,
  TextSpan,
} from '../../types';
import { usePageBoxInteractions } from '../../features/redactor/hooks/usePageBoxInteractions';
import { DetectionOverlay } from './DetectionOverlay';
import { ManualRedactionOverlay } from './ManualRedactionOverlay';
import { PageHeader } from './PageHeader';
import { PagePreviewState } from './PagePreviewState';
import { getBoxStyle } from './pdf-viewer-utils';

const getPageSurfaceStyle = (pageDisplayWidth: number): CSSProperties => ({
  '--page-display-width': `${pageDisplayWidth}px`,
} as CSSProperties);

export function PagePreviewCard({
  id,
  page,
  preview,
  active,
  viewerContentWidth,
  zoom,
  toolMode,
  isMobileViewport,
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
  toolMode: 'select' | 'draw' | null;
  isMobileViewport: boolean;
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
    dragPreview,
    endPointer,
    handleTextSelection,
    movePointer,
    startDrawing,
  } = usePageBoxInteractions({
    toolMode,
    isMobileViewport,
    manualRedactions,
    onCreateManual,
    onDismissPendingManuals,
    onUpdateManual,
    pageRef,
    spans,
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
  const pendingCount =
    detections.filter((detection) => detection.status === 'unconfirmed').length +
    manualRedactions.filter((manualRedaction) => manualRedaction.status === 'unconfirmed').length;
  const isDrawMode = toolMode === 'draw';
  const isMobileTouchToolActive = isMobileViewport && (toolMode === 'select' || toolMode === 'draw');

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
          isMobileTouchToolActive && 'touch-none',
          isDrawMode ? 'cursor-crosshair' : 'cursor-default',
        )}
        onMouseUp={handleTextSelection}
        onPointerCancel={endPointer}
        onPointerDown={startDrawing}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        style={getPageSurfaceStyle(pageDisplayWidth)}
      >
        <PagePreviewState pageIndex={page.pageIndex} preview={preview} />

        <div
          ref={textLayerRef}
          className={cn('selection-text-layer absolute inset-0', isDrawMode && 'pointer-events-none select-none')}
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
            dragPreview={dragPreview}
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
