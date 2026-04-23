import type { MutableRefObject } from 'react';

import type {
  ExportMode,
  ManualRedaction,
  ProcessingProgress,
  SourceDocument,
} from '../../../types';
import type { Detection, ExportJob } from '../../../types';
import type { RedactorWorkerClient } from '../../../lib/worker-client';
import { PRIMARY_EXPORT_MODE, EXPORT_MODE_META } from '../config';

const triggerAnchorDownload = (blob: Blob, fileName: string) => {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};

const writeBlobToFile = async (blob: Blob, fileName: string) => {
  const windowWithSavePicker = window as Window &
    typeof globalThis & {
      showSaveFilePicker?: (options?: {
        suggestedName?: string;
        types?: Array<{ description?: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob | BufferSource) => Promise<void>;
          close: () => Promise<void>;
        }>;
        getFile?: () => Promise<File>;
      }>;
    };

  if (windowWithSavePicker.showSaveFilePicker) {
    try {
      const handle = await windowWithSavePicker.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      const bytes = await blob.arrayBuffer();
      await writable.write(bytes);
      await writable.close();

      if (handle.getFile) {
        const writtenFile = await handle.getFile();
        if (writtenFile.size !== blob.size) {
          throw new Error(
            `Saved file size mismatch: expected ${blob.size} bytes, got ${writtenFile.size}.`,
          );
        }
      }

      return;
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === 'AbortError') {
        return;
      }
      console.warn('showSaveFilePicker failed, falling back to browser download.', pickerError);
    }
  }

  triggerAnchorDownload(blob, fileName);
};

const buildExportFileName = (documentName: string, suffix: string) => {
  const trimmedName = documentName.trim();
  const safeName = trimmedName.length > 0 ? trimmedName : 'document.pdf';
  const hasPdfExtension = /\.pdf$/i.test(safeName);
  const baseName = hasPdfExtension ? safeName.replace(/\.pdf$/i, '') : safeName;

  return `${baseName}${suffix}`;
};

export function useExportRunner({
  clientRef,
  detections,
  fileRef,
  manualRedactions,
  setError,
  setExportJob,
  setFallbackExportReady,
  setProgress,
  sourceDocument,
}: {
  clientRef: MutableRefObject<RedactorWorkerClient>;
  detections: Detection[];
  fileRef: MutableRefObject<File | null>;
  manualRedactions: ManualRedaction[];
  setError: (message: string | null) => void;
  setExportJob: (payload: ExportJob) => void;
  setFallbackExportReady: (enabled: boolean) => void;
  setProgress: (progress: ProcessingProgress | null) => void;
  sourceDocument: SourceDocument | null;
}) {
  const handleExport = async (mode: ExportMode, options?: { confirmAllUnconfirmed?: boolean }) => {
    if (!sourceDocument) {
      return;
    }

    const exportDetections = options?.confirmAllUnconfirmed
      ? detections.map((detection) =>
          detection.status === 'unconfirmed'
            ? { ...detection, status: 'confirmed' as const }
            : detection,
        )
      : detections;
    const exportManualRedactions = options?.confirmAllUnconfirmed
      ? manualRedactions.map((redaction) =>
          redaction.status === 'unconfirmed'
            ? { ...redaction, status: 'confirmed' as const }
            : redaction,
        )
      : manualRedactions;

    setError(null);
    setExportJob({
      status: 'running',
      completedPages: 0,
      totalPages: sourceDocument.pageCount,
      mode,
    });

    try {
      const response = await clientRef.current.applyRedactions({
        redactions: {
          detections: exportDetections,
          manualRedactions: exportManualRedactions,
          mode,
        },
      });
      const blob = new Blob([response.payload.file], { type: 'application/pdf' });

      if (blob.size === 0) {
        throw new Error('Export produced an empty PDF.');
      }

      setExportJob({
        status: 'done',
        mode,
      });
      setFallbackExportReady(false);

      const loadedFile = fileRef.current;
      const exportFileName = buildExportFileName(
        sourceDocument.name || loadedFile?.name || 'document.pdf',
        EXPORT_MODE_META[mode].filenameSuffix,
      );
      await writeBlobToFile(blob, exportFileName);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Export failed.';
      setExportJob({
        status: 'error',
        error: message,
        mode,
      });
      setError(message);

      if (mode === PRIMARY_EXPORT_MODE) {
        setFallbackExportReady(true);
      }
    } finally {
      setProgress(null);
    }
  };

  return {
    handleExport,
  };
}
