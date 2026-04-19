import type {
  ApplyRedactionsRequest,
  DetectRequest,
  GetPagePreviewRequest,
  InitRequest,
  LoadPdfRequest,
  WorkerRequest,
  WorkerResponse,
} from './types';

type EventListener = (message: WorkerResponse) => void;

type RequestMap = {
  INIT: Extract<WorkerResponse, { type: 'READY' }>;
  LOAD_PDF: Extract<WorkerResponse, { type: 'PDF_LOADED' }>;
  DETECT: Extract<WorkerResponse, { type: 'DETECTIONS' }>;
  GET_PAGE_PREVIEW: Extract<WorkerResponse, { type: 'PAGE_PREVIEW' }>;
  APPLY_REDACTIONS: Extract<WorkerResponse, { type: 'REDACTED_FILE' }>;
  RESET: Extract<WorkerResponse, { type: 'READY' }>;
};

type PendingRequest = {
  resolve: (value: WorkerResponse) => void;
  reject: (reason?: unknown) => void;
};

const isArrayBuffer = (value: unknown): value is ArrayBuffer => value instanceof ArrayBuffer;

export const extractTransferables = (value: unknown, seen = new Set<ArrayBuffer>()) => {
  if (isArrayBuffer(value)) {
    seen.add(value);
    return [...seen];
  }

  if (ArrayBuffer.isView(value)) {
    if (value.buffer instanceof ArrayBuffer) {
      seen.add(value.buffer);
    }
    return [...seen];
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => extractTransferables(entry, seen));
    return [...seen];
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => extractTransferables(entry, seen));
  }

  return [...seen];
};

export class RedactorWorkerClient {
  private worker: Worker;

  private listeners = new Set<EventListener>();

  private requestId = 1;

  private pending = new Map<number, PendingRequest>();

  constructor() {
    this.worker = new Worker(new URL('../workers/redactor.worker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;

    if (typeof message.requestId === 'number' && this.pending.has(message.requestId)) {
      const pending = this.pending.get(message.requestId)!;
      this.pending.delete(message.requestId);

      if (message.type === 'ERROR') {
        pending.reject(new Error(message.payload.message));
      } else {
        pending.resolve(message);
      }
    }

    this.listeners.forEach((listener) => listener(message));
  };

  private handleError = (event: ErrorEvent) => {
    const error = new Error(event.message || 'The redaction worker crashed.');
    this.pending.forEach((pending) => pending.reject(error));
    this.pending.clear();
  };

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async dispatch(message: WorkerRequest) {
    const payloadMessage: WorkerRequest = { ...message, requestId: this.requestId += 1 };

    const response = await new Promise<WorkerResponse>((resolve, reject) => {
      this.pending.set(payloadMessage.requestId, { resolve, reject });
      this.worker.postMessage(payloadMessage, extractTransferables(payloadMessage));
    });

    return response;
  }

  init(payload: InitRequest): Promise<RequestMap['INIT']> {
    return this.dispatch({ requestId: 0, type: 'INIT', payload }) as Promise<RequestMap['INIT']>;
  }

  loadPdf(payload: LoadPdfRequest): Promise<RequestMap['LOAD_PDF']> {
    return this.dispatch({ requestId: 0, type: 'LOAD_PDF', payload }) as Promise<RequestMap['LOAD_PDF']>;
  }

  detect(payload: DetectRequest): Promise<RequestMap['DETECT']> {
    return this.dispatch({ requestId: 0, type: 'DETECT', payload }) as Promise<RequestMap['DETECT']>;
  }

  getPagePreview(payload: GetPagePreviewRequest): Promise<RequestMap['GET_PAGE_PREVIEW']> {
    return this.dispatch({ requestId: 0, type: 'GET_PAGE_PREVIEW', payload }) as Promise<RequestMap['GET_PAGE_PREVIEW']>;
  }

  applyRedactions(payload: ApplyRedactionsRequest): Promise<RequestMap['APPLY_REDACTIONS']> {
    return this.dispatch({ requestId: 0, type: 'APPLY_REDACTIONS', payload }) as Promise<RequestMap['APPLY_REDACTIONS']>;
  }

  reset(): Promise<RequestMap['RESET']> {
    return this.dispatch({ requestId: 0, type: 'RESET' }) as Promise<RequestMap['RESET']>;
  }
}

let sharedClient: RedactorWorkerClient | undefined;

export const getRedactorWorkerClient = () => {
  if (!sharedClient) {
    sharedClient = new RedactorWorkerClient();
  }

  return sharedClient;
};

export type { ApplyRedactionsRequest, DetectRequest, GetPagePreviewRequest, InitRequest, LoadPdfRequest };
