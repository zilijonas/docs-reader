import { useState } from 'react';
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
  const [hover, setHover] = useState(false);

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '96px 32px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
          }}
        >
          Step 01 — Drop a document
        </span>
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 56,
            letterSpacing: '-0.02em',
            margin: '16px 0 12px',
            lineHeight: 1.05,
            color: 'var(--ink)',
          }}
        >
          Start with a PDF.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Drag one into the frame, or choose a file. Nothing leaves your browser.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); onDrop(e); }}
        style={{
          display: 'block',
          border: `1px ${hover ? 'solid' : 'dashed'} ${hover ? 'var(--ink)' : 'var(--line-strong)'}`,
          borderRadius: 8,
          padding: '96px 48px',
          textAlign: 'center',
          cursor: 'pointer',
          background: hover ? 'color-mix(in oklab, var(--ink) 2%, var(--paper))' : 'var(--paper)',
          transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={onFileChange} />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              border: '1px solid var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)',
              transform: hover ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" />
            </svg>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, letterSpacing: '-0.015em', color: 'var(--ink)', marginBottom: 8 }}>
          {hover ? 'Release to upload' : 'Drop your PDF here'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 28 }}>
          or click to browse
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: '1px solid var(--ink)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" />
          </svg>
          Choose a PDF
        </span>
      </label>

      {progress ? (
        <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
          <div style={{ height: 2, background: 'var(--line)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
            <div
              style={{
                height: '100%',
                width: `${progress.progress * 100}%`,
                background: 'var(--ink)',
                transition: 'width 460ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center' }}>{progress.message}</p>
        </div>
      ) : null}

      {error ? (
        <div style={{ maxWidth: 560, margin: '24px auto 0', padding: '12px 16px', borderRadius: 6, border: '1px solid color-mix(in oklab, var(--error) 40%, var(--line))', background: 'color-mix(in oklab, var(--error) 6%, var(--paper))', color: 'var(--error)', fontSize: 14, textAlign: 'center' }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        {[
          { icon: 'shield', label: 'No uploads — ever' },
          { icon: 'file', label: `PDF · up to ${APP_LIMITS.maxFileSizeMb} MB · ${APP_LIMITS.maxPages} pages` },
          { icon: 'cpu', label: 'OCR auto-fallback for scans' },
        ].map((h) => (
          <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
            {h.icon === 'shield' && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.2 8.3 8 9 4.8-.7 8-4.5 8-9V6l-8-3Z" /></svg>
            )}
            {h.icon === 'file' && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
            )}
            {h.icon === 'cpu' && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>
            )}
            {h.label}
          </div>
        ))}
      </div>
    </div>
  );
}
