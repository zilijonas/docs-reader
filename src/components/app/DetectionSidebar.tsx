import clsx from 'clsx';
import type { ReactNode } from 'react';

import { DETECTION_TYPE_LABELS } from '../../lib/constants';
import type {
  BoundingBox,
  DetectionSource,
  DetectionStatus,
  DetectionType,
  ExportJob,
  FilterState,
  ProcessingProgress,
} from '../../lib/types';
const toggleFilterValue = <T extends string>(list: T[], value: T, fallback: T[]) => {
  const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
  return next.length ? next : fallback;
};

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

export function DetectionSidebar({
  progress,
  exportJob,
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
  onRejectPage,
  onClearManualPage,
  items,
}: {
  progress: ProcessingProgress | null;
  exportJob: ExportJob;
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
  onRejectPage: () => void;
  onClearManualPage: () => void;
  items: SidebarItem[];
}) {
  const statuses: DetectionStatus[] = ['suggested', 'approved', 'rejected'];
  const sources: DetectionSource[] = ['rule', 'manual'];
  const types: DetectionType[] = ['email', 'phone', 'url', 'iban', 'card', 'date', 'id', 'number', 'keyword', 'manual'];

  return (
    <aside className="glass-panel sticky top-4 h-fit rounded-[2rem] border border-white/70 p-4 shadow-[0_16px_50px_rgba(53,43,23,0.12)] sm:p-5">
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">Review workspace</p>
          <h2 className="text-2xl font-semibold text-stone-900">Detection controls</h2>
          <p className="text-sm leading-6 text-stone-600">
            Approve what should be redacted, reject what should stay visible, and add manual boxes for anything automation
            missed.
          </p>
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Pipeline</p>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
              {progress?.phase ?? exportJob.status}
            </span>
          </div>
          {progress ? (
            <>
              <div className="h-2 rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-[#286f69]" style={{ width: `${progress.progress * 100}%` }} />
              </div>
              <p className="text-sm text-stone-700">{progress.message}</p>
            </>
          ) : null}
          {warnings.length ? (
            <div className="space-y-2">
              {warnings.map((warning) => (
                <div key={warning} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
          {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Custom keywords</p>
            <p className="text-sm leading-6 text-stone-600">Use these for project names, account numbers, case IDs, or internal jargon.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onAddKeyword();
                }
              }}
              className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#286f69]"
              placeholder="Add a custom keyword"
            />
            <button type="button" onClick={onAddKeyword} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.length ? (
              keywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  className="rounded-full bg-[#efe3d0] px-3 py-1.5 text-sm font-medium text-stone-800"
                  onClick={() => onRemoveKeyword(keyword)}
                >
                  {keyword} ×
                </button>
              ))
            ) : (
              <p className="text-sm text-stone-500">No custom keywords yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Filters</p>
            <p className="text-sm text-stone-600">Keep the review queue focused without hiding everything by accident.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <FilterChip
                  key={status}
                  active={filters.statuses.includes(status)}
                  onClick={() => onChangeFilters({ statuses: toggleFilterValue(filters.statuses, status, statuses) })}
                >
                  {status}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Source</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <FilterChip
                  key={source}
                  active={filters.sources.includes(source)}
                  onClick={() => onChangeFilters({ sources: toggleFilterValue(filters.sources, source, sources) })}
                >
                  {source}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Type</p>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <FilterChip
                  key={type}
                  active={filters.types.includes(type)}
                  onClick={() => onChangeFilters({ types: toggleFilterValue(filters.types, type, types) })}
                >
                  {DETECTION_TYPE_LABELS[type]}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={onRejectPage}>Reject page</ActionButton>
          <ActionButton onClick={onClearManualPage} tone="muted">
            Clear manual
          </ActionButton>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Items</p>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{items.length} visible</span>
          </div>
          <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {items.length ? (
              items.map((item) => (
                <DetectionRow
                  key={item.id}
                  item={item}
                  onJump={() => onJumpToPage(item.pageIndex)}
                  onToggle={() => (item.manual ? onToggleManualStatus(item.id, nextStatus(item.status)) : onToggleDetection(item.id))}
                  onApprove={() => (item.manual ? onToggleManualStatus(item.id, 'approved') : onApproveDetection(item.id))}
                  onReject={() => (item.manual ? onToggleManualStatus(item.id, 'rejected') : onRejectDetection(item.id))}
                  onApproveAll={item.groupId ? () => onApproveGroup(item.groupId!) : undefined}
                  onDelete={item.manual ? () => onDeleteManual(item.id) : undefined}
                />
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white/65 px-4 py-5 text-sm text-stone-600">
                Load a PDF to see detections here, or adjust the filters if everything disappeared.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function DetectionRow({
  item,
  onJump,
  onToggle,
  onApprove,
  onReject,
  onApproveAll,
  onDelete,
}: {
  item: SidebarItem;
  onJump: () => void;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onApproveAll?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-stone-200 bg-white/90 p-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="text-left" onClick={onJump}>
          <div className="text-sm font-semibold text-stone-900">{item.label}</div>
          <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
            Page {item.pageIndex + 1} • {item.source} • {Math.round(item.confidence * 100)}%
          </div>
        </button>
        <button type="button" className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600" onClick={onToggle}>
          {item.status}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-700">{item.snippet}</p>
      {item.matchCount && item.matchCount > 1 ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#8e4a24]">{item.matchCount} identical matches</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton onClick={onApprove}>Approve</ActionButton>
        <ActionButton onClick={onReject} tone="muted">
          Reject
        </ActionButton>
        {onApproveAll ? <ActionButton onClick={onApproveAll}>Approve all</ActionButton> : null}
        {onDelete ? (
          <ActionButton onClick={onDelete} tone="danger">
            Remove
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-full px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-[#286f69] text-white' : 'bg-stone-100 text-stone-700',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  tone = 'default',
  children,
}: {
  onClick: () => void;
  tone?: 'default' | 'muted' | 'danger';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-full px-3 py-1.5 text-sm font-semibold transition',
        tone === 'default' && 'bg-[#111] text-white',
        tone === 'muted' && 'bg-stone-100 text-stone-700',
        tone === 'danger' && 'bg-rose-100 text-rose-700',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const nextStatus = (status: DetectionStatus): DetectionStatus => {
  if (status === 'suggested') return 'approved';
  if (status === 'approved') return 'rejected';
  return 'suggested';
};
