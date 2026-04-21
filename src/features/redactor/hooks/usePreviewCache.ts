import type { MutableRefObject } from 'react';

import type { PreviewAsset } from '../../../types';
import type { RedactorWorkerClient } from '../../../lib/worker-client';

export function usePreviewCache({
  clientRef,
  previews,
  setPreviewState,
}: {
  clientRef: MutableRefObject<RedactorWorkerClient>;
  previews: Record<number, PreviewAsset>;
  setPreviewState: (pageIndex: number, preview: Partial<PreviewAsset>) => void;
}) {
  const ensurePreview = async (pageIndex: number) => {
    const existingPreview = previews[pageIndex];
    if (existingPreview?.status === 'ready' || existingPreview?.status === 'loading') {
      return;
    }

    setPreviewState(pageIndex, { status: 'loading', error: undefined });

    try {
      const response = await clientRef.current.getPagePreview({ pageIndex });
      const previewUrl = URL.createObjectURL(new Blob([response.payload.bytes], { type: response.payload.mimeType }));

      if (existingPreview?.url) {
        URL.revokeObjectURL(existingPreview.url);
      }

      setPreviewState(pageIndex, { status: 'ready', url: previewUrl });
    } catch (caughtError) {
      setPreviewState(pageIndex, {
        status: 'error',
        error: caughtError instanceof Error ? caughtError.message : 'Could not render preview.',
      });
    }
  };

  return {
    ensurePreview,
  };
}
