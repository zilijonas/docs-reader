import { useState } from 'react';
import type { ReactNode } from 'react';

import type {
  BoundingBox,
  DetectionSource,
  DetectionStatus,
  DetectionType,
  FilterState,
  ProcessingProgress,
} from '../../lib/types';

export type SidebarItem = {
  id: string;
  type: DetectionType;
  label: string;
  source: DetectionSource;
  status: DetectionStatus;
  pageIndex: number;
  snippet: string;
  confidence: number;
  box: BoundingBox;
  groupId?: string;
  matchCount?: number;
  manual?: boolean;
};

const TYPE_ORDER: DetectionType[] = ['email', 'phone', 'url', 'iban', 'card', 'id', 'number', 'date', 'keyword', 'manual'];
const TYPE_LABELS: Record<string, string> = {
  email: 'Email addresses',
  phone: 'Phone numbers',
  url: 'URLs',
  iban: 'IBANs',
  card: 'Card numbers',
  id: 'Identifiers',
  number: 'Long numbers',
  date: 'Dates',
  keyword: 'Custom keywords',
  manual: 'Manual boxes',
};

const TYPE_ICONS: Record<string, string> = {
  email: 'mail',
  phone: 'phone',
  url: 'link',
  iban: 'iban',
  card: 'card',
  date: 'calendar',
  id: 'id',
  number: 'hash',
  keyword: 'tag',
  manual: 'pencil',
};

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (TYPE_ICONS[type]) {
    case 'mail': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'phone': return <svg {...common}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>;
    case 'link': return <svg {...common}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>;
    case 'iban': return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="1" /><path d="M7 14v-4M12 14v-4M17 14v-4" /></svg>;
    case 'card': return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 11h20" /></svg>;
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
    case 'id': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2.5" /><path d="M14 10h5M14 14h5" /></svg>;
    case 'hash': return <svg {...common}><path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18" /></svg>;
    case 'tag': return <svg {...common}><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case 'pencil': return <svg {...common}><path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="m14 6 4 4" /></svg>;
    default: return null;
  }
}

