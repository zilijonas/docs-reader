import { Lock } from 'lucide-react';

import { Alert } from '../../components/ui';
import { copy } from '@/lib/copy';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';
import { DropzoneBenefitStrip } from './dropzone/DropzoneBenefitStrip';
import { DropzoneHero } from './dropzone/DropzoneHero';
import { DropzoneProcessingCard } from './dropzone/DropzoneProcessingCard';
import { DropzoneUploadCard } from './dropzone/DropzoneUploadCard';
import { useDropzoneState } from './dropzone/useDropzoneState';

export function Dropzone() {
  const {
    error,
    fileInputRef,
    handleDrop,
    handleFileChange,
    isProcessing = false,
    progress,
  } = useWorkflowContext();
  const {
    activeReassurance,
    isHovering,
    prefersReducedMotion,
    progressMessage,
    progressPercent,
    progressValue,
    setIsHovering,
  } = useDropzoneState(progress);

  const openFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    input.click();
  };

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(86,103,242,0.1),transparent_32%),radial-gradient(circle_at_top_right,rgba(35,178,111,0.08),transparent_28%)]"
      />

      <div className="mx-auto flex min-h-[calc(100dvh-var(--layout-app-header-offset))] w-full max-w-[78rem] flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <DropzoneHero />

        <div className="mx-auto mt-8 w-full max-w-[35rem] lg:mt-10">
          {isProcessing ? (
            <DropzoneProcessingCard
              activeReassurance={activeReassurance}
              prefersReducedMotion={prefersReducedMotion}
              progressMessage={progressMessage}
              progressPercent={progressPercent}
              progressValue={progressValue}
            />
          ) : (
            <DropzoneUploadCard
              fileInputRef={fileInputRef}
              handleDrop={handleDrop}
              handleFileChange={handleFileChange}
              isHovering={isHovering}
              openFilePicker={openFilePicker}
              setIsHovering={setIsHovering}
            />
          )}
        </div>

        {error ? (
          <Alert className="mx-auto mt-5 max-w-[38rem] text-center" tone="danger">
            {error} Your file was not uploaded.
          </Alert>
        ) : null}

        <DropzoneBenefitStrip />

        <div className="text-content-subtle leading-copy mx-auto mt-8 flex max-w-[34rem] flex-col items-center justify-center gap-2 text-center text-sm sm:mt-10 sm:flex-row">
          <Lock className="mt-0.5 shrink-0" size={15} strokeWidth={1.7} />
          <span>{copy.dropzone.footer}</span>
        </div>
      </div>
    </div>
  );
}
