export type TextSource = 'native' | 'ocr';
export type DetectionSource = 'rule' | 'manual';
export type DetectionStatus = 'suggested' | 'approved' | 'rejected';
export type DetectionType = 'email' | 'phone' | 'url' | 'iban' | 'card' | 'date' | 'id' | 'number' | 'keyword' | 'manual';
export type ManualMode = 'text' | 'box';
export type OcrStatus = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'skipped';
export type PageLane = 'searchable' | 'ocr';
export type TextLayerStatus = 'native' | 'ocr' | 'missing';
export type ExportMode = 'true-redaction' | 'flattened';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceDocument {
  name: string;
  size: number;
  pageCount: number;
  mimeType: string;
  fingerprint: string;
}

export interface PageAsset {
  pageIndex: number;
  width: number;
  height: number;
  lane: PageLane;
  previewScale: number;
  textLayerStatus: TextLayerStatus;
  ocrStatus: OcrStatus;
  textContent: string;
  charCount: number;
  spanCount: number;
}

export interface TextSpan {
  id: string;
  pageIndex: number;
  text: string;
  box: BoundingBox;
  source: TextSource;
  confidence: number;
  start: number;
  end: number;
}

export interface Detection {
  id: string;
  type: DetectionType;
  label: string;
  pageIndex: number;
  box: BoundingBox;
  snippet: string;
  normalizedSnippet: string;
  source: DetectionSource;
  confidence: number;
  status: DetectionStatus;
  groupId?: string;
  matchCount?: number;
}

export interface ManualRedaction {
  id: string;
  pageIndex: number;
  mode: ManualMode;
  box: BoundingBox;
  note?: string;
  snippet?: string;
  status: DetectionStatus;
}

export interface ExportJob {
  totalPages: number;
  completedPages: number;
  status: 'idle' | 'running' | 'done' | 'error';
  mode?: ExportMode;
  downloadUrl?: string;
  error?: string;
}

export interface PreviewAsset {
  pageIndex: number;
  url?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

export interface DocumentResult {
  source: SourceDocument;
  pages: PageAsset[];
  spans: TextSpan[];
  detections: Detection[];
  warnings: string[];
}

export interface ProcessingProgress {
  phase: 'booting' | 'loading' | 'extracting' | 'ocr' | 'rules' | 'preview' | 'export' | 'complete' | 'error';
  pageIndex?: number;
  message: string;
  progress: number;
}

export interface FilterState {
  statuses: DetectionStatus[];
  sources: DetectionSource[];
  types: DetectionType[];
}

export interface DetectionRuleConfig {
  keywords: string[];
}

export interface PagePreviewPayload {
  pageIndex: number;
  mimeType: 'image/png';
  bytes: ArrayBuffer;
}

export interface RedactionRequest {
  detections: Detection[];
  manualRedactions: ManualRedaction[];
  mode: ExportMode;
}

export interface InitRequest {
  baseUrl: string;
}

export interface LoadPdfRequest {
  file: ArrayBuffer;
  name: string;
  size: number;
  mimeType: string;
}

export interface DetectRequest {
  rules: DetectionRuleConfig;
}

export interface GetPagePreviewRequest {
  pageIndex: number;
  scale?: number;
}

export interface ApplyRedactionsRequest {
  redactions: RedactionRequest;
}

export type WorkerRequest =
  | { requestId: number; type: 'INIT'; payload: InitRequest }
  | { requestId: number; type: 'LOAD_PDF'; payload: LoadPdfRequest }
  | { requestId: number; type: 'DETECT'; payload: DetectRequest }
  | { requestId: number; type: 'GET_PAGE_PREVIEW'; payload: GetPagePreviewRequest }
  | { requestId: number; type: 'APPLY_REDACTIONS'; payload: ApplyRedactionsRequest }
  | { requestId: number; type: 'RESET' };

export type WorkerResponse =
  | { requestId?: number; type: 'READY' }
  | { requestId?: number; type: 'PROGRESS'; payload: ProcessingProgress }
  | {
      requestId: number;
      type: 'PDF_LOADED';
      payload: {
        source: SourceDocument;
        pages: PageAsset[];
        spans: TextSpan[];
        warnings: string[];
      };
    }
  | { requestId: number; type: 'PAGE_PREVIEW'; payload: PagePreviewPayload }
  | { requestId: number; type: 'DETECTIONS'; payload: { items: Detection[] } }
  | { requestId: number; type: 'REDACTED_FILE'; payload: { file: ArrayBuffer; mode: ExportMode } }
  | { requestId?: number; type: 'WARNING'; payload: { message: string } }
  | { requestId?: number; type: 'ERROR'; payload: { message: string; recoverable?: boolean } };
