import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { Check, Circle, Download, FilePenLine, RotateCcw, X as XIcon, ScanSearch } from 'lucide-react';

import { BrandLogo } from '../../../components/BrandLogo';
import type { SourceDocument } from '../../../lib/types';
import { formatBytes } from '../../../lib/utils';

export function AppHeader({
  sourceDocument,
  hasViewer,
  confirmedCount = 0,
  pendingReviewCount = 0,
  totalFindings = 0,
  canRedo = false,
  onRedo,
  onReset,
  onExport,
  onRenameDocument,
  headerRef,
}: {
  sourceDocument: SourceDocument | null;
  hasViewer: boolean;
  confirmedCount?: number;
  pendingReviewCount?: number;
  totalFindings?: number;
  canRedo?: boolean;
  onRedo?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onRenameDocument?: (name: string) => void;
  headerRef?: Ref<HTMLElement>;
}) {
  const homeHref = import.meta.env.BASE_URL;
  const hasPending = pendingReviewCount > 0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(sourceDocument?.name ?? '');

  useEffect(() => {
    setDraftName(sourceDocument?.name ?? '');

    if (!sourceDocument) {
      setIsEditingName(false);
    }
  }, [sourceDocument]);

  useEffect(() => {
    if (!isEditingName || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditingName]);

  const commitDocumentName = () => {
    const nextName = draftName.trim();

    if (!sourceDocument) {
      return;
    }

    if (nextName.length > 0 && nextName !== sourceDocument.name) {
      onRenameDocument?.(nextName);
    } else {
      setDraftName(sourceDocument.name);
    }

    setIsEditingName(false);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDocumentName();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setDraftName(sourceDocument?.name ?? '');
      setIsEditingName(false);
    }
  };

  return (
    <header
      className="app-header sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-canvas/95 px-6 py-4 backdrop-blur-app-header"
      ref={headerRef}
    >
      <div className="flex min-w-0 items-center gap-4">
        <a href={homeHref} className="flex items-center">
          <BrandLogo className="app-brand-logo text-content" title="HDDN" />
        </a>

        {sourceDocument ? (
          <>
            <div className="app-header-doc-divider h-5 w-px bg-border" />
            <div className="app-header-doc-column flex min-w-0 flex-col">


              <div className="flex min-w-0 items-center gap-2">
                <FilePenLine className="shrink-0 text-content-subtle" size={14} strokeWidth={1.75} />

                {isEditingName ? (
                  <input
                    aria-label="Document file name"
                    className="app-header-doc-name measure-doc-name ui-text-button-sm min-w-0 border-0 bg-transparent p-0 text-xs outline-none"
                    onBlur={commitDocumentName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={handleNameKeyDown}
                    ref={inputRef}
                    type="text"
                    value={draftName}
                  />
                ) : (
                  <button
                    aria-label="Rename document"
                    className="app-header-doc-name measure-doc-name ui-text-button-sm truncate text-left text-xs transition-colors hover:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                    onClick={() => setIsEditingName(true)}
                    type="button"
                  >
                    {sourceDocument.name}
                  </button>
                )}
              </div>

              <div className="flex min-w-0 items-center gap-2 ui-text-button-sm leading-4 text-content-subtle">
                <ScanSearch className="shrink-0" size={12} strokeWidth={1.75} />
                <span className="shrink-0">{formatBytes(sourceDocument.size)}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  {totalFindings} {totalFindings === 1 ? 'finding' : 'findings'}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {hasViewer ? (
        <div className="flex items-center gap-2">
          <div className="app-header-status hidden items-center gap-2 lg:flex lg:mr-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-success/30 bg-success-soft px-3 py-1.5 text-[0.8125rem] font-medium text-success-ink">
              <Check size={14} strokeWidth={2} />
              local only
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-[0.8125rem] text-content-muted">
              <Circle size={10} strokeWidth={2} />
              {confirmedCount} confirmed
            </span>
            {hasPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-detection-ring bg-detection-soft px-3 py-1.5 text-[0.8125rem] font-medium text-content">
                <span className="size-2 rounded-full bg-detection" />
                {pendingReviewCount} to review
              </span>
            ) : null}
          </div>

          <button
            aria-label="Redo"
            className="flex size-10 items-center justify-center rounded-full text-content transition-colors duration-200 ease-standard hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-45 md:size-9"
            data-keep-pending-manuals="true"
            disabled={!canRedo}
            onClick={onRedo}
            type="button"
          >
            <RotateCcw size={20} strokeWidth={1.75} />
          </button>

          <button
            aria-label="Export"
            className="flex size-10 items-center justify-center rounded-full text-content transition-colors duration-200 ease-standard hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:size-9"
            onClick={onExport}
            type="button"
          >
            <Download size={20} strokeWidth={1.75} />
          </button>

          <button
            aria-label="Reset"
            className="flex size-10 items-center justify-center rounded-full text-content transition-colors duration-200 ease-standard hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:size-9"
            onClick={onReset}
            type="button"
          >
            <XIcon size={20} strokeWidth={1.75} />
          </button>
        </div>
      ) : null}
    </header>
  );
}
