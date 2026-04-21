import type { DetectionSource, DetectionStatus, DetectionType } from './detection';

export type ExportMode = 'true-redaction' | 'flattened';

export interface PreviewAsset {
  pageIndex: number;
  url?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

export type ExportJob =
  | { status: 'idle' }
  | { status: 'running'; totalPages: number; completedPages: number; mode: ExportMode }
  | { status: 'done'; mode: ExportMode }
  | { status: 'error'; error: string; mode?: ExportMode };

export interface FilterState {
  statuses: DetectionStatus[];
  sources: DetectionSource[];
  types: DetectionType[];
}

export type WorkflowPhase = 'idle' | 'uploading' | 'awaitingOcr' | 'detecting' | 'reviewing' | 'exporting' | 'error';
