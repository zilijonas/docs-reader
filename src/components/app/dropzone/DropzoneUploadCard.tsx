import type { KeyboardEventHandler, RefObject } from 'react';
import { ArrowRight, FileText, FolderOpen, Lock } from 'lucide-react';

import { Button, Panel } from '../../../components/ui';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { FILE_ACCEPT } from '../../../lib/app-config';
import { DROPZONE_SECTION_HEIGHT_CLASS } from './dropzoneMessaging';

export function DropzoneUploadCard({
  fileInputRef,
  handleDrop,
  handleFileChange,
  isHovering,
  openFilePicker,
  setIsHovering,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => Promise<void>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isHovering: boolean;
  openFilePicker: () => void;
  setIsHovering: (value: boolean) => void;
}) {
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    openFilePicker();
  };

  return (
    <Panel
      as="section"
      className={cn(
        'anim-float-in border-brand/18 bg-surface/88 shadow-float overflow-hidden border-dashed p-0 transition-[border-color,background-color,transform,box-shadow] duration-200',
        isHovering &&
          'border-brand/42 bg-brand-soft/50 -translate-y-0.5 shadow-[0_26px_68px_-34px_rgba(86,103,242,0.35)]',
      )}
      tone="overlay"
    >
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center px-6 py-8 text-center sm:px-10 sm:py-12',
          DROPZONE_SECTION_HEIGHT_CLASS,
        )}
        onClick={() => openFilePicker()}
        onDragLeave={() => setIsHovering(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsHovering(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsHovering(false);
          void handleDrop(event);
        }}
        onKeyDown={handleKeyDown}
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
            'bg-brand-soft/65 border-brand/10 text-brand mb-6 inline-flex size-[5.5rem] items-center justify-center rounded-full border transition-transform duration-200',
            isHovering ? 'scale-[1.04]' : 'scale-100',
          )}
        >
          <FileText size={42} strokeWidth={1.45} />
        </div>

        <p className="text-content text-[clamp(1.9rem,3vw,2.35rem)] leading-none font-medium tracking-[-0.03em]">
          {isHovering ? copy.dropzone.release : copy.dropzone.drop}
        </p>
        <p className="text-content-subtle mt-2 text-lg leading-tight max-sm:text-base">
          {copy.dropzone.browse}
        </p>

        <Button
          className={cn('mt-7 min-w-[12rem]', isHovering && 'opacity-90')}
          leadingIcon={<FolderOpen size={17} strokeWidth={1.8} />}
          onClick={(event) => {
            event.stopPropagation();
            openFilePicker();
          }}
          size="pill"
          trailingIcon={<ArrowRight size={16} strokeWidth={1.7} />}
          variant="primary"
        >
          {copy.dropzone.choose}
        </Button>

        <p className="text-content-subtle mt-4 text-xs font-medium">{copy.dropzone.fileLimit}</p>
        <p className="text-content-subtle mt-5 flex items-center gap-2 text-sm">
          <Lock size={15} strokeWidth={1.7} />
          {copy.dropzone.localOnly}
        </p>
      </div>
    </Panel>
  );
}
