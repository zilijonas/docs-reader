import type { MutableRefObject } from 'react';

import { dedupeDetections } from '../../../lib/utils';
import type { Detection, ProcessingProgress } from '../../../types';
import type { RedactorWorkerClient } from '../../../lib/worker-client';
import { preserveRuleStatuses } from '../review-helpers';

export function useDetectionRunner({
  clientRef,
  detections,
  hasLoadedDocument,
  setCustomKeywords,
  setDetections,
  setError,
  setProgress,
}: {
  clientRef: MutableRefObject<RedactorWorkerClient>;
  detections: Detection[];
  hasLoadedDocument: boolean;
  setCustomKeywords: (keywords: string[]) => void;
  setDetections: (detections: Detection[]) => void;
  setError: (message: string | null) => void;
  setProgress: (progress: ProcessingProgress | null) => void;
}) {
  const runDetections = async (
    keywords: string[],
    existingRuleDetections = detections.filter((detection) => detection.source === 'rule'),
    existingNonRuleDetections = detections.filter((detection) => detection.source !== 'rule'),
    hasLoadedDocumentOverride = hasLoadedDocument,
  ) => {
    setCustomKeywords(keywords);

    if (!hasLoadedDocumentOverride) {
      return;
    }

    try {
      const response = await clientRef.current.detect({ rules: { keywords } });
      const persistedRuleDetections = preserveRuleStatuses(response.payload.items, existingRuleDetections);
      setDetections(dedupeDetections([...persistedRuleDetections, ...existingNonRuleDetections]));
    } finally {
      setProgress(null);
    }
  };

  const syncKeywords = async (keywords: string[]) => {
    try {
      await runDetections(keywords);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not update detections.');
    }
  };

  return {
    runDetections,
    syncKeywords,
  };
}
