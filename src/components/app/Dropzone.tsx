import type { ChangeEvent, DragEvent, RefObject } from 'react';

import { APP_LIMITS, FILE_ACCEPT } from '../../lib/constants';
import type { ProcessingProgress } from '../../lib/types';

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
  return (
    <label
      className="glass-panel flex min-h-[520px] cursor-pointer flex-col items-center justify-center gap-5 rounded-[2rem] border border-dashed border-[#bba487] p-8 text-center shadow-[0_18px_56px_rgba(53,43,23,0.12)] transition hover:border-[#8e6f49] hover:bg-white/90"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={onFileChange} />
      <div className="rounded-[1.6rem] bg-[#fff9f0] p-6">
        <div className="rounded-[1.3rem] border border-[#d9c4a7] px-7 py-6 text-left shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8e4a24]">Two-lane review pipeline</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">Drop a PDF to start the local redaction workflow.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
            Searchable pages use native PDF text. Scanned pages switch to OCR. You review every suggestion before export.
          </p>
        </div>
      </div>
      <div className="rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white">Choose PDF or drag it here</div>
      <p className="max-w-lg text-sm leading-6 text-stone-600">
        Supported in the MVP: PDFs up to {APP_LIMITS.maxPages} pages and {APP_LIMITS.maxFileSizeMb} MB.
      </p>
      {progress ? (
        <div className="w-full max-w-xl space-y-2 rounded-[1.5rem] border border-stone-200 bg-white/80 px-4 py-4 text-left">
          <div className="h-2 rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-[#286f69]" style={{ width: `${progress.progress * 100}%` }} />
          </div>
          <p className="text-sm text-stone-700">{progress.message}</p>
        </div>
      ) : null}
      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
    </label>
  );
}
