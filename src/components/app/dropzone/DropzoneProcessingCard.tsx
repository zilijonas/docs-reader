import { Lock, MonitorSmartphone, ShieldCheck } from 'lucide-react';

import { Panel, ProgressBar } from '../../../components/ui';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { DROPZONE_SECTION_HEIGHT_CLASS } from './dropzoneMessaging';

export function DropzoneProcessingCard({
  activeReassurance,
  prefersReducedMotion,
  progressMessage,
  progressPercent,
  progressValue,
}: {
  activeReassurance: string;
  prefersReducedMotion: boolean;
  progressMessage: string;
  progressPercent: string;
  progressValue: number;
}) {
  return (
    <Panel
      as="section"
      className="anim-float-in border-brand/12 bg-surface/88 overflow-hidden p-0"
      tone="overlay"
    >
      <div className={cn('flex flex-col px-5 py-5 sm:px-6 sm:py-6', DROPZONE_SECTION_HEIGHT_CLASS)}>
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-trust inline-flex size-2 animate-pulse rounded-full"
          />
          <h2 className="text-content text-xl leading-none font-medium tracking-[-0.03em] sm:text-[1.35rem]">
            {copy.dropzone.trustTitle}
          </h2>
        </div>

        <div className="border-trust/18 bg-trust-soft mt-4 rounded-[1.25rem] border px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={30} strokeWidth={1.9} className="text-trust shrink-0" />
            <div className="min-w-0">
              <p className="text-content text-sm font-medium sm:text-[0.95rem]">
                {copy.dropzone.trustHeading}
              </p>
              <p className="text-content-muted leading-copy mt-0.5 text-xs sm:text-[0.82rem]">
                {copy.dropzone.trustBody}
              </p>
            </div>
          </div>
        </div>

        <div
          aria-live="polite"
          className="border-brand/12 mt-3 rounded-[1.25rem] border bg-white/84 px-3.5 py-3 shadow-[0_16px_34px_-28px_rgba(86,103,242,0.35)]"
        >
          <div className="flex items-center gap-2.5">
            <span className="bg-brand-soft/58 text-brand inline-flex size-10 shrink-0 items-center justify-center rounded-full">
              <MonitorSmartphone size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-content text-sm font-medium sm:text-[0.95rem]',
                  !prefersReducedMotion && 'transition-all duration-300',
                )}
              >
                {activeReassurance}
              </p>
              <p className="text-content-muted leading-copy mt-0.5 text-xs sm:text-[0.82rem]">
                {progressMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/80 mt-auto border-t pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-content-subtle flex items-center gap-2 text-xs sm:text-[0.82rem]">
              <Lock size={14} strokeWidth={1.7} />
              {copy.dropzone.localOnly}
            </p>
            <span className="text-brand text-xs font-medium sm:text-[0.82rem]">
              {progressPercent}
            </span>
          </div>
          <ProgressBar className="w-full" value={progressValue} />
        </div>
      </div>
    </Panel>
  );
}
