import type { Ref } from 'react';
import { ArrowRight, Download, FileText, RotateCcw, Shield } from 'lucide-react';

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
  onReset,
  headerRef,
}: {
  sourceDocument: SourceDocument | null;
  hasViewer: boolean;
  pendingReviewCount: number;
  approvedCount: number;
  reviewItemCount: number;
  isProcessing: boolean;
  onOpenReview: () => void;
  onExport: () => void;
  onReset: () => void | Promise<void>;
  headerRef?: Ref<HTMLElement>;
}) {
  const homeHref = import.meta.env.BASE_URL;

  return (
    <header
      className="app-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-canvas/95 px-6 py-3.5 backdrop-blur-app-header"
      ref={headerRef}
    >
      <div className="app-header-group flex flex-1 flex-wrap items-center gap-4">
        <a href={homeHref} className="flex items-center gap-2">
          <BrandLogo className="app-brand-logo text-content" title="HDDN" />
        </a>

        <div className="h-4 w-px bg-border" />

        {sourceDocument ? (
          <div className="app-header-doc flex min-w-0 flex-1 items-center gap-2.5">
            <FileText className="text-content-muted" size={14} strokeWidth={1.5} />
            <span className="app-header-doc-name measure-doc-name ui-text-field truncate text-content">
              {sourceDocument.name}
            </span>
            <span className="ui-text-label font-mono tracking-ui-tight text-content-subtle">
              {formatBytes(sourceDocument.size)}
            </span>
          </div>
        ) : (
          <span className="ui-text-label font-mono uppercase tracking-ui-eyebrow text-content-subtle">
            No document loaded
          </span>
        )}
      </div>

      <div className="app-header-actions flex flex-1 flex-wrap items-center justify-end gap-3">
        <div className="app-header-status flex flex-1 items-center gap-3 whitespace-nowrap">
          <Badge tone="safe">
            <Shield size={10} strokeWidth={1.75} />
            local only
          </Badge>

          {hasViewer ? (
            <>
              <Button className="app-mobile-review-trigger" size="sm" variant="secondary" onClick={onOpenReview}>
                Review
                <span className="ui-text-label font-mono text-content-subtle">{reviewItemCount}</span>
              </Button>

                <div className="flex items-center gap-3 text-xs min-h-7">
                  <span className="whitespace-nowrap">
                    <strong className="text-content">{approvedCount}</strong>{' '}
                    <span className="text-content-subtle whitespace-nowrap">approved</span>
                  </span>
                  <span className="whitespace-nowrap">
                    <strong className="text-warning-ink">{pendingReviewCount}</strong>{' '}
                    <span className="text-content-subtle whitespace-nowrap">to review</span>
                  </span>
                </div>
            </>
          ) : null}
        </div>

        {hasViewer ? (
          <div className="app-header-controls flex shrink-0 items-center justify-end gap-1.5">
            <Button onClick={onReset} size="sm" variant="ghost">
              <RotateCcw size={14} strokeWidth={1.5} />
              Reset session
            </Button>

            <Button disabled={isProcessing} size="sm" onClick={onExport}>
              <Download size={14} strokeWidth={1.5} />
              Export
              <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
