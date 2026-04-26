import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageAsset, TextSpan } from '../../types';

const tesseractMocks = vi.hoisted(() => {
  const recognize = vi.fn(async () => ({
    data: {
      words: [
        {
          text: 'Fresh',
          confidence: 90,
          bbox: { x0: 0, y0: 0, x1: 40, y1: 20 },
        },
      ],
    },
  }));
  const terminate = vi.fn(async () => undefined);
  const createWorker = vi.fn(async () => ({ recognize, terminate }));

  return { createWorker, recognize, terminate };
});

vi.mock('tesseract.js', () => ({
  createWorker: tesseractMocks.createWorker,
  OEM: { LSTM_ONLY: 1 },
}));

vi.mock('./pyodide', () => ({
  runPythonBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));

import { state } from './state';
import { runQueuedOcr } from './tesseract';

const createOcrPage = (): PageAsset => ({
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
});

const cachedSpan: TextSpan = {
  id: 'cached_0',
  pageIndex: 0,
  text: 'Cached',
  box: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
  source: 'ocr',
  confidence: 0.8,
  start: 0,
  end: 6,
};

describe('runQueuedOcr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 100,
        height: 100,
      })),
    );
    vi.stubGlobal('self', {
      location: { origin: 'https://example.test' },
      postMessage: vi.fn(),
    });

    state.baseUrl = '/';
    state.pages = [createOcrPage()];
    state.spans = [];
    state.warnings = [];
    state.ocrLanguages = ['eng'];
    state.bootstrapOcrLayers = {};
    state.tesseractWorker = undefined;
    state.tesseractLangKey = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses bootstrap OCR for confirmed English-only OCR', async () => {
    state.bootstrapOcrLayers = {
      0: {
        text: 'Cached',
        spans: [cachedSpan],
      },
    };

    await runQueuedOcr(['eng'], 1);

    expect(tesseractMocks.createWorker).not.toHaveBeenCalled();
    expect(state.pages[0]).toMatchObject({
      textContent: 'Cached',
      textLayerStatus: 'ocr',
      ocrStatus: 'done',
    });
    expect(state.spans).toEqual([cachedSpan]);
  });

  it('reruns OCR when the user overrides to a non-English language set', async () => {
    state.bootstrapOcrLayers = {
      0: {
        text: 'Cached',
        spans: [cachedSpan],
      },
    };

    await runQueuedOcr(['eng', 'lit'], 1);

    expect(tesseractMocks.createWorker).toHaveBeenCalled();
    expect(tesseractMocks.recognize).toHaveBeenCalled();
    expect(state.pages[0]).toMatchObject({
      textContent: 'Fresh',
      textLayerStatus: 'ocr',
      ocrStatus: 'done',
    });
  });
});
