import { createWorker as createTesseractWorker, OEM } from 'tesseract.js';

import { APP_LIMITS, DEFAULT_OCR_LANGUAGES } from '../../lib/app-config';
import { TESSDATA_CDN } from '../../lib/detection/config';
import { detectOcrLanguagesFromBootstrapText } from '../../lib/ocr-language-inference';
import { extractOcrWords } from '../../lib/ocr';
import type { OcrLanguageDetection, PageAsset, TextSpan } from '../../types';
import { runPythonBytes } from './pyodide';
import { state, toOwnedArrayBuffer, updateProgress, pushWarning } from './state';

const normalizeLanguages = (languages: string[] | undefined) => {
  const cleaned = Array.from(
    new Set(
      (languages?.length ? languages : DEFAULT_OCR_LANGUAGES)
        .map((lang) => lang.trim())
        .filter(Boolean),
    ),
  );
  return cleaned.length ? cleaned : [...DEFAULT_OCR_LANGUAGES];
};

const bytesToBlob = (bytes: Uint8Array, mimeType: string) =>
  new Blob([toOwnedArrayBuffer(bytes)], { type: mimeType });

type OcrProgressContext = {
  requestId: number;
  base: number;
  range: number;
  index: number;
  total: number;
  pageIndex: number;
  message: string;
};

let ocrProgressContext: OcrProgressContext | null = null;
let lastOcrProgress = 0;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const emitOcrProgress = (subProgress: number) => {
  const ctx = ocrProgressContext;
  if (!ctx) return;
  const fraction = clamp01((ctx.index + clamp01(subProgress)) / Math.max(1, ctx.total));
  const next = ctx.base + fraction * ctx.range;
  if (next <= lastOcrProgress) {
    return;
  }
  lastOcrProgress = next;
  updateProgress(ctx.requestId, {
    phase: 'ocr',
    progress: next,
    pageIndex: ctx.pageIndex,
    message: ctx.message,
  });
};

export const resetOcrProgressFloor = () => {
  lastOcrProgress = 0;
  ocrProgressContext = null;
};

export const ensureTesseractWorker = async (languages: string[] | undefined, _requestId: number) => {
  const langs = normalizeLanguages(languages);
  const langKey = langs.join('+');

  if (state.tesseractWorker && state.tesseractLangKey === langKey) {
    return state.tesseractWorker;
  }

  if (state.tesseractWorker && state.tesseractLangKey !== langKey) {
    try {
      await state.tesseractWorker.terminate();
    } catch (terminateError) {
      console.warn('Could not terminate previous Tesseract worker.', terminateError);
    }
    state.tesseractWorker = undefined;
  }

  const localLangPath = new URL(`${state.baseUrl}tesseract/`, self.location.origin).toString();
  const langPath = langs.every((lang) => lang === 'eng') ? localLangPath : TESSDATA_CDN;

  state.tesseractWorker = await createTesseractWorker(langKey, OEM.LSTM_ONLY, {
    workerPath: new URL(`${state.baseUrl}tesseract/worker.min.js`, self.location.origin).toString(),
    langPath,
    corePath: new URL(`${state.baseUrl}tesseract/`, self.location.origin).toString(),
    logger: (message) => {
      emitOcrProgress(message.progress ?? 0);
    },
  });
  state.tesseractLangKey = langKey;

  return state.tesseractWorker;
};

export const runPageOcr = async (
  page: PageAsset,
  languages: string[] | undefined,
  requestId: number,
) => {
  const tesseractWorker = await ensureTesseractWorker(languages, requestId);
  const imageBytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: page.pageIndex,
    scale_js: APP_LIMITS.ocrScale,
  });

  const previewBlob = bytesToBlob(imageBytes, 'image/png');
  const bitmap = await createImageBitmap(previewBlob);
  const result = await tesseractWorker.recognize(
    previewBlob,
    { rotateAuto: true },
    { text: true, blocks: true },
  );

  const words = extractOcrWords(result, bitmap.width, bitmap.height);

  const textParts: string[] = [];
  let cursor = 0;

  const spans = words.map((word, index) => {
    const text = word.text;
    const prefix = index === 0 ? '' : ' ';
    const start = cursor + prefix.length;
    cursor = start + text.length;
    textParts.push(text);

    return {
      id: `ocr_${page.pageIndex}_${index}`,
      pageIndex: page.pageIndex,
      text,
      box: word.box,
      source: 'ocr',
      confidence: word.confidence,
      start,
      end: cursor,
    } satisfies TextSpan;
  });

  return {
    text: textParts.join(' '),
    spans,
  };
};

