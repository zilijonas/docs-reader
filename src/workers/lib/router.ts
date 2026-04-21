import { APP_LIMITS, DEFAULT_OCR_LANGUAGES } from '../../lib/app-config';
import { detectSensitiveData, groupDetections } from '../../lib/detection';
import { planOcrLanguageFlow } from '../../lib/ocr-language-inference';
import type { ContinueOcrRequest, LoadPdfRequest, WorkerRequest } from '../../types';
import { exportFlattenedPdf } from './export-renderer';
import { ensurePyodide, runPythonBytes, runPythonJson } from './pyodide';
import { postMessageSafe, pushWarning, resetDocumentState, state, toOwnedArrayBuffer, updateProgress, hashBuffer, filterExportBoxes } from './state';
import { runQueuedOcr } from './tesseract';

type HandlerMap = {
  [K in WorkerRequest['type']]: (message: Extract<WorkerRequest, { type: K }>) => Promise<void>;
};

const buildPdfLoadedPayload = (options: {
  ocrLanguages?: string[];
  needsOcrLanguageSelection: boolean;
  ocrCompleted: boolean;
}) => ({
  source: state.source!,
  pages: state.pages,
  spans: state.spans,
  warnings: state.warnings,
  ocrLanguages: options.ocrLanguages ?? state.ocrLanguages,
  needsOcrLanguageSelection: options.needsOcrLanguageSelection,
  ocrCompleted: options.ocrCompleted,
});

const postPdfLoaded = (
  requestId: number,
  options: {
    ocrLanguages?: string[];
    needsOcrLanguageSelection: boolean;
    ocrCompleted: boolean;
  },
) => {
  postMessageSafe({
    requestId,
    type: 'PDF_LOADED',
    payload: buildPdfLoadedPayload(options),
  });
};

const handleInit = async (message: Extract<WorkerRequest, { type: 'INIT' }>) => {
  state.baseUrl = message.payload.baseUrl;
  await ensurePyodide();
  postMessageSafe({ requestId: message.requestId, type: 'READY' });
};

const handleLoadPdf = async (message: Extract<WorkerRequest, { type: 'LOAD_PDF' }>) => {
  const payload: LoadPdfRequest = message.payload;
  const buffer = payload.file;
  const bytes = new Uint8Array(buffer);
  const maxBytes = APP_LIMITS.maxFileSizeMb * 1024 * 1024;

  if (payload.size > maxBytes) {
    throw new Error(`Files over ${APP_LIMITS.maxFileSizeMb} MB are outside the MVP limit.`);
  }

  resetDocumentState();
  await ensurePyodide();

  updateProgress(message.requestId, {
    phase: 'loading',
    progress: 0.24,
    message: 'Opening document…',
  });

  const summary = await runPythonJson<{ pageCount: number; pages: typeof state.pages; spans: typeof state.spans }>(
    `load_document_from_bytes(
      bytes(document_bytes_js),
      preview_scale_js,
      min_text_spans_js,
      min_text_chars_js
    )`,
    {
      document_bytes_js: bytes,
      preview_scale_js: APP_LIMITS.previewScale,
      min_text_spans_js: APP_LIMITS.minTextSpanCountForNativeText,
      min_text_chars_js: APP_LIMITS.minTextCharactersForNativeText,
    },
  );

  if (summary.pageCount > APP_LIMITS.maxPages) {
    throw new Error(`The MVP currently supports up to ${APP_LIMITS.maxPages} pages per file.`);
  }

  state.source = {
    name: payload.name,
    size: payload.size,
    pageCount: summary.pageCount,
    mimeType: payload.mimeType || 'application/pdf',
    fingerprint: hashBuffer(buffer),
  };
  state.pages = summary.pages;
  state.spans = summary.spans;
  state.warnings = [];

  const ocrPlan = planOcrLanguageFlow(state.pages);
  state.ocrLanguages = ocrPlan.resolvedLanguages.length > 0 ? ocrPlan.resolvedLanguages : [...DEFAULT_OCR_LANGUAGES];

  if (ocrPlan.needsLanguageSelection) {
    postPdfLoaded(message.requestId, {
      ocrLanguages: state.ocrLanguages,
      needsOcrLanguageSelection: true,
      ocrCompleted: false,
    });
    return;
  }

  if (ocrPlan.hasOcrPages) {
    await runQueuedOcr(state.ocrLanguages, message.requestId);
  }

  updateProgress(message.requestId, {
    phase: 'complete',
    progress: 1,
    message: 'Document ready.',
  });

  postPdfLoaded(message.requestId, {
    ocrLanguages: state.ocrLanguages,
    needsOcrLanguageSelection: false,
    ocrCompleted: true,
  });
};

