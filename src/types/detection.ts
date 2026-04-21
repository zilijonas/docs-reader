export type TextSource = 'native' | 'ocr';
export type DetectionSource = 'rule' | 'manual';
export type DetectionStatus = 'unconfirmed' | 'confirmed';
export type DetectionType =
  | 'email'
  | 'phone'
  | 'url'
  | 'iban'
  | 'card'
  | 'date'
  | 'id'
  | 'number'
  | 'postal'
  | 'address'
  | 'vat'
  | 'nationalId'
  | 'keyword'
  | 'manual';
export type ManualMode = 'text' | 'box';
export type OcrStatus = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'skipped';
export type PageLane = 'searchable' | 'ocr';
export type TextLayerStatus = 'native' | 'ocr' | 'missing';

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

export interface DocumentResult {
  source: SourceDocument;
  pages: PageAsset[];
  spans: TextSpan[];
  detections: Detection[];
  warnings: string[];
}
