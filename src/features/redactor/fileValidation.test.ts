import { describe, expect, it } from 'vitest';

import { validateSelectedFile } from './fileValidation';

describe('validateSelectedFile', () => {
  it('accepts PDFs inside the MVP size limit', () => {
    const file = new File([new Uint8Array(1024)], 'ok.pdf', { type: 'application/pdf' });

    expect(() => validateSelectedFile(file)).not.toThrow();
  });

  it('rejects non-PDF files', () => {
    const file = new File([new Uint8Array(1024)], 'not-ok.txt', { type: 'text/plain' });

    expect(() => validateSelectedFile(file)).toThrow('Please choose a PDF file.');
  });
});
