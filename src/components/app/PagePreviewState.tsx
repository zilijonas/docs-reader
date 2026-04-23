import type { PreviewAsset } from '../../types';
import { getPreviewDisplayState } from '../../features/redactor';

export function PagePreviewState({
  pageIndex,
  preview,
}: {
  pageIndex: number;
  preview?: PreviewAsset;
}) {
  const displayState = getPreviewDisplayState(preview);

  if (displayState === 'ready' && preview?.url) {
    return (
      <img
        alt={`Preview of page ${pageIndex + 1}`}
        className="block w-full"
        draggable={false}
        src={preview.url}
      />
    );
  }

  if (displayState === 'error') {
    return (
      <div className="text-danger flex min-h-64 items-center justify-center px-6 py-10 text-center text-sm">
        {preview?.error}
      </div>
    );
  }

  return (
    <div className="text-content-subtle flex min-h-64 items-center justify-center px-6 py-10 text-center text-sm">
      Rendering page preview locally.
    </div>
  );
}