const handleContinueOcr = async (message: Extract<WorkerRequest, { type: 'CONTINUE_OCR' }>) => {
  const payload: ContinueOcrRequest = message.payload;
  if (!state.source || state.pages.length === 0) {
    throw new Error('Load a PDF before continuing OCR.');
  }

  await runQueuedOcr(payload.ocrLanguages, message.requestId);

  updateProgress(message.requestId, {
    phase: 'complete',
    progress: 1,
    message: 'Document ready.',
  });

  postPdfLoaded(message.requestId, {
    ocrLanguages: state.ocrLanguages,
    needsOcrLanguageSelection: false,
    ocrCompleted: true,
  });
};

const handleDetect = async (message: Extract<WorkerRequest, { type: 'DETECT' }>) => {
  updateProgress(message.requestId, {
    phase: 'rules',
    progress: 0.82,
    message: 'Scanning for sensitive information…',
  });

  const detections = state.pages.flatMap((page) =>
    detectSensitiveData(
      page.pageIndex,
      page.textContent,
      state.spans.filter((span) => span.pageIndex === page.pageIndex),
      message.payload.rules.keywords,
    ),
  );

  postMessageSafe({
    requestId: message.requestId,
    type: 'DETECTIONS',
    payload: { items: groupDetections(detections) },
  });
};

const handleGetPagePreview = async (message: Extract<WorkerRequest, { type: 'GET_PAGE_PREVIEW' }>) => {
  const bytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: message.payload.pageIndex,
    scale_js: message.payload.scale ?? APP_LIMITS.previewScale,
  });

  postMessageSafe({
    requestId: message.requestId,
    type: 'PAGE_PREVIEW',
    payload: {
      pageIndex: message.payload.pageIndex,
      mimeType: 'image/png',
      bytes: toOwnedArrayBuffer(bytes),
    },
  });
};

const handleApplyRedactions = async (message: Extract<WorkerRequest, { type: 'APPLY_REDACTIONS' }>) => {
  const payload = message.payload.redactions;
  const boxes = filterExportBoxes(payload.detections, payload.manualRedactions);

  if (!boxes.length) {
    throw new Error('Confirm or add at least one redaction before exporting.');
  }

  updateProgress(message.requestId, {
    phase: 'export',
    progress: 0.1,
    message: 'Preparing export…',
  });

  try {
    const exported =
      payload.mode === 'flattened'
        ? await exportFlattenedPdf(payload.detections, payload.manualRedactions, message.requestId)
        : await runPythonBytes('export_redacted_pdf(redactions_json_js)', {
            redactions_json_js: JSON.stringify(boxes),
          });

    postMessageSafe({
      requestId: message.requestId,
      type: 'REDACTED_FILE',
      payload: {
        file: toOwnedArrayBuffer(exported),
        mode: payload.mode,
      },
    });
  } catch (error) {
    if (payload.mode === 'true-redaction') {
      pushWarning(message.requestId, 'Secure export failed. You can retry with the flattened fallback export.');
    }
    throw error;
  }
};

const handleReset = async (message: Extract<WorkerRequest, { type: 'RESET' }>) => {
  resetDocumentState();
  postMessageSafe({ requestId: message.requestId, type: 'READY' });
};

export const router: HandlerMap = {
  INIT: handleInit,
  LOAD_PDF: handleLoadPdf,
  CONTINUE_OCR: handleContinueOcr,
  DETECT: handleDetect,
  GET_PAGE_PREVIEW: handleGetPagePreview,
  APPLY_REDACTIONS: handleApplyRedactions,
  RESET: handleReset,
};
