import type { PreviewAsset } from '../../types';
import { updatePreviewRecord } from '../../features/redactor';
import type { ReviewStoreState } from './types';

export const releasePreviewUrls = (previews: Record<number, PreviewAsset>) => {
  Object.values(previews).forEach((preview) => {
    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
  });
};

export const createPreviewAssetsSlice = (): Pick<
  ReviewStoreState,
  'previews' | 'setPreviewState'
> => ({
  previews: {},
  setPreviewState: () => undefined,
});

export { updatePreviewRecord };
