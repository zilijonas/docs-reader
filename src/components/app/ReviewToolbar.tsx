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
  pageCount,
  activePage,
  onActivatePage,
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
  pageCount?: number;
  activePage?: number;
  onActivatePage?: (pageIndex: number) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      {/* Left: tool buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ToolButton active={!drawMode} onClick={onToggleDrawMode} label="Select">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 3l6 17 3-7 7-3L4 3Z" /></svg>
        </ToolButton>
        <ToolButton active={drawMode} onClick={onToggleDrawMode} label="Draw">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
        </ToolButton>
        <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 6px' }} />
        <ToolButton onClick={() => onZoomChange(Math.max(0.7, zoom - 0.1))}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-3.5-3.5" /></svg>
        </ToolButton>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => onZoomChange(Math.min(1.8, zoom + 0.1))}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M20 20l-3.5-3.5" /></svg>
        </ToolButton>
      </div>

      {/* Center: page navigator */}
      {pageCount && pageCount > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActivatePage?.(i)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                border: '1px solid',
                borderColor: activePage === i ? 'var(--ink)' : 'var(--line)',
                background: activePage === i ? 'var(--ink)' : 'var(--paper)',
                color: activePage === i ? 'var(--paper)' : 'var(--ink-2)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            height: 28,
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--ink)',
            border: '1px solid transparent',
          }}
        >
          Reset session
        </button>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              height: 28,
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              background: 'var(--surface-1)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              textDecoration: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12M6 10l6 6 6-6" /><path d="M4 20h16" /></svg>
            Last export
          </a>
        ) : null}
        {canFallbackExport ? (
          <button
            type="button"
            disabled={processing}
            onClick={onFallbackExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              height: 28,
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.5 : 1,
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--line-strong)',
            }}
          >
            Flattened fallback
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canExport || processing}
          onClick={onExport}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            height: 28,
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            cursor: !canExport || processing ? 'not-allowed' : 'pointer',
            opacity: !canExport || processing ? 0.5 : 1,
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: '1px solid var(--ink)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12M6 10l6 6 6-6" /><path d="M4 20h16" /></svg>
          Export
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: label ? '6px 10px' : '6px',
        height: 28,
        borderRadius: 4,
        border: '1px solid',
        borderColor: active ? 'var(--ink)' : 'transparent',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
