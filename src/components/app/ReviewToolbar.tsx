import clsx from 'clsx';

export function ReviewToolbar({
  canExport,
  canFallbackExport,
  drawMode,
  onExport,
  onFallbackExport,
  onReset,
  onToggleDrawMode,
  processing,
  reviewCount,
  approvedCount,
  zoom,
  onZoomChange,
  downloadUrl,
}: {
  canExport: boolean;
  canFallbackExport: boolean;
  drawMode: boolean;
  onExport: () => void;
  onFallbackExport: () => void;
  onReset: () => void | Promise<void>;
  onToggleDrawMode: () => void;
  processing: boolean;
  reviewCount: number;
  approvedCount: number;
  zoom: number;
  onZoomChange: (value: number) => void;
  downloadUrl?: string;
}) {
  return (
    <div className="glass-panel rounded-[1.6rem] border border-white/70 px-4 py-4 shadow-[0_14px_40px_rgba(53,43,23,0.1)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              drawMode ? 'bg-[#286f69] text-white shadow-lg' : 'bg-white text-stone-700',
            )}
            onClick={onToggleDrawMode}
          >
            {drawMode ? 'Drawing manual boxes' : 'Enable draw mode'}
          </button>
          <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700" onClick={onReset}>
            Reset session
          </button>
          {downloadUrl ? (
            <a href={downloadUrl} className="rounded-full bg-[#efe3d0] px-4 py-2 text-sm font-semibold text-stone-800" download>
              Open last export
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-full bg-white px-4 py-2 text-sm text-stone-700">
            <span className="font-semibold text-stone-900">{approvedCount}</span> approved / {reviewCount} in review
          </div>
          <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-stone-700">
            Zoom
            <input type="range" min="0.75" max="1.8" step="0.05" value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} />
            <span className="font-semibold">{Math.round(zoom * 100)}%</span>
          </label>
          {canFallbackExport ? (
            <button
              type="button"
              className="rounded-full bg-[#efe3d0] px-5 py-2.5 text-sm font-semibold text-stone-800 transition"
              disabled={processing}
              onClick={onFallbackExport}
            >
              Try flattened fallback
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-full bg-[#111] px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={!canExport || processing}
            onClick={onExport}
          >
            Redact & download
          </button>
        </div>
      </div>
    </div>
  );
}
