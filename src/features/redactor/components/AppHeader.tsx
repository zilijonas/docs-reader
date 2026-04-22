import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Circle, Download, FilePenLine, RotateCcw, X as XIcon, ScanSearch } from 'lucide-react';

import { BrandLogo } from '../../../components/BrandLogo';
import { CircleButton, StatusPill } from '../../../components/ui';
import { copy } from '../../../lib/copy';
import { formatBytes } from '../../../lib/utils';
import { useReviewContext } from '../context/ReviewContext';
import { useWorkflowContext } from '../context/WorkflowContext';

export function AppHeader() {
  const homeHref = import.meta.env.BASE_URL;
  const { appHeaderRef } = useWorkflowContext();
  const {
    canRedo,
    confirmedCount,
    handlePrimaryExport,
    handleResetRequest,
    hasViewer,
    redoLastChange,
    setSourceDocumentName,
    sourceDocument,
    totalReviewItemCount,
    unconfirmedCount,
  } = useReviewContext();
  const hasPending = unconfirmedCount > 0;
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
      setSourceDocumentName(nextName);
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
      className="app-header sticky top-0 z-sticky flex items-center justify-between gap-4 border-b border-border bg-canvas/95 px-6 py-4 backdrop-blur-app-header"
      ref={appHeaderRef}
    >
      <div className="flex min-w-0 items-center gap-4">
        <a href={homeHref} className="flex items-center">
          <BrandLogo className="app-brand-logo text-content" title="hddn" />
        </a>

        {sourceDocument ? (
          <>
            <div className="app-header-doc-divider h-5 w-px bg-border" />
            <div className="app-header-doc-column flex min-w-0 flex-col">


              <div className="flex min-w-0 items-center gap-2">
                <FilePenLine className="shrink-0 text-content-subtle" size={14} strokeWidth={1.75} />

                {isEditingName ? (
                  <input
                    aria-label={copy.header.fileNameLabel}
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
                    aria-label={copy.header.renameDocument}
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
                  {totalReviewItemCount}{' '}
                  {totalReviewItemCount === 1 ? copy.header.findingSingular : copy.header.findingPlural}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {hasViewer ? (
        <div className="flex items-center gap-2">
          <div className="app-header-status hidden items-center gap-2 lg:flex lg:mr-2">
            <StatusPill status="confirmed">
              <Check size={14} strokeWidth={2} />
              {copy.header.localOnly}
            </StatusPill>
            <StatusPill status="neutral">
              <Circle size={10} strokeWidth={2} />
              {confirmedCount} {copy.header.confirmedSuffix}
            </StatusPill>
            {hasPending ? (
              <StatusPill status="pending">
                <span className="size-2 rounded-full bg-detection" />
                {unconfirmedCount} {copy.header.toReviewSuffix}
              </StatusPill>
            ) : null}
          </div>

          <CircleButton
            aria-label={copy.header.redo}
            data-keep-pending-manuals="true"
            disabled={!canRedo}
            onClick={redoLastChange}
          >
            <RotateCcw size={20} strokeWidth={1.75} />
          </CircleButton>

          <CircleButton aria-label={copy.header.export} onClick={handlePrimaryExport}>
            <Download size={20} strokeWidth={1.75} />
          </CircleButton>

          <CircleButton aria-label={copy.header.reset} onClick={handleResetRequest}>
            <XIcon size={20} strokeWidth={1.75} />
          </CircleButton>
        </div>
      ) : null}
    </header>
  );
}