export function DetectionSidebar({
  mobileOpen,
  onClose,
  progress,
  warnings,
  error,
  draft,
  keywords,
  onDraftChange,
  onAddKeyword,
  onRemoveKeyword,
  filters,
  onChangeFilters,
  onApproveGroup,
  onApproveDetection,
  onRejectDetection,
  onToggleDetection,
  onToggleManualStatus,
  onDeleteManual,
  onJumpToPage,
  items,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  progress: ProcessingProgress | null;
  warnings: string[];
  error: string | null;
  draft: string;
  keywords: string[];
  onDraftChange: (value: string) => void;
  onAddKeyword: () => void | Promise<void>;
  onRemoveKeyword: (keyword: string) => void | Promise<void>;
  filters: FilterState;
  onChangeFilters: (next: Partial<FilterState>) => void;
  onApproveGroup: (groupId: string) => void;
  onApproveDetection: (id: string) => void;
  onRejectDetection: (id: string) => void;
  onToggleDetection: (id: string) => void;
  onToggleManualStatus: (id: string, status: DetectionStatus) => void;
  onDeleteManual: (id: string) => void;
  onJumpToPage: (pageIndex: number) => void;
  items: SidebarItem[];
}) {
  const counts = {
    suggested: items.filter((i) => i.status === 'suggested').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };

  // Group items by type
  const grouped: Record<string, SidebarItem[]> = {};
  items.forEach((item) => {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    TYPE_ORDER.forEach((t) => { m[t] = true; });
    return m;
  });

  return (
    <aside
      className="review-sidebar"
      data-open={mobileOpen}
      style={{
        background: 'var(--paper)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'sticky',
        top: 101,
      }}
    >
      <div
        className="sidebar-mobile-header"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          background: 'var(--paper)',
          zIndex: 1,
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          Review queue
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--surface-1)',
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', padding: '14px 20px 0', gap: 0, borderBottom: '1px solid var(--line)' }}>
        {([
          ['Queue', counts.suggested, 'suggested'],
          ['Approved', counts.approved, 'approved'],
          ['Rejected', counts.rejected, 'rejected'],
        ] as const).map(([label, n, status]) => {
          const active = filters.statuses.includes(status);
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                const has = filters.statuses.includes(status);
                const next = has
                  ? filters.statuses.filter((s) => s !== status)
                  : [...filters.statuses, status];
                onChangeFilters({ statuses: next.length ? next : [status] });
              }}
              style={{
                padding: '10px 0',
                marginRight: 20,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                marginBottom: -1,
              }}
            >
              {label}
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: active ? 'var(--ink)' : 'var(--surface-1)',
                  color: active ? 'var(--paper)' : 'var(--ink-3)',
                  fontSize: 10.5,
                  fontFamily: 'var(--mono)',
                }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Warnings/errors */}
      {(warnings.length > 0 || error) && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
          {warnings.map((warning) => (
            <div key={warning} style={{ padding: '8px 10px', borderRadius: 4, background: 'color-mix(in oklab, var(--risk) 10%, var(--paper))', color: 'var(--risk-ink)', fontSize: 12.5, marginBottom: 6 }}>
              {warning}
            </div>
          ))}
          {error ? (
            <div style={{ padding: '8px 10px', borderRadius: 4, background: 'color-mix(in oklab, var(--error) 8%, var(--paper))', color: 'var(--error)', fontSize: 12.5 }}>
              {error}
            </div>
          ) : null}
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ height: 2, background: 'var(--line)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progress.progress * 100}%`, background: 'var(--ink)', transition: 'width 460ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>{progress.message}</p>
        </div>
      )}

      {/* Custom keywords */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Watch for these words
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            type="text"
            value={draft}
            placeholder="Add a keyword…"
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddKeyword();
              }
            }}
            style={{
              flex: 1,
              padding: '7px 10px',
              fontSize: 13,
              fontFamily: 'var(--sans)',
              background: 'var(--paper)',
              border: '1px solid var(--line-strong)',
              borderRadius: 4,
              outline: 'none',
              color: 'var(--ink)',
            }}
          />
          <button
            type="button"
            onClick={onAddKeyword}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--surface-1)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => onRemoveKeyword(kw)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px 4px 10px',
                borderRadius: 4,
                background: 'var(--surface-1)',
                border: '1px solid var(--line)',
                fontSize: 12,
                color: 'var(--ink)',
                cursor: 'pointer',
                fontFamily: 'var(--mono)',
              }}
            >
              {kw}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          ))}
          {keywords.length === 0 ? (
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>None yet.</span>
          ) : null}
        </div>
      </div>

      {/* Detection groups */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {TYPE_ORDER.map((type) => {
          const typeItems = grouped[type] || [];
          if (typeItems.length === 0) return null;
          const isOpen = expanded[type];
          const pending = typeItems.filter((i) => i.status === 'suggested').length;

          return (
            <div key={type} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                type="button"
                onClick={() => setExpanded((p) => ({ ...p, [type]: !p[type] }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--ink-2)' }}><TypeIcon type={type} size={14} /></span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{TYPE_LABELS[type]}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>({typeItems.length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pending > 0 ? (
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--risk)' }} />
                  ) : null}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-3)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isOpen ? (
                <div style={{ padding: '0 0 10px' }}>
                  {pending > 1 && type !== 'manual' ? (
                    <div style={{ padding: '0 20px 10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          typeItems.forEach((it) => {
                            if (it.status === 'suggested' && !it.manual) {
                              onApproveDetection(it.id);
                            }
                          });
                        }}
                        style={{
                          fontSize: 11.5,
                          fontFamily: 'var(--mono)',
                          letterSpacing: '0.06em',
                          color: 'var(--ink-2)',
                          background: 'transparent',
                          border: '1px dashed var(--line-strong)',
                          borderRadius: 4,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        → Approve all {pending} in this group
                      </button>
                    </div>
                  ) : null}
                  {typeItems.map((item) => (
                    <DetectionRow
                      key={item.id}
                      item={item}
                      onJump={() => onJumpToPage(item.pageIndex)}
                      onApprove={() => item.manual ? onToggleManualStatus(item.id, 'approved') : onApproveDetection(item.id)}
                      onReject={() => item.manual ? onToggleManualStatus(item.id, 'rejected') : onRejectDetection(item.id)}
                      onDelete={item.manual ? () => onDeleteManual(item.id) : undefined}
                      onApproveAll={item.groupId && (item.matchCount ?? 0) > 1 ? () => onApproveGroup(item.groupId!) : undefined}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {items.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 6" /></svg>
            <div style={{ fontSize: 13.5, marginTop: 10, color: 'var(--ink-2)' }}>Nothing in this view.</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--ink-3)' }}>Load a PDF to see detections, or adjust your filters.</div>
          </div>
        ) : null}
      </div>

      {/* Footer hint */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          <span><Kbd>A</Kbd> approve</span>
          <span><Kbd>R</Kbd> reject</span>
          <span><Kbd>J</Kbd>/<Kbd>K</Kbd> navigate</span>
        </div>
      </div>
    </aside>
  );
}

function DetectionRow({
  item,
  onJump,
  onApprove,
  onReject,
  onDelete,
  onApproveAll,
}: {
  item: SidebarItem;
  onJump: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete?: () => void;
  onApproveAll?: () => void;
}) {
  const statusColor =
    item.status === 'approved' ? 'var(--safe)' :
    item.status === 'rejected' ? 'var(--ink-3)' :
    'var(--risk)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        transition: 'background 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <button
        type="button"
        onClick={onJump}
        style={{
          flex: 1,
          padding: '10px 16px 10px 20px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: statusColor, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: item.manual ? 'var(--sans)' : 'var(--mono)',
              fontSize: item.manual ? 13 : 12.5,
              color: 'var(--ink)',
              fontStyle: item.manual ? 'italic' : 'normal',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 220,
            }}
          >
            {item.snippet}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
          <span>p.{item.pageIndex + 1}</span>
          {!item.manual ? (
            <>
              <span>·</span>
              <span>{Math.round(item.confidence * 100)}%</span>
            </>
          ) : null}
          {onApproveAll ? (
            <>
              <span>·</span>
              <span
                onClick={(e) => { e.stopPropagation(); onApproveAll(); }}
                style={{ color: 'var(--ink-2)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                approve all {item.matchCount}
              </span>
            </>
          ) : null}
        </div>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10, gap: 2 }}>
        <IconAction icon="check" active={item.status === 'approved'} activeColor="var(--safe)" onClick={onApprove} title="Approve (A)" />
        <IconAction icon="x" active={item.status === 'rejected'} activeColor="var(--ink-3)" onClick={onReject} title="Reject (R)" />
        {onDelete ? <IconAction icon="x" active={false} activeColor="var(--error)" onClick={onDelete} title="Remove" /> : null}
      </div>
    </div>
  );
}

function IconAction({ icon, active, activeColor, onClick, title }: { icon: string; active: boolean; activeColor: string; onClick: () => void; title: string }) {
  const iconEl = icon === 'check' ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 6" /></svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 26,
        height: 26,
        borderRadius: 4,
        background: active ? activeColor : 'transparent',
        border: '1px solid',
        borderColor: active ? activeColor : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        padding: 0,
      }}
    >
      {iconEl}
    </button>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-block',
        padding: '1px 5px',
        border: '1px solid var(--line-strong)',
        borderRadius: 3,
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        minWidth: 14,
        textAlign: 'center',
      }}
    >
      {children}
    </kbd>
  );
}

const nextStatus = (status: DetectionStatus): DetectionStatus => {
  if (status === 'suggested') return 'approved';
  if (status === 'approved') return 'rejected';
  return 'suggested';
};
