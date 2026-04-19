/// <reference lib="webworker" />

import { PDFDocument } from 'pdf-lib';
import { createWorker as createTesseractWorker, OEM } from 'tesseract.js';

import { APP_LIMITS } from '../lib/constants';
import { detectSensitiveData, groupDetections } from '../lib/detection';
import { extractOcrWords } from '../lib/ocr';
import type {
  BoundingBox,
  Detection,
  ExportMode,
  LoadPdfRequest,
  ManualRedaction,
  PageAsset,
  ProcessingProgress,
  SourceDocument,
  TextSpan,
  WorkerRequest,
  WorkerResponse,
} from '../lib/types';

type PyodideGlobalsLike = {
  set: (name: string, value: unknown) => void;
  delete: (name: string) => void;
};

type PyProxyLike = {
  toJs: () => Uint8Array;
  destroy?: () => void;
};

type PyodideLike = {
  globals: PyodideGlobalsLike;
  loadPackage: (name: string) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
};

type LoadPyodideModule = {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>;
};

type WorkerState = {
  baseUrl: string;
  pyodide: PyodideLike | null;
  pyodidePromise?: Promise<PyodideLike>;
  tesseractWorker?: import('tesseract.js').Worker;
  source?: SourceDocument;
  pages: PageAsset[];
  spans: TextSpan[];
  warnings: string[];
};

const state: WorkerState = {
  baseUrl: import.meta.env.BASE_URL,
  pyodide: null,
  pages: [],
  spans: [],
  warnings: [],
};

let pythonTaskQueue = Promise.resolve();

const PYTHON_HELPERS = `
import json
import pymupdf

current_doc = None
current_bytes = None

def _normalize_box(x0, y0, x1, y1, width, height):
    left = max(0.0, min(1.0, x0 / width))
    top = max(0.0, min(1.0, y0 / height))
    right = max(left, min(1.0, x1 / width))
    bottom = max(top, min(1.0, y1 / height))
    return {
        "x": left,
        "y": top,
        "width": right - left,
        "height": bottom - top,
    }

def load_document_from_bytes(pdf_bytes, preview_scale, min_text_spans, min_text_chars):
    global current_doc, current_bytes
    current_bytes = bytes(pdf_bytes)
    current_doc = pymupdf.open(stream=current_bytes, filetype="pdf")

    pages = []
    spans = []
    for page_index in range(current_doc.page_count):
        page = current_doc[page_index]
        rect = page.rect
        words = page.get_text("words", sort=True)
        page_spans = []
        text_parts = []
        cursor = 0

        for word_index, word in enumerate(words):
            x0, y0, x1, y1, text = word[:5]
            text = " ".join(str(text).split())
            if not text:
                continue

            prefix = "" if not text_parts else " "
            start = cursor + len(prefix)
            cursor = start + len(text)
            text_parts.append(text)
            page_spans.append({
                "id": f"span_{page_index}_{word_index}",
                "pageIndex": page_index,
                "text": text,
                "box": _normalize_box(x0, y0, x1, y1, rect.width, rect.height),
                "source": "native",
                "confidence": 1,
                "start": start,
                "end": cursor,
            })

        text_content = " ".join(text_parts)
        lane = "searchable" if len(page_spans) >= min_text_spans and len(text_content) >= min_text_chars else "ocr"

        pages.append({
            "pageIndex": page_index,
            "width": rect.width,
            "height": rect.height,
            "lane": lane,
            "previewScale": preview_scale,
            "textLayerStatus": "native" if lane == "searchable" else "missing",
            "ocrStatus": "skipped" if lane == "searchable" else "queued",
            "textContent": text_content if lane == "searchable" else "",
            "charCount": len(text_content),
            "spanCount": len(page_spans) if lane == "searchable" else 0,
        })

        if lane == "searchable":
            spans.extend(page_spans)

    return json.dumps({
        "pageCount": current_doc.page_count,
        "pages": pages,
        "spans": spans,
    })

def render_page_png(page_index, scale):
    if current_doc is None:
        raise RuntimeError("No PDF has been loaded yet.")
    page = current_doc[page_index]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    return pix.tobytes("png")

def export_redacted_pdf(redactions_json):
    if current_bytes is None:
        raise RuntimeError("No PDF has been loaded yet.")

    doc = pymupdf.open(stream=current_bytes, filetype="pdf")
    redactions = json.loads(redactions_json)
    touched_pages = set()

    for item in redactions:
        page = doc[item["pageIndex"]]
        rect = page.rect
        box = item["box"]
        redact_rect = pymupdf.Rect(
            box["x"] * rect.width,
            box["y"] * rect.height,
            (box["x"] + box["width"]) * rect.width,
            (box["y"] + box["height"]) * rect.height,
        )
        page.add_redact_annot(redact_rect, fill=(0, 0, 0))
        touched_pages.add(item["pageIndex"])

    for page_index in sorted(touched_pages):
        doc[page_index].apply_redactions()

    return doc.tobytes(garbage=4, deflate=True)
`;

