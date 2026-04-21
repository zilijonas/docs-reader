import { cn } from '@/lib/cn';

import type { Detection } from '../../lib/types';
import { getReviewItemAnchorId } from '../../features/redactor';
import { getBoxStyle } from './pdf-viewer-utils';

export function DetectionOverlay({
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
          aria-label={`${detection.status === 'confirmed' ? 'Unconfirm' : 'Confirm'} ${detection.snippet}`}
          className={cn(
            'pdf-box pdf-detection pointer-events-auto relative rounded-detection border anim-draw-in transition',
            detection.status === 'confirmed'
              ? 'border-success bg-success/[0.18]'
              : 'border-detection-ring bg-detection/[0.18] ring-1 ring-detection-ring',
          )}
          key={detection.id}
          onClick={(event) => {
            event.stopPropagation();
            onToggleDetection(detection.id);
          }}
          id={getReviewItemAnchorId(detection.id)}
          style={getBoxStyle(detection.box, {
            '--review-highlight-border': detection.status === 'confirmed' ? 'var(--color-success)' : 'var(--color-detection-ring)',
            '--review-highlight-fill':
              detection.status === 'confirmed' ? 'rgb(16 185 129 / 0.18)' : 'rgb(217 119 6 / 0.18)',
          })}
          type="button"
        >
          <span aria-hidden="true" className="pdf-review-pulse-layer" />
        </button>
      ))}
    </>
  );
}
