import { useState } from 'react';
import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { FileText, Upload } from 'lucide-react';

import { Button, Panel, ProgressBar } from '../../components/ui';
import { cn } from '@/lib/cn';
import { FILE_ACCEPT } from '../../lib/constants';
import type { ProcessingProgress } from '../../lib/types';
import { UPLOAD_HINTS } from '../../features/redactor';

export function Dropzone({
  fileInputRef,
  onDrop,
  onFileChange,
  error,
  progress,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (event: DragEvent<HTMLLabelElement>) => Promise<void>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  error: string | null;
  progress: ProcessingProgress | null;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="dropzone-shell w-full px-8 pb-12 pt-24">
      <div className="mb-12 text-center">
        <span className="type-eyebrow">
          Step 01 - Drop a document
        </span>
        <h1 className="type-display-hero mt-4">
          Start with a PDF.
        </h1>
        <p className="type-body measure-copy mx-auto mt-3">
          Drag one into the frame, or choose a file. Nothing leaves your browser.
        </p>
      </div>

      <Panel
        as="section"
        className={cn(
          'border-dashed bg-canvas shadow-none transition-colors duration-200 ease-standard',
          isHovering && 'border-content bg-surface-muted',
        )}
        padding="none"
      >
        <label
          className="block cursor-pointer px-12 py-24 text-center transition-colors duration-200 ease-standard"
          onDragLeave={() => setIsHovering(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsHovering(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsHovering(false);
            void onDrop(event);
          }}
        >
          <input accept={FILE_ACCEPT} className="hidden" onChange={onFileChange} ref={fileInputRef} type="file" />

          <div
            className={cn(
              'mx-auto mb-7 flex size-18 items-center justify-center rounded-full border border-border-strong text-content transition-transform duration-200 ease-standard',
              isHovering ? '-translate-y-0.5' : 'translate-y-0',
            )}
          >
            <Upload size={26} strokeWidth={1.25} />
          </div>

          <div className="type-display-card mb-2">
            {isHovering ? 'Release to upload' : 'Drop your PDF here'}
          </div>
          <div className="mb-7 text-sm text-content-subtle">or click to browse</div>

          <Button
            className="pointer-events-none"
            onClick={(event) => event.stopPropagation()}
            leadingIcon={<FileText size={14} strokeWidth={1.5} />}
            variant="primary"
          >
            Choose a PDF
          </Button>
        </label>
      </Panel>

      {progress ? (
        <div className="measure-progress mx-auto mt-8">
          <ProgressBar value={progress.progress} />
          <p className="type-body-sm mt-3 text-center">{progress.message}</p>
        </div>
      ) : null}

      {error ? (
        <div className="measure-feedback mx-auto mt-6 rounded-control border border-danger/35 bg-danger-soft px-4 py-3 text-center text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-6">
        {UPLOAD_HINTS.map((hint) => (
          <div key={hint.id} className="ui-text-control flex items-center gap-2 text-content-subtle">
            {hint.icon()}
            {hint.label}
          </div>
        ))}
      </div>
    </div>
  );
}
