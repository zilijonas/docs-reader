import { ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CircleButton } from '../../components/ui';
import { copy } from '@/lib/copy';
import { REDACTOR_UI } from '../../features/redactor';

export function ZoomControls({
  compact = false,
  onZoomChange,
  zoom,
}: {
  compact?: boolean;
  onZoomChange: (value: number) => void;
  zoom: number;
}) {
  return (
    <div className={cn('review-toolbar-zoom', compact && 'review-toolbar-zoom-compact')}>
      <div className="flex items-center gap-1">
        <CircleButton
          aria-label={copy.dock.zoomOut}
          onClick={() => onZoomChange(Math.max(REDACTOR_UI.minZoom, zoom - REDACTOR_UI.zoomStep))}
          size="md"
        >
          <ZoomOut size={14} strokeWidth={1.75} />
        </CircleButton>

        <span className="review-toolbar-zoom-value font-mono text-[0.8125rem] tabular-nums text-content">
          {Math.round(zoom * 100)}%
        </span>

        <CircleButton
          aria-label={copy.dock.zoomIn}
          onClick={() => onZoomChange(Math.min(REDACTOR_UI.maxZoom, zoom + REDACTOR_UI.zoomStep))}
          size="md"
        >
          <ZoomIn size={14} strokeWidth={1.75} />
        </CircleButton>
      </div>
    </div>
  );
}