const hashBuffer = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let hash = 2166136261;

  for (let index = 0; index < bytes.length; index += Math.max(1, Math.floor(bytes.length / 2048) || 1)) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }

  return `pdf_${(hash >>> 0).toString(16)}`;
};

const postMessageSafe = (message: WorkerResponse) => {
  const transferables: Transferable[] = [];

  if ('payload' in message && message.payload && typeof message.payload === 'object') {
    const values = Object.values(message.payload);
    values.forEach((value) => {
      if (value instanceof ArrayBuffer) {
        transferables.push(value);
      }
    });
  }

  self.postMessage(message, transferables);
};

const toOwnedArrayBuffer = (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const updateProgress = (payload: ProcessingProgress) => {
  postMessageSafe({ type: 'PROGRESS', payload });
};

const pushWarning = (message: string) => {
  state.warnings.push(message);
  postMessageSafe({ type: 'WARNING', payload: { message } });
};

const runPythonTask = async <T>(task: () => Promise<T>) => {
  const nextTask = pythonTaskQueue.then(task, task);
  pythonTaskQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
};

const withGlobals = async <T>(bindings: Record<string, unknown>, action: () => Promise<T>) =>
  runPythonTask(async () => {
    const pyodide = await ensurePyodide();
    Object.entries(bindings).forEach(([name, value]) => {
      pyodide.globals.set(name, value);
    });

    try {
      return await action();
    } finally {
      Object.keys(bindings).forEach((name) => {
        try {
          pyodide.globals.delete(name);
        } catch {
          pyodide.globals.set(name, undefined);
        }
      });
    }
  });

const runPythonJson = async <T>(code: string, bindings: Record<string, unknown>) =>
  withGlobals(bindings, async () => {
    const pyodide = await ensurePyodide();
    const result = await pyodide.runPythonAsync(code);
    return JSON.parse(result as string) as T;
  });

const runPythonBytes = async (code: string, bindings: Record<string, unknown>) =>
  withGlobals(bindings, async () => {
    const pyodide = await ensurePyodide();
    const proxy = (await pyodide.runPythonAsync(code)) as PyProxyLike;

    try {
      return proxy.toJs();
    } finally {
      proxy.destroy?.();
    }
  });

const ensurePyodide = async () => {
  if (state.pyodide) {
    return state.pyodide;
  }

  if (!state.pyodidePromise) {
    state.pyodidePromise = (async () => {
      updateProgress({
        phase: 'booting',
        progress: 0.05,
        message: 'Starting the Python worker runtime locally.',
      });

      const moduleUrl = new URL(`${state.baseUrl}pyodide/pyodide.mjs`, self.location.origin).toString();
      const { loadPyodide } = (await import(/* @vite-ignore */ moduleUrl)) as LoadPyodideModule;
      const pyodide = await loadPyodide({
        indexURL: new URL(`${state.baseUrl}pyodide/`, self.location.origin).toString(),
      });

      updateProgress({
        phase: 'booting',
        progress: 0.2,
        message: 'Loading PyMuPDF into the worker.',
      });

      await pyodide.loadPackage('pymupdf');
      await pyodide.runPythonAsync(PYTHON_HELPERS);
      state.pyodide = pyodide;
      return pyodide;
    })();
  }

  return state.pyodidePromise;
};

const ensureTesseractWorker = async () => {
  if (!state.tesseractWorker) {
    state.tesseractWorker = await createTesseractWorker('eng', OEM.LSTM_ONLY, {
      workerPath: new URL(`${state.baseUrl}tesseract/worker.min.js`, self.location.origin).toString(),
      langPath: new URL(`${state.baseUrl}tesseract/`, self.location.origin).toString(),
      corePath: new URL(`${state.baseUrl}tesseract/`, self.location.origin).toString(),
      logger: (message) => {
        updateProgress({
          phase: 'ocr',
          progress: 0.55 + (message.progress ?? 0) * 0.15,
          message: message.status ?? 'Running OCR locally.',
        });
      },
    });
  }

  return state.tesseractWorker;
};

const bytesToBlob = (bytes: Uint8Array, mimeType: string) => new Blob([toOwnedArrayBuffer(bytes)], { type: mimeType });

const runPageOcr = async (page: PageAsset) => {
  const tesseractWorker = await ensureTesseractWorker();
  const imageBytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: page.pageIndex,
    scale_js: APP_LIMITS.ocrScale,
  });

  const previewBlob = bytesToBlob(imageBytes, 'image/png');
  const bitmap = await createImageBitmap(previewBlob);
  const result = await tesseractWorker.recognize(previewBlob, {
    rotateAuto: true,
  }, {
    text: true,
    blocks: true,
  });

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

