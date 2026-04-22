import type { WorkerResponse, BoundingBox, Detection, ExportMode, ManualRedaction, PageAsset, ProcessingProgress, SourceDocument, TextSpan } from '../../types';
import { DEFAULT_OCR_LANGUAGES } from '../../lib/app-config';

type PyodideGlobalsLike = {
  set: (name: string, value: unknown) => void;
  delete: (name: string) => void;
};

type PyProxyLike = {
  toJs: () => Uint8Array;
  destroy?: () => void;
};

export type PyodideLike = {
  globals: PyodideGlobalsLike;
  loadPackage: (name: string) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
};

export type LoadPyodideModule = {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>;
};

export type WorkerState = {
  baseUrl: string;
  pyodide: PyodideLike | null;
  pyodidePromise?: Promise<PyodideLike>;
  tesseractWorker?: import('tesseract.js').Worker;
  tesseractLangKey?: string;
  source?: SourceDocument;
  pages: PageAsset[];
  spans: TextSpan[];
  warnings: string[];
  ocrLanguages: string[];
};

export const state: WorkerState = {
  baseUrl: import.meta.env.BASE_URL,
  pyodide: null,
  pages: [],
  spans: [],
  warnings: [],
  ocrLanguages: [...DEFAULT_OCR_LANGUAGES],
};

let pythonTaskQueue = Promise.resolve();

export const postMessageSafe = (message: WorkerResponse) => {
  const transferables: Transferable[] = [];

  if ('payload' in message && message.payload && typeof message.payload === 'object') {
    Object.values(message.payload).forEach((value) => {
      if (value instanceof ArrayBuffer) {
        transferables.push(value);
      }
    });
  }

  self.postMessage(message, transferables);
};

export const toOwnedArrayBuffer = (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

export const updateProgress = (requestId: number, payload: ProcessingProgress) => {
  postMessageSafe({ requestId, type: 'PROGRESS', payload });
};

export const pushWarning = (requestId: number, message: string) => {
  state.warnings.push(message);
  postMessageSafe({ requestId, type: 'WARNING', payload: { message } });
};

export const runPythonTask = async <T>(task: () => Promise<T>) => {
  const nextTask = pythonTaskQueue.then(task, task);
  pythonTaskQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
};

export const resetDocumentState = () => {
  state.source = undefined;
  state.pages = [];
  state.spans = [];
  state.warnings = [];
  state.ocrLanguages = [...DEFAULT_OCR_LANGUAGES];
};

export const hashBuffer = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let hash = 2166136261;

  for (let index = 0; index < bytes.length; index += Math.max(1, Math.floor(bytes.length / 2048) || 1)) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }

  return `pdf_${(hash >>> 0).toString(16)}`;
};

export const filterExportBoxes = (detections: Detection[], manualRedactions: ManualRedaction[]) => [
  ...detections.filter((detection) => detection.status === 'confirmed').map((detection) => ({
    pageIndex: detection.pageIndex,
    box: detection.box,
  })),
  ...manualRedactions
    .filter((redaction) => redaction.status === 'confirmed')
    .map((redaction) => ({ pageIndex: redaction.pageIndex, box: redaction.box })),
];

export type { BoundingBox, Detection, ExportMode, ManualRedaction, PageAsset, SourceDocument, TextSpan, PyProxyLike };
