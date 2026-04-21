import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/state', () => ({
  state: {
    source: null,
    pages: [],
    spans: [],
    warnings: [],
    ocrLanguages: [],
    baseUrl: '/',
  },
  postMessageSafe: vi.fn(),
  pushWarning: vi.fn(),
  resetDocumentState: vi.fn(),
  toOwnedArrayBuffer: (value: Uint8Array<ArrayBuffer>) => value.buffer,
  updateProgress: vi.fn(),
  hashBuffer: vi.fn(() => 'fixture'),
  filterExportBoxes: vi.fn(() => []),
}));

vi.mock('./lib/pyodide', () => ({
  ensurePyodide: vi.fn(async () => undefined),
  runPythonBytes: vi.fn(async () => new Uint8Array()),
  runPythonJson: vi.fn(async () => ({ pageCount: 0, pages: [], spans: [] })),
}));

vi.mock('./lib/export-renderer', () => ({
  exportFlattenedPdf: vi.fn(async () => new Uint8Array()),
}));

vi.mock('./lib/tesseract', () => ({
  runQueuedOcr: vi.fn(async () => undefined),
}));

vi.mock('../lib/detection', () => ({
  detectSensitiveData: vi.fn(() => [{ id: 'd1' }]),
  groupDetections: vi.fn((items) => items),
}));

vi.mock('../lib/ocr-language-inference', () => ({
  planOcrLanguageFlow: vi.fn(() => ({
    resolvedLanguages: ['eng'],
    needsLanguageSelection: false,
    hasOcrPages: false,
  })),
}));

import type { WorkerRequest } from '../types';
import { postMessageSafe } from './lib/state';
import { router } from './lib/router';

describe('worker router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes RESET requests to a READY response', async () => {
    const request: Extract<WorkerRequest, { type: 'RESET' }> = { requestId: 7, type: 'RESET' };

    await router.RESET(request);

    expect(postMessageSafe).toHaveBeenCalledWith({
      requestId: 7,
      type: 'READY',
    });
  });

  it('surfaces handler errors for the worker entrypoint to serialize', async () => {
    const request: Extract<WorkerRequest, { type: 'APPLY_REDACTIONS' }> = {
      requestId: 11,
      type: 'APPLY_REDACTIONS',
      payload: {
        redactions: {
          detections: [],
          manualRedactions: [],
          mode: 'flattened',
        },
      },
    };

    await expect(router.APPLY_REDACTIONS(request)).rejects.toThrow(
      'Confirm or add at least one redaction before exporting.',
    );
  });
});