const paintFlattenedPage = async (pageIndex: number, boxes: BoundingBox[]) => {
  const pngBytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: pageIndex,
    scale_js: APP_LIMITS.exportScale,
  });

  const blob = bytesToBlob(pngBytes, 'image/png');
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create an export canvas.');
  }

  context.drawImage(bitmap, 0, 0);
  context.fillStyle = '#050505';
  boxes.forEach((box) => {
    context.fillRect(box.x * canvas.width, box.y * canvas.height, box.width * canvas.width, box.height * canvas.height);
  });

  const exportBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await exportBlob.arrayBuffer());
};

const exportFlattenedPdf = async (detections: Detection[], manualRedactions: ManualRedaction[]) => {
  const output = await PDFDocument.create();

  for (const page of state.pages) {
    const boxes = [
      ...detections
        .filter((detection) => detection.pageIndex === page.pageIndex && detection.status === 'approved')
        .map((detection) => detection.box),
      ...manualRedactions
        .filter((redaction) => redaction.pageIndex === page.pageIndex && redaction.status === 'approved')
        .map((redaction) => redaction.box),
    ];

    const imageBytes = await paintFlattenedPage(page.pageIndex, boxes);
    const embedded = await output.embedPng(imageBytes);
    const pdfPage = output.addPage([page.width, page.height]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    });

    updateProgress({
      phase: 'export',
      progress: (page.pageIndex + 1) / state.pages.length,
      message: `Flattening page ${page.pageIndex + 1} of ${state.pages.length}.`,
      pageIndex: page.pageIndex,
    });
  }

  return output.save();
};

const resetDocumentState = () => {
  state.source = undefined;
  state.pages = [];
  state.spans = [];
  state.warnings = [];
};

const handleInit = async (requestId: number, payload: { baseUrl: string }) => {
  state.baseUrl = payload.baseUrl;
  await ensurePyodide();
  postMessageSafe({ requestId, type: 'READY' });
};

