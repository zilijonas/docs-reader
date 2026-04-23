import type { ExportJob } from '../../types';
import { initialExportJob } from '../../features/redactor';
import type { ReviewStoreState } from './types';

export const createInitialExportJob = (): ExportJob => initialExportJob();

export const createExportJobSlice = (): Pick<
  ReviewStoreState,
  | 'exportJob'
  | 'warnings'
  | 'fallbackExportReady'
  | 'setExportJob'
  | 'appendWarning'
  | 'setFallbackExportReady'
> => ({
  exportJob: createInitialExportJob(),
  warnings: [],
  fallbackExportReady: false,
  setExportJob: () => undefined,
  appendWarning: () => undefined,
  setFallbackExportReady: () => undefined,
});
