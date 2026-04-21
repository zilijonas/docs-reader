import { FileText, Image as ImageIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { StatusDot, StatusPill } from '../../components/ui';

const getHeaderStyle = (headerWidth: number): CSSProperties => ({
  width: `${headerWidth}px`,
});

export function PageHeader({
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
      className="sticky left-0 z-raised flex items-center justify-between px-1 pb-2.5"
      style={getHeaderStyle(headerWidth)}
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

        <StatusPill size="sm" status="ocr">
          {pageLabel === 'ocr lane' ? (
            <ImageIcon size={10} strokeWidth={1.5} />
          ) : (
            <FileText size={10} strokeWidth={1.5} />
          )}
          {pageLabel}
        </StatusPill>
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
