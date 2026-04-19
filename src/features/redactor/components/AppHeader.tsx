import { ArrowRight, Download, FileText, Shield } from 'lucide-react';

import { BrandLogo } from '../../../components/BrandLogo';
import { Badge, Button } from '../../../components/ui';
import type { SourceDocument } from '../../../lib/types';
import { formatBytes } from '../../../lib/utils';

export function AppHeader({
  sourceDocument,
  hasViewer,
  pendingReviewCount,
  approvedCount,
  reviewItemCount,
  isProcessing,
  onOpenReview,
  onExport,
}: {
  sourceDocument: SourceDocument | null;
  hasViewer: boolean;
  pendingReviewCount: number;
  approvedCount: number;
  reviewItemCount: number;
  isProcessing: boolean;
  onOpenReview: () => void;
  onExport: () => void;
}) {
  return (
    <header className="app-header sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-canvas/95 px-6 py-3.5 backdrop-blur-[12px]">
      <div className="app-header-group flex flex-1 flex-wrap items-center gap-4">
        <a href="/" className="flex items-center gap-2">
          <BrandLogo className="app-brand-logo text-content" title="HDDN" />
        </a>

        <div className="h-4 w-px bg-border" />

        {sourceDocument ? (
          <div className="app-header-doc flex min-w-0 flex-1 items-center gap-2.5">
            <FileText className="text-content-muted" size={14} strokeWidth={1.5} />
            <span className="app-header-doc-name max-w-[320px] truncate text-[13px] text-content">
              {sourceDocument.name}
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.04em] text-content-subtle">
              {formatBytes(sourceDocument.size)}
            </span>
          </div>
        ) : (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-content-subtle">
            No document loaded
          </span>
        )}
      </div>

      <div className="app-header-actions flex flex-1 flex-wrap items-center justify-end gap-3">
        <Badge tone="safe">
          <Shield size={10} strokeWidth={1.75} />
          local only
        </Badge>

        {hasViewer ? (
          <>
            <Button className="app-mobile-review-trigger" size="sm" variant="secondary" onClick={onOpenReview}>
              Review
              <span className="font-mono text-[10.5px] text-content-subtle">{reviewItemCount}</span>
            </Button>

            <div className="app-review-summary flex min-h-7 items-center gap-2.5 border-r border-border px-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-content-subtle">Review</span>
              <div className="flex items-center gap-2.5 text-xs">
                <span>
                  <strong className="text-content">{approvedCount}</strong>{' '}
                  <span className="text-content-subtle">approved</span>
                </span>
                <span className="text-border-strong">·</span>
                <span>
                  <strong className="text-warning-ink">{pendingReviewCount}</strong>{' '}
                  <span className="text-content-subtle">to review</span>
                </span>
              </div>
            </div>

            <Button disabled={isProcessing} size="sm" onClick={onExport}>
              <Download size={14} strokeWidth={1.5} />
              Export
              <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
