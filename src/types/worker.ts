import type { Detection, ManualRedaction, PageAsset, SourceDocument, TextSpan } from './detection';
import type { ExportMode } from './ui';

export interface ProcessingProgress {
  phase:
    | 'booting'
    | 'loading'
    | 'extracting'
    | 'ocr'
    | 'rules'
    | 'preview'
    | 'export'
    | 'complete'
    | 'error';
  pageIndex?: number;
  message: string;
  progress: number;
}

export interface DetectionRuleConfig {
  keywords: string[];
}

export interface OcrLanguageConfig {
  languages: string[];
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

export interface ContinueOcrRequest {
  ocrLanguages: string[];
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
  | { requestId: number; type: 'CONTINUE_OCR'; payload: ContinueOcrRequest }
  | { requestId: number; type: 'DETECT'; payload: DetectRequest }
  | { requestId: number; type: 'GET_PAGE_PREVIEW'; payload: GetPagePreviewRequest }
  | { requestId: number; type: 'APPLY_REDACTIONS'; payload: ApplyRedactionsRequest }
  | { requestId: number; type: 'RESET' };

export type WorkerResponse =
  | { requestId: number; type: 'READY' }
  | { requestId: number; type: 'PROGRESS'; payload: ProcessingProgress }
  | {
      requestId: number;
      type: 'PDF_LOADED';
      payload: {
        source: SourceDocument;
        pages: PageAsset[];
        spans: TextSpan[];
        warnings: string[];
        ocrLanguages: string[];
        needsOcrLanguageSelection: boolean;
        ocrCompleted: boolean;
      };
    }
  | { requestId: number; type: 'PAGE_PREVIEW'; payload: PagePreviewPayload }
  | { requestId: number; type: 'DETECTIONS'; payload: { items: Detection[] } }
  | { requestId: number; type: 'REDACTED_FILE'; payload: { file: ArrayBuffer; mode: ExportMode } }
  | { requestId: number; type: 'WARNING'; payload: { message: string } }
  | { requestId: number; type: 'ERROR'; payload: { message: string; recoverable?: boolean } };