const handleLoadPdf = async (requestId: number, payload: LoadPdfRequest) => {
  const buffer = payload.file;
  const bytes = new Uint8Array(buffer);
  const maxBytes = APP_LIMITS.maxFileSizeMb * 1024 * 1024;

  if (payload.size > maxBytes) {
    throw new Error(`Files over ${APP_LIMITS.maxFileSizeMb} MB are outside the MVP limit.`);
  }

  resetDocumentState();
  await ensurePyodide();

  updateProgress({
    phase: 'loading',
    progress: 0.24,
    message: 'Opening the PDF in the worker.',
  });

  const summary = await runPythonJson<{ pageCount: number; pages: PageAsset[]; spans: TextSpan[] }>(
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
  state.warnings = ['Manual review is required before export.'];

  const ocrPages = state.pages.filter((page) => page.lane === 'ocr');
  for (let index = 0; index < ocrPages.length; index += 1) {
    const page = ocrPages[index];

    updateProgress({
      phase: 'ocr',
      progress: 0.38 + (index / Math.max(1, ocrPages.length)) * 0.3,
      pageIndex: page.pageIndex,
      message: `Running OCR on page ${page.pageIndex + 1}.`,
    });

    try {
      const ocrLayer = await runPageOcr(page);
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
      state.spans = [...state.spans.filter((span) => span.pageIndex !== page.pageIndex), ...ocrLayer.spans];
    } catch (error) {
      state.pages = state.pages.map((candidate) =>
        candidate.pageIndex === page.pageIndex ? { ...candidate, ocrStatus: 'error' } : candidate,
      );
      pushWarning(
        `OCR failed on page ${page.pageIndex + 1}: ${error instanceof Error ? error.message : 'Unknown worker error'}`,
      );
    }
  }

  updateProgress({
    phase: 'complete',
    progress: 1,
    message: 'Document loaded. Run detections and review before export.',
  });

  postMessageSafe({
    requestId,
    type: 'PDF_LOADED',
    payload: {
      source: state.source,
      pages: state.pages,
      spans: state.spans,
      warnings: state.warnings,
    },
  });
};

const handleDetect = async (requestId: number, keywords: string[]) => {
  updateProgress({
    phase: 'rules',
    progress: 0.82,
    message: 'Applying deterministic detection rules.',
  });

  const detections = state.pages.flatMap((page) =>
    detectSensitiveData(
      page.pageIndex,
      page.textContent,
      state.spans.filter((span) => span.pageIndex === page.pageIndex),
      keywords,
    ),
  );

  postMessageSafe({
    requestId,
    type: 'DETECTIONS',
    payload: { items: groupDetections(detections) },
  });
};

const handleGetPagePreview = async (requestId: number, pageIndex: number, scale: number | undefined) => {
  const bytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: pageIndex,
    scale_js: scale ?? APP_LIMITS.previewScale,
  });

  postMessageSafe({
    requestId,
        type: 'PAGE_PREVIEW',
        payload: {
          pageIndex,
          mimeType: 'image/png',
          bytes: toOwnedArrayBuffer(bytes),
        },
      });
};

const filterExportBoxes = (detections: Detection[], manualRedactions: ManualRedaction[]) => [
  ...detections.filter((detection) => detection.status === 'approved').map((detection) => ({
    pageIndex: detection.pageIndex,
    box: detection.box,
  })),
  ...manualRedactions
    .filter((redaction) => redaction.status === 'approved')
    .map((redaction) => ({ pageIndex: redaction.pageIndex, box: redaction.box })),
];

const handleApplyRedactions = async (
  requestId: number,
  payload: { detections: Detection[]; manualRedactions: ManualRedaction[]; mode: ExportMode },
) => {
  const boxes = filterExportBoxes(payload.detections, payload.manualRedactions);

  if (!boxes.length) {
    throw new Error('Approve or add at least one redaction before exporting.');
  }

  updateProgress({
    phase: 'export',
    progress: 0.1,
    message: payload.mode === 'flattened' ? 'Preparing flattened fallback export.' : 'Applying true PDF redactions.',
  });

  try {
    const exported =
      payload.mode === 'flattened'
        ? await exportFlattenedPdf(payload.detections, payload.manualRedactions)
        : await runPythonBytes('export_redacted_pdf(redactions_json_js)', {
            redactions_json_js: JSON.stringify(boxes),
          });

    postMessageSafe({
      requestId,
      type: 'REDACTED_FILE',
      payload: {
        file: toOwnedArrayBuffer(exported),
        mode: payload.mode,
      },
    });
  } catch (error) {
    if (payload.mode === 'true-redaction') {
      pushWarning('True redaction failed. You can retry with the explicit flattened fallback export mode.');
    }
    throw error;
  }
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT':
        await handleInit(message.requestId, message.payload);
        break;
      case 'LOAD_PDF':
        await handleLoadPdf(message.requestId, message.payload);
        break;
      case 'DETECT':
        await handleDetect(message.requestId, message.payload.rules.keywords);
        break;
      case 'GET_PAGE_PREVIEW':
        await handleGetPagePreview(message.requestId, message.payload.pageIndex, message.payload.scale);
        break;
      case 'APPLY_REDACTIONS':
        await handleApplyRedactions(message.requestId, message.payload.redactions);
        break;
      case 'RESET':
        resetDocumentState();
        postMessageSafe({ requestId: message.requestId, type: 'READY' });
        break;
      default:
        throw new Error('Unsupported worker request.');
    }
  } catch (error) {
    postMessageSafe({
      requestId: message.requestId,
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown worker error.',
        recoverable: message.type !== 'INIT',
      },
    });
  }
};