export const applyOcrLayer = (page: PageAsset, ocrLayer: { text: string; spans: TextSpan[] }) => {
  state.pages = state.pages.map((candidate) =>
    candidate.pageIndex === page.pageIndex
      ? {
          ...candidate,
          textContent: ocrLayer.text,
          textLayerStatus: ocrLayer.text ? 'ocr' : 'missing',
          ocrStatus: 'done',
          charCount: ocrLayer.text.length,
          spanCount: ocrLayer.spans.length,
        }
      : candidate,
  );
  state.spans = [
    ...state.spans.filter((span) => span.pageIndex !== page.pageIndex),
    ...ocrLayer.spans,
  ];
};

export const runQueuedOcr = async (languages: string[], requestId: number) => {
  const normalizedLanguages = normalizeLanguages(languages);
  const ocrPages = state.pages.filter((page) => page.lane === 'ocr' && page.ocrStatus === 'queued');
  const canReuseBootstrap =
    normalizedLanguages.length === 1 && normalizedLanguages[0] === DEFAULT_OCR_LANGUAGES[0];
  const langKey = normalizedLanguages.join('+');
  const baseMessage =
    normalizedLanguages.length > 1
      ? `Reading text from scans (${langKey})…`
      : 'Reading text from scans…';

  state.ocrLanguages = normalizedLanguages;

  for (let index = 0; index < ocrPages.length; index += 1) {
    const page = ocrPages[index];

    ocrProgressContext = {
      requestId,
      base: 0.20,
      range: 0.55,
      index,
      total: ocrPages.length,
      pageIndex: page.pageIndex,
      message: `Reading page ${page.pageIndex + 1} of ${ocrPages.length}… (${baseMessage})`,
    };
    emitOcrProgress(0);

    try {
      const cachedLayer = canReuseBootstrap ? state.bootstrapOcrLayers[page.pageIndex] : undefined;
      const ocrLayer = cachedLayer ?? (await runPageOcr(page, normalizedLanguages, requestId));
      applyOcrLayer(page, ocrLayer);
      emitOcrProgress(1);
    } catch (error) {
      state.pages = state.pages.map((candidate) =>
        candidate.pageIndex === page.pageIndex ? { ...candidate, ocrStatus: 'error' } : candidate,
      );
      pushWarning(
        requestId,
        `Could not read page ${page.pageIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      emitOcrProgress(1);
    }
  }

  ocrProgressContext = null;
};

export const detectQueuedOcrLanguages = async (
  requestId: number,
): Promise<OcrLanguageDetection> => {
  // Tesseract OSD can improve non-Latin script routing later, but it needs
  // legacy core/lang assets that the current fast LSTM OCR path avoids.
  const samplePages = state.pages
    .filter((page) => page.lane === 'ocr' && page.ocrStatus === 'queued')
    .slice(0, 2);

  if (samplePages.length === 0) {
    return {
      method: 'default',
      languages: [...DEFAULT_OCR_LANGUAGES],
      confidence: 'low',
      detectedLanguage: DEFAULT_OCR_LANGUAGES[0],
    };
  }

  const sampleTexts: string[] = [];
  const samplePageIndexes: number[] = [];

  for (let index = 0; index < samplePages.length; index += 1) {
    const page = samplePages[index];

    ocrProgressContext = {
      requestId,
      base: 0.10,
      range: 0.10,
      index,
      total: samplePages.length,
      pageIndex: page.pageIndex,
      message: `Detecting OCR language from page ${page.pageIndex + 1}…`,
    };
    emitOcrProgress(0);

    try {
      const ocrLayer = await runPageOcr(page, DEFAULT_OCR_LANGUAGES, requestId);
      state.bootstrapOcrLayers[page.pageIndex] = ocrLayer;
      sampleTexts.push(ocrLayer.text);
      samplePageIndexes.push(page.pageIndex);
      emitOcrProgress(1);
    } catch (error) {
      pushWarning(
        requestId,
        `Could not auto-detect OCR language on page ${page.pageIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      emitOcrProgress(1);
    }
  }

  ocrProgressContext = null;

  return detectOcrLanguagesFromBootstrapText(sampleTexts.join(' '), samplePageIndexes);
};
