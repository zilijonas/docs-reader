import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { IconButton } from '../../components/ui';
import type { BoundingBox, DetectionStatus, ManualRedaction } from '../../types';
import { getReviewItemAnchorId } from '../../features/redactor';
import { getBoxPriority, getBoxStyle } from './pdf-viewer-utils';

export function ManualRedactionOverlay({
  manualRedactions,
  draftBox,
  dragPreview,
  onStartDrag,
  onSetManualStatus,
  onRemoveManual,
}: {
  manualRedactions: ManualRedaction[];
  draftBox: BoundingBox | null;
  dragPreview: { id: string; box: BoundingBox } | null;
  onStartDrag: (event: ReactPointerEvent<HTMLDivElement>, manualRedaction: ManualRedaction) => void;
  onSetManualStatus: (id: string, status: DetectionStatus) => void;
  onRemoveManual: (id: string) => void;
}) {
  return (
    <>
      {manualRedactions.map((manualRedaction) => {
        const box = dragPreview?.id === manualRedaction.id ? dragPreview.box : manualRedaction.box;

        return (
          <div
            className={cn(
              'rounded-detection pointer-events-auto absolute top-(--box-top) left-(--box-left) h-(--box-height) w-(--box-width) border-2',
              manualRedaction.status === 'confirmed'
                ? 'border-success bg-success/[0.18]'
                : 'border-detection-ring bg-detection/[0.18] border-dashed',
            )}
            key={manualRedaction.id}
            data-manual-pending={manualRedaction.status === 'unconfirmed' ? 'true' : undefined}
            id={getReviewItemAnchorId(manualRedaction.id)}
            onPointerDown={(event) => {
              if (manualRedaction.status !== 'unconfirmed') {
                return;
              }

              onStartDrag(event, manualRedaction);
            }}
            style={getBoxStyle(box, {
              '--review-highlight-border':
                manualRedaction.status === 'confirmed'
                  ? 'var(--color-success)'
                  : 'var(--color-detection-ring)',
              '--review-highlight-fill':
                manualRedaction.status === 'confirmed'
                  ? 'rgb(16 185 129 / 0.18)'
                  : 'rgb(217 119 6 / 0.18)',
              zIndex: getBoxPriority(box),
            })}
          >
            <span aria-hidden="true" className="pdf-review-pulse-layer" />
            {manualRedaction.status === 'unconfirmed' ? (
              <div
                className="z-overlay bg-canvas/92 ring-border-strong absolute right-0 bottom-full mb-1.5 flex gap-1 rounded-full p-1 shadow-lg ring-1 backdrop-blur-sm"
                data-manual-pending="true"
              >
                <IconButton
                  aria-label="Confirm manual highlight"
                  className="opacity-100 shadow-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetManualStatus(manualRedaction.id, 'confirmed');
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
        );
      })}

      {draftBox ? (
        <div
          className="border-content bg-brand-soft absolute top-(--box-top) left-(--box-left) h-(--box-height) w-(--box-width) rounded-sm border-2 border-dashed"
          style={getBoxStyle(draftBox)}
        />
      ) : null}
    </>
  );
}
