import { cn } from '@/lib/cn';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { Detection } from '../../types';
import { getReviewItemAnchorId } from '../../features/redactor';
import { compareBoxesForFocusOrder, getBoxPriority, getBoxStyle } from './pdf-viewer-utils';

const HIGHLIGHT_FOCUS_SELECTOR = '[data-highlight-focus="true"]';

const moveHighlightFocus = (current: HTMLButtonElement, direction: -1 | 1) => {
  const highlights = Array.from(
    document.querySelectorAll<HTMLButtonElement>(HIGHLIGHT_FOCUS_SELECTOR),
  );
  const currentIndex = highlights.indexOf(current);

  if (currentIndex === -1) {
    return false;
  }

  const nextHighlight = highlights[currentIndex + direction];

  if (!nextHighlight) {
    return false;
  }

  try {
    nextHighlight.focus({ preventScroll: true });
  } catch {
    nextHighlight.focus();
  }

  nextHighlight.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  });

  return true;
};

const handleHighlightKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (moveHighlightFocus(event.currentTarget, event.shiftKey ? -1 : 1)) {
    event.preventDefault();
  }
};

export function DetectionOverlay({
  detections,
  onToggleDetection,
}: {
  detections: Detection[];
  onToggleDetection: (id: string) => void;
}) {
  const orderedDetections = [...detections].sort((left, right) => {
    const order = compareBoxesForFocusOrder(left.box, right.box);
    return order !== 0 ? order : left.id.localeCompare(right.id);
  });

  return (
    <>
      {orderedDetections.map((detection) => (
        <button
          aria-label={`${detection.status === 'confirmed' ? 'Unconfirm' : 'Confirm'} ${detection.snippet}`}
          className={cn(
            'rounded-detection anim-draw-in pointer-events-auto absolute top-(--box-top) left-(--box-left) h-(--box-height) w-(--box-width) border transition',
            detection.status === 'confirmed'
              ? 'border-success bg-success/[0.18]'
              : 'border-detection-ring bg-detection/[0.18] ring-detection-ring ring-1',
          )}
          data-highlight-focus="true"
          key={detection.id}
          onClick={(event) => {
            event.stopPropagation();
            onToggleDetection(detection.id);
          }}
          onKeyDown={handleHighlightKeyDown}
          id={getReviewItemAnchorId(detection.id)}
          style={getBoxStyle(detection.box, {
            '--review-highlight-border':
              detection.status === 'confirmed'
                ? 'var(--color-success)'
                : 'var(--color-detection-ring)',
            '--review-highlight-fill':
              detection.status === 'confirmed' ? 'rgb(16 185 129 / 0.18)' : 'rgb(217 119 6 / 0.18)',
            zIndex: getBoxPriority(detection.box),
          })}
          type="button"
        >
          <span aria-hidden="true" className="pdf-review-pulse-layer" />
        </button>
      ))}
    </>
  );
}
