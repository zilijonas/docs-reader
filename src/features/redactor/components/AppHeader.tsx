import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Check,
  ShieldCheck,
  Circle,
  Download,
  FilePenLine,
  RotateCcw,
  X as XIcon,
  ScanSearch,
} from 'lucide-react';

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
      className="z-sticky border-border bg-canvas/95 backdrop-blur-app-header sticky top-0 flex items-center justify-between gap-4 border-b px-6 py-4"
      ref={appHeaderRef}
    >
      <div className="flex min-w-0 items-center gap-4">
        <a href={homeHref} className="flex items-center gap-3">
          <BrandLogo
            className="text-content block h-auto w-[4.5rem] max-[640px]:w-[4rem]"
            title="hddn"
          />
          {!sourceDocument && (
            <span className="text-content-subtle text-badge tracking-label font-mono leading-3 uppercase">
              Hide what matters.
            </span>
          )}
        </a>

        {sourceDocument ? (
          <>
            <div className="bg-border h-5 w-px" />
            <div className="flex min-w-0 flex-col">
              <div className="flex min-w-0 items-center gap-2">
                <FilePenLine
                  className="text-content-subtle shrink-0"
                  size={14}
                  strokeWidth={1.75}
                />

                {isEditingName ? (
                  <input
                    aria-label={copy.header.fileNameLabel}
                    className="text-caption max-w-measure-doc-name min-w-0 border-0 bg-transparent p-0 outline-none"
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
                    className="hover:text-content-muted focus-visible:ring-brand/20 text-caption max-w-measure-doc-name truncate text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setIsEditingName(true)}
                    type="button"
                  >
                    {sourceDocument.name}
                  </button>
                )}
              </div>

              <div className="text-content-subtle text-caption flex min-w-0 items-center gap-2">
                <ScanSearch className="shrink-0" size={12} strokeWidth={1.75} />
                <span className="shrink-0">{formatBytes(sourceDocument.size)}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  {totalReviewItemCount}{' '}
                  {totalReviewItemCount === 1
                    ? copy.header.findingSingular
                    : copy.header.findingPlural}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {hasViewer ? (
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:mr-2 lg:flex">
            <StatusPill size="sm" status="trust">
              <Check size={14} strokeWidth={2} />
              {copy.header.localOnly}
            </StatusPill>
            <StatusPill size="sm" status="neutral">
              <Circle size={10} strokeWidth={2} />
              {confirmedCount} {copy.header.confirmedSuffix}
            </StatusPill>
            {hasPending ? (
              <StatusPill size="sm" status="pending">
                <span className="bg-detection size-2 rounded-full" />
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
      ) : (
        <StatusPill className="shrink-0" size="sm" status="trust">
          <ShieldCheck size={14} strokeWidth={2} />
          {copy.header.privacyPill}
        </StatusPill>
      )}
    </header>
  );
}
