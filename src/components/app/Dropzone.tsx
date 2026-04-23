import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Upload } from 'lucide-react';

import { Alert, Button, CircularProgress, Panel, ProgressBar } from '../../components/ui';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { FILE_ACCEPT } from '../../lib/app-config';
import type { ProcessingProgress } from '../../types';
import { UPLOAD_HINTS } from '../../features/redactor';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';

// Worker only emits a handful of progress checkpoints (5% → 20% → 24% → 100%),
// so the bar otherwise sits idle between jumps. Trickle toward the next
// checkpoint to keep the fill feeling continuous; snap to the real value when
// it arrives and finalize on completion.
//
// The bar must never appear to go backwards: progress can be nulled
// mid-pipeline (e.g. when the init callback clears the booting phase right as
// the next real event is about to arrive), and individual phases overlap in
// value (tesseract logger emits 0.55 while runQueuedOcr is at 0.68). Freeze on
// null instead of resetting, monotonic-max on updates, and only hard-reset
// when a new session clearly starts (incoming value is well below what we're
// showing).
const NEW_SESSION_DROP = 0.25;

function useSmoothProgress(progress: ProcessingProgress | null) {
  const [smoothed, setSmoothed] = useState(0);
  const realRef = useRef(0);

  useEffect(() => {
    if (!progress) {
      return;
    }

    realRef.current = progress.progress;

    if (progress.phase === 'complete') {
      setSmoothed(1);
      return;
    }

    setSmoothed((prev) =>
      progress.progress < prev - NEW_SESSION_DROP
        ? progress.progress
        : Math.max(prev, progress.progress),
    );
  }, [progress]);

  useEffect(() => {
    if (!progress || progress.phase === 'complete' || progress.phase === 'error') {
      return;
    }

    let raf = 0;
    const tick = () => {
      setSmoothed((prev) => {
        const real = realRef.current;
        // Leave a little headroom over the real value so the bar always looks
        // like it's moving, but never reach the finish line until the worker
        // actually reports completion.
        const cap = Math.min(0.95, real + 0.12);
        if (prev >= cap) {
          return prev;
        }
        return Math.min(cap, prev + 0.0025);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return smoothed;
}

export function Dropzone() {
  const {
    error,
    fileInputRef,
    handleDrop,
    handleFileChange,
    isProcessing = false,
    progress,
  } = useWorkflowContext();
  const [isHovering, setIsHovering] = useState(false);
  const isBooting = progress?.phase === 'booting';
  const showLoader = isProcessing;
  const progressValue = useSmoothProgress(progress);
  const progressMessage = progress?.message ?? copy.dropzone.preparing;
  const openFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    input.click();
  };

  return (
    <div className="max-w-dropzone mx-auto flex min-h-[540px] w-full flex-1 flex-col justify-center gap-4 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <span className="text-content-subtle fade-in text-caption tracking-eyebrow font-mono leading-4 uppercase">
          {copy.dropzone.eyebrow}
        </span>
        <h1 className="fade-in fade-in-delay-1 text-display-dropzone tracking-tight-hero mt-4 text-balance">
          {copy.dropzone.headingLead}{' '}
          <span className="font-serif italic">{copy.dropzone.headingAccent}</span>
        </h1>
        <p className="text-content-muted fade-in fade-in-delay-2 max-w-measure-copy text-body-md leading-copy-relaxed mx-auto mt-3">
          {copy.dropzone.hint}
        </p>
      </div>

      {showLoader ? (
        <Panel
          as="section"
          className="anim-float-in bg-surface-muted flex min-h-[280px] flex-col border-dashed shadow-none sm:min-h-[320px] md:min-h-[440px]"
          padding="none"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center sm:px-10 sm:py-14">
            <CircularProgress
              className="text-content"
              size={56}
              strokeWidth={3}
              value={progressValue}
            />
            <div className="text-title-card tracking-tight-card">{copy.dropzone.processing}</div>
            <ProgressBar className="max-w-measure-progress w-full" value={progressValue} />
            <p className="text-content-muted max-w-measure-progress leading-copy mx-auto text-sm">
              {progressMessage}
            </p>
          </div>
        </Panel>
      ) : (
        <Panel
          as="section"
          className={cn(
            'ease-standard anim-float-in bg-surface-muted flex min-h-[280px] flex-col border-dashed shadow-none transition-colors duration-200 sm:min-h-[320px] md:min-h-[440px]',
            isHovering && 'border-content bg-surface',
          )}
          padding="none"
        >
          <div
            className="ease-standard block flex flex-1 cursor-pointer flex-col items-center justify-center px-6 py-8 text-center transition-colors duration-200 sm:px-10 sm:py-14"
            onDragLeave={() => setIsHovering(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsHovering(true);
            }}
            onClick={() => openFilePicker()}
            onDrop={(event) => {
              event.preventDefault();
              setIsHovering(false);
              void handleDrop(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') {
                return;
              }

              event.preventDefault();
              openFilePicker();
            }}
            role="button"
            tabIndex={0}
          >
            <input
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
              onClick={(event) => event.stopPropagation()}
              ref={fileInputRef}
              type="file"
            />

            <div
              className={cn(
                'border-border-strong text-content ease-standard mx-auto mb-4 flex size-16 items-center justify-center rounded-full border transition-transform duration-200 sm:mb-6 sm:size-20',
                isHovering ? '-translate-y-1' : 'translate-y-0',
              )}
            >
              <Upload size={28} strokeWidth={1.25} />
            </div>

            <div className="text-display-dropzone-compact tracking-tight-card">
              {isHovering ? copy.dropzone.release : copy.dropzone.drop}
            </div>
            <div className="text-content-subtle mb-4 text-sm sm:mb-8">{copy.dropzone.browse}</div>

            <Button
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
              size="pill"
              trailingIcon={<ArrowRight size={16} strokeWidth={1.5} />}
              variant="primary"
            >
              {copy.dropzone.choose}
            </Button>
          </div>
        </Panel>
      )}

      {error ? (
        <Alert className="max-w-measure-feedback mx-auto mt-4 text-center" tone="danger">
          {error}
        </Alert>
      ) : null}

      <div className="relative flex min-h-14 flex-wrap justify-center gap-5">
        {isBooting && (
          <div className="text-content-subtle text-control absolute top-0 flex items-center">
            <span
              aria-hidden="true"
              className="bg-content-subtle mr-2 size-2 animate-[pulseScale_1400ms_ease-in-out_infinite] rounded-full"
            />
            {progress?.message ?? copy.dropzone.warmingEngine}
            <span className="min-w-3">
              <span aria-hidden="true" className="loading-dots" />
            </span>
          </div>
        )}
        {UPLOAD_HINTS.map((hint) => (
          <div
            key={hint.id}
            className={`text-content-subtle text-control flex items-center gap-2 ${isBooting ? 'opacity-0' : ''}`}
          >
            {hint.icon()}
            {hint.label}
          </div>
        ))}
      </div>
    </div>
  );
}
