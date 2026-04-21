import type { Ref } from 'react';
import { LassoSelect, MousePointer2 } from 'lucide-react';

import { SegmentedButton } from '../../components/ui';
import { copy } from '@/lib/copy';
import { ZoomControls } from './ZoomControls';

export function ReviewToolbar({
  toolMode,
  onToolModeChange,
  zoom,
  onZoomChange,
  toolbarRef,
}: {
  toolMode: 'select' | 'draw' | null;
  onToolModeChange: (mode: 'select' | 'draw' | null) => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  toolbarRef?: Ref<HTMLDivElement>;
}) {
  const isSelectMode = toolMode === 'select';
  const isDrawMode = toolMode === 'draw';

  return (
    <div
      className="review-toolbar review-toolbar-chrome sticky z-overlay flex flex-col gap-3 border-b border-border bg-canvas/95 px-6 py-4 backdrop-blur-app-header"
      ref={toolbarRef}
    >
      <div className="review-toolbar-controls">
        <div className="review-toolbar-mode">
          <ZoomControls compact={false} onZoomChange={onZoomChange} zoom={zoom} />
          <div className="review-toolbar-mode-controls">
            <SegmentedButton
              aria-label={isSelectMode ? copy.dock.disableSelect : copy.dock.enableSelect}
              onClick={() => onToolModeChange(isSelectMode ? null : 'select')}
              selected={isSelectMode}
            >
              <MousePointer2 size={14} strokeWidth={1.75} />
              Select
            </SegmentedButton>
            <SegmentedButton
              aria-label={isDrawMode ? copy.dock.disableDraw : copy.dock.enableDraw}
              onClick={() => onToolModeChange(isDrawMode ? null : 'draw')}
              selected={isDrawMode}
            >
              <LassoSelect size={14} strokeWidth={1.75} />
              Draw
            </SegmentedButton>
          </div>
        </div>
      </div>
    </div>
  );
}
