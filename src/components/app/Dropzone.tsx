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
      progress.progress < prev - NEW_SESSION_DROP ? progress.progress : Math.max(prev, progress.progress),
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
  const { error, fileInputRef, handleDrop, handleFileChange, isProcessing = false, progress } = useWorkflowContext();
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
    <div className="dropzone-shell w-full">
      <div className="dropzone-heading text-center">
        <span className="type-eyebrow fade-in">{copy.dropzone.eyebrow}</span>
        <h1 className="type-display-hero mt-4 fade-in fade-in-delay-1">
          {copy.dropzone.headingLead} <span className="italic-accent">{copy.dropzone.headingAccent}</span>
        </h1>
        <p className="type-body measure-copy mx-auto mt-3 fade-in fade-in-delay-2">
          {copy.dropzone.hint}
        </p>
      </div>

      {showLoader ? (
        <Panel
          as="section"
          className="dropzone-panel border-dashed bg-surface-muted shadow-none anim-float-in"
          padding="none"
        >
          <div className="dropzone-loader flex flex-col items-center justify-center gap-4 text-center">
            <CircularProgress className="text-content" size={56} strokeWidth={3} value={progressValue} />
            <div className="type-display-card">{copy.dropzone.processing}</div>
            <ProgressBar className="measure-progress w-full" value={progressValue} />
            <p className="type-body-sm measure-progress mx-auto">{progressMessage}</p>
          </div>
        </Panel>
      ) : (
        <Panel
          as="section"
          className={cn(
            'dropzone-panel border-dashed bg-surface-muted shadow-none transition-colors duration-200 ease-standard anim-float-in',
            isHovering && 'border-content bg-surface',
          )}
          padding="none"
        >
          <div
            className="dropzone-label block cursor-pointer text-center transition-colors duration-200 ease-standard"
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
                'dropzone-icon mx-auto flex items-center justify-center rounded-full border border-border-strong text-content transition-transform duration-200 ease-standard',
                isHovering ? '-translate-y-1' : 'translate-y-0',
              )}
            >
              <Upload size={28} strokeWidth={1.25} />
            </div>

            <div className="type-display-card dropzone-title">
              {isHovering ? copy.dropzone.release : copy.dropzone.drop}
            </div>
            <div className="dropzone-subtitle text-sm text-content-subtle">{copy.dropzone.browse}</div>

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
        <Alert className="measure-feedback mx-auto mt-4 text-center" tone="danger">
          {error}
        </Alert>
      ) : null}

      <div className="dropzone-hints flex flex-wrap justify-center gap-5">
        {isBooting ? (
          <div className="ui-text-control flex items-center gap-2 text-content-subtle">
            <span className="dropzone-boot-dot" aria-hidden="true" />
            {progress?.message ?? copy.dropzone.warmingEngine}
          </div>
        ) : (
          UPLOAD_HINTS.map((hint) => (
            <div key={hint.id} className="ui-text-control flex items-center gap-2 text-content-subtle">
              {hint.icon()}
              {hint.label}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
