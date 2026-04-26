import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/state', () => ({
  state: {
    source: null,
    pages: [],
    spans: [],
    warnings: [],
    ocrLanguages: [],
    ocrLanguageDetection: {
      method: 'default',
      languages: ['eng'],
      confidence: 'low',
      detectedLanguage: 'eng',
    },
    bootstrapOcrLayers: {},
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
  detectQueuedOcrLanguages: vi.fn(async () => ({
    method: 'bootstrap-ocr',
    languages: ['eng'],
    confidence: 'low',
    detectedLanguage: 'eng',
  })),
  runQueuedOcr: vi.fn(async () => undefined),
}));

vi.mock('../lib/detection', () => ({
  detectSensitiveData: vi.fn(() => [{ id: 'd1' }]),
  groupDetections: vi.fn((items) => items),
}));

vi.mock('../lib/ocr-language-inference', () => ({
  planOcrLanguageFlow: vi.fn(() => ({
    resolvedLanguages: ['eng'],
    ocrLanguageDetection: {
      method: 'default',
      languages: ['eng'],
      confidence: 'low',
      detectedLanguage: 'eng',
    },
    needsLanguageSelection: false,
    hasOcrPages: false,
  })),
}));

import type { WorkerRequest } from '../types';
import { planOcrLanguageFlow } from '../lib/ocr-language-inference';
import { postMessageSafe, state } from './lib/state';
import { runPythonJson } from './lib/pyodide';
import { detectQueuedOcrLanguages } from './lib/tesseract';
import { router } from './lib/router';

describe('worker router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.source = undefined;
    state.pages = [];
    state.spans = [];
    state.warnings = [];
    state.ocrLanguages = [];
    state.ocrLanguageDetection = {
      method: 'default',
      languages: ['eng'],
      confidence: 'low',
      detectedLanguage: 'eng',
    };
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

  it('runs bootstrap OCR language detection before returning scanned-only PDFs', async () => {
    vi.mocked(runPythonJson).mockResolvedValueOnce({
      pageCount: 1,
      pages: [
        {
          pageIndex: 0,
          width: 800,
          height: 1000,
          lane: 'ocr',
          previewScale: 1.35,
          textLayerStatus: 'missing',
          ocrStatus: 'queued',
          textContent: '',
          charCount: 0,
          spanCount: 0,
        },
      ],
      spans: [],
    });
    vi.mocked(planOcrLanguageFlow).mockReturnValueOnce({
      hasOcrPages: true,
      needsLanguageSelection: true,
      resolvedLanguages: ['eng'],
      ocrLanguageDetection: {
        method: 'default',
        languages: ['eng'],
        confidence: 'low',
        detectedLanguage: 'eng',
      },
    });
    vi.mocked(detectQueuedOcrLanguages).mockResolvedValueOnce({
      method: 'bootstrap-ocr',
      languages: ['eng', 'lit'],
      confidence: 'medium',
      detectedLanguage: 'lit',
      samplePageIndexes: [0],
    });

    await router.LOAD_PDF({
      requestId: 21,
      type: 'LOAD_PDF',
      payload: {
        file: new ArrayBuffer(8),
        name: 'scan.pdf',
        size: 8,
        mimeType: 'application/pdf',
      },
    });

    expect(detectQueuedOcrLanguages).toHaveBeenCalledWith(21);
    expect(postMessageSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 21,
        type: 'PDF_LOADED',
        payload: expect.objectContaining({
          ocrCompleted: false,
          needsOcrLanguageSelection: true,
          ocrLanguages: ['eng', 'lit'],
          ocrLanguageDetection: expect.objectContaining({
            method: 'bootstrap-ocr',
            confidence: 'medium',
            detectedLanguage: 'lit',
          }),
        }),
      }),
    );
  });
});
