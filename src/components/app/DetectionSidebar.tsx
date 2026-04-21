import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Circle, CircleCheck, Download, Plus, RotateCcw, Trash2, X as XIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { Button, Chip, CircularProgress, EmptyState, IconButton, Input, ProgressBar, StatusDot } from '../../components/ui';
import type { DetectionStatus, FilterState, ProcessingProgress } from '../../lib/types';
import {
  DETECTION_TYPE_META,
  DETECTION_TYPE_ORDER,
  REVIEW_FILTER_TABS,
  groupReviewItemsByType,
  type ReviewItem,
} from '../../features/redactor';

export type SidebarItem = ReviewItem;

function SidebarActionRow({
  disabledExport,
  onExport,
  onReset,
}: {
  disabledExport: boolean;
  onExport: () => void;
  onReset: () => void | Promise<void>;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button className="justify-between" onClick={() => void onReset()} size="sm" variant="secondary">
        <span className="inline-flex items-center gap-2">
          <XIcon size={14} strokeWidth={1.5} />
          Remove file
        </span>
      </Button>
      <Button className="justify-between" disabled={disabledExport} onClick={onExport} size="sm" variant="primary">
        <span className="inline-flex items-center gap-2">
          <Download size={14} strokeWidth={1.5} />
          Export
        </span>
        <ArrowRight size={14} strokeWidth={1.5} />
      </Button>
    </div>
  );
}

export function DetectionSidebar({
  confirmedCount,
  unconfirmedCount,
  mobileOpen,
  onClose,
  onConfirmAll,
  onUnconfirmAll,
  onExport,
  onReset,
  processing,
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
  onConfirmDetection,
  onUnconfirmDetection,
  onToggleManualStatus,
  onDeleteManual,
  onJumpToItem,
  items,
}: {
  confirmedCount: number;
  unconfirmedCount: number;
  mobileOpen: boolean;
  onClose: () => void;
  onConfirmAll: () => void;
  onUnconfirmAll: () => void;
  onExport: () => void;
  onReset: () => void | Promise<void>;
  processing: boolean;
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
  onConfirmDetection: (id: string) => void;
  onUnconfirmDetection: (id: string) => void;
  onToggleManualStatus: (id: string, status: DetectionStatus) => void;
  onDeleteManual: (id: string) => void;
  onJumpToItem: (id: string, pageIndex: number) => void;
  items: SidebarItem[];
}) {
  const groupedItems = groupReviewItemsByType(items);
  const counts = {
    unconfirmed: items.filter((item) => item.status === 'unconfirmed').length,
    confirmed: items.filter((item) => item.status === 'confirmed').length,
  };
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DETECTION_TYPE_ORDER.map((type) => [type, true])),
  );

  return (
    <aside
      className="review-sidebar flex h-full flex-col overflow-auto bg-canvas"
      data-open={mobileOpen}
    >
      <div className="sidebar-mobile-header sticky top-0 z-[1] border-b border-border bg-canvas px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="type-data">
            Review queue
          </span>
          <IconButton className="size-ui-close" onClick={onClose} shape="pill" tone="surface">
            <XIcon size={14} strokeWidth={1.5} />
          </IconButton>
        </div>

        <SidebarActionRow
          disabledExport={processing}
          onExport={onExport}
          onReset={onReset}
        />
      </div>

      {(warnings.length > 0 || error) ? (
        <div className="border-b border-border px-5 py-3">
          {warnings.map((warning) => (
            <div
              className="ui-text-control mb-1.5 rounded-control bg-warning-soft px-2.5 py-2 text-warning-ink"
              key={warning}
            >
              {warning}
            </div>
          ))}
          {error ? (
            <div
              className="ui-text-control rounded-control bg-danger-soft px-2.5 py-2 text-danger"
            >
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      {progress ? (
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <CircularProgress className="text-content shrink-0" size={36} strokeWidth={3} value={progress.progress} />
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="type-data">{progress.message}</p>
              <ProgressBar value={progress.progress} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-b border-border px-5 py-ui-section">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="type-data">
            Watch for these words
          </span>
        </div>

        <div className="mb-2.5 flex gap-1.5 items-center">
          <Input
            className="ui-text-field flex-1"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onAddKeyword();
              }
            }}
            placeholder="Add a keyword…"
            value={draft}
          />
          <Button onClick={onAddKeyword} size="icon" variant="secondary">
            <Plus size={14} strokeWidth={1.5} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <Chip
              interactive
              key={keyword}
              onClick={() => void onRemoveKeyword(keyword)}
            >
              <span className="whitespace-nowrap font-mono text-xs">{keyword}</span>
              <XIcon className="text-content-subtle" size={10} strokeWidth={1.5} />
            </Chip>
          ))}
          {keywords.length === 0 ? (
            <span className="ui-text-note italic text-content-subtle">None yet.</span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-0 px-5 pt-3.5">
        {REVIEW_FILTER_TABS.map(({ label, status }) => {
          const isActive = filters.statuses.includes(status);

          return (
            <button
              className={cn(
                'ui-text-control mb-4 mr-5 flex items-center gap-1.5 border-b-2 bg-transparent py-2.5 transition-colors duration-200 ease-standard',
                isActive
                  ? 'border-content text-content'
                  : 'border-transparent text-content-subtle hover:text-content-muted',
              )}
              key={label}
              onClick={() => {
                const nextStatuses = filters.statuses.includes(status)
                  ? filters.statuses.filter((currentStatus) => currentStatus !== status)
                  : [...filters.statuses, status];

                onChangeFilters({ statuses: nextStatuses.length > 0 ? nextStatuses : [status] });
              }}
              type="button"
            >
              {label}
              <span
                className={cn(
                  'ui-text-label rounded-full px-1.5 py-0.25 font-mono',
                  isActive ? 'bg-content text-canvas' : 'bg-surface-muted text-content-subtle',
                )}
              >
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {unconfirmedCount > 0 || confirmedCount > 0 ? (
        <div className="px-5 pb-3">
          <button
            className="flex gap-1 items-center justify-between ui-text-note w-full rounded-control border border-dashed border-border-strong bg-transparent px-2.5 py-1.5 text-left font-mono tracking-ui-wide text-content-muted transition-colors duration-200 ease-standard hover:border-content-subtle hover:text-content"
            onClick={() => {
              if (unconfirmedCount > 0) {
                onConfirmAll();
              } else {
                onUnconfirmAll();
              }
            }}
            type="button"
          >
            {unconfirmedCount > 0 ? (
              <>
                {`→ Confirm all ${unconfirmedCount} on all pages`}
                <Check size={12} strokeWidth={1.5} />
              </>
            ) : (
              <>
                {`→ Unconfirm all ${confirmedCount} on all pages`}
                <XIcon size={12} strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      ) : null}

      <div>
        {DETECTION_TYPE_ORDER.map((type) => {
          const typeItems = groupedItems[type] || [];
          if (typeItems.length === 0) {
            return null;
          }

          const isExpanded = expandedGroups[type];
          const unconfirmedCount = typeItems.filter((item) => item.status === 'unconfirmed').length;
          const meta = DETECTION_TYPE_META[type];

          return (
            <div className="border-b border-border" key={type}>
              <button
                className="flex w-full items-center justify-between bg-transparent px-5 py-3 text-content"
                onClick={() => setExpandedGroups((currentGroups) => ({ ...currentGroups, [type]: !currentGroups[type] }))}
                type="button"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-content-muted">{meta.icon()}</span>
                  <span className="ui-text-field font-medium">{meta.pluralLabel}</span>
                  <span className="ui-text-label font-mono text-content-subtle">({typeItems.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  {unconfirmedCount > 0 ? <StatusDot tone="warning" /> : null}
                  <ChevronDown
                    className={cn(
                      'size-ui-icon text-content-subtle transition-transform duration-200 ease-standard',
                      isExpanded ? 'rotate-0' : '-rotate-90',
                    )}
                    strokeWidth={1.5}
                  />
                </div>
              </button>

              {isExpanded ? (
                <div className="pb-2.5">
                  {typeItems.length > 1 && type !== 'manual' ? (
                    <div className="px-5 pb-2.5">
                      <button
                        className="flex gap-1 items-center justify-between ui-text-note w-full rounded-control border border-dashed border-border-strong bg-transparent px-2.5 py-1.5 text-left font-mono tracking-ui-wide text-content-muted transition-colors duration-200 ease-standard hover:border-content-subtle hover:text-content"
                        onClick={() => {
                          typeItems.forEach((item) => {
                            if (item.manual) {
                              return;
                            }

                            if (unconfirmedCount > 0 && item.status === 'unconfirmed') {
                              onConfirmDetection(item.id);
                            }

                            if (unconfirmedCount === 0 && item.status === 'confirmed') {
                              onUnconfirmDetection(item.id);
                            }
                          });
                        }}
                        type="button"
                      >
                        {unconfirmedCount > 0
                          ? `→ Confirm all ${unconfirmedCount} in this group`
                          : `→ Reject all ${typeItems.length} in this group`}
                        {unconfirmedCount > 0 ? <Check size={12} strokeWidth={1.5} /> : <XIcon size={12} strokeWidth={1.5} />}
                      </button>
                    </div>
                  ) : null}

                  {typeItems.map((item) => {
                    const matchGroupItems =
                      item.groupId && (item.matchCount ?? 0) > 1
                        ? typeItems.filter((candidate) => candidate.groupId === item.groupId)
                        : [];
                    const matchGroupUnconfirmedCount = matchGroupItems.filter(
                      (candidate) => candidate.status === 'unconfirmed',
                    ).length;

                    return (
                      <DetectionRow
                        item={item}
                        key={item.id}
                        onConfirm={() =>
                          item.manual ? onToggleManualStatus(item.id, 'confirmed') : onConfirmDetection(item.id)
                        }
                        onConfirmAll={
                          matchGroupItems.length > 0
                            ? () => {
                                matchGroupItems.forEach((candidate) => {
                                  if (matchGroupUnconfirmedCount > 0 && candidate.status === 'unconfirmed') {
                                    onConfirmDetection(candidate.id);
                                  }

                                  if (matchGroupUnconfirmedCount === 0 && candidate.status === 'confirmed') {
                                    onUnconfirmDetection(candidate.id);
                                  }
                                });
                              }
                            : undefined
                        }
                        onConfirmAllLabel={
                          matchGroupItems.length > 0
                            ? matchGroupUnconfirmedCount > 0
                              ? `confirm all ${matchGroupUnconfirmedCount}`
                              : `reject all ${matchGroupItems.length}`
                            : undefined
                        }
                        onDelete={item.manual ? () => onDeleteManual(item.id) : undefined}
                        onJump={() => onJumpToItem(item.id, item.pageIndex)}
                        onUnconfirm={() =>
                          item.manual ? onToggleManualStatus(item.id, 'unconfirmed') : onUnconfirmDetection(item.id)
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {items.length === 0 ? (
          <EmptyState
            description="Load a PDF to see detections, or adjust your filters."
            icon={<Check size={18} strokeWidth={1.5} />}
            title="Nothing in this view."
          />
        ) : null}
      </div>

    </aside>
  );
}

function DetectionRow({
  item,
  onJump,
  onConfirm,
  onUnconfirm,
  onDelete,
  onConfirmAll,
  onConfirmAllLabel,
}: {
  item: SidebarItem;
  onJump: () => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onDelete?: () => void;
  onConfirmAll?: () => void;
  onConfirmAllLabel?: string;
}) {
  const isConfirmed = item.status === 'confirmed';

  return (
    <div className="flex items-stretch transition-[background-color] duration-200 ease-standard">
      <button
        className="flex flex-1 flex-col gap-1 bg-transparent px-5 py-2.5 text-left"
        onClick={onJump}
        type="button"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'measure-review-snippet overflow-hidden text-ellipsis whitespace-nowrap text-content',
              item.manual ? 'ui-text-field italic' : 'ui-text-control font-mono',
            )}
          >
            {item.snippet}
          </span>
        </div>

        <div className="ui-text-label flex items-center gap-2.5 font-mono text-content-subtle">
          <RowStatusIcon status={item.status} />
          <span>p.{item.pageIndex + 1}</span>
          {!item.manual ? (
            <span>{Math.round(item.confidence * 100)}%</span>
          ) : null}
          {onConfirmAll && onConfirmAllLabel ? (
            <span
              className="cursor-pointer text-content-muted underline transition-colors duration-200 ease-standard hover:text-content"
              onClick={(event) => {
                event.stopPropagation();
                onConfirmAll();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  onConfirmAll();
                }
              }}
              role="button"
              tabIndex={0}
            >
              {onConfirmAllLabel}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex items-center gap-0.5 mr-5">
        <StatusActionButton
          onClick={isConfirmed ? onUnconfirm : onConfirm}
          size="lg"
          title={isConfirmed ? 'Unconfirm (R)' : 'Confirm (A)'}
        >
          {isConfirmed ? <XIcon size={14} strokeWidth={2} className="text-danger/70" /> : <Check size={14} strokeWidth={2} className="text-success" />}
        </StatusActionButton>
        {onDelete ? (
          <StatusActionButton onClick={onDelete} title="Remove">
            <Trash2 size={12} strokeWidth={2} />
          </StatusActionButton>
        ) : null}
      </div>
    </div>
  );
}

function StatusActionButton({
  onClick,
  size = 'md',
  title,
  children,
}: {
  onClick: () => void;
  size?: 'md' | 'lg';
  title: string;
  children: ReactNode;
}) {
  return (
    <IconButton onClick={onClick} size={size} title={title} tone="surface" shape="pill">
      {children}
    </IconButton>
  );
}

function RowStatusIcon({ status }: { status: DetectionStatus }) {
  return status === 'confirmed' ? (
    <CircleCheck className="shrink-0 text-success" size={12} strokeWidth={2} />
  ) : (
    <Circle className="shrink-0 text-warning" size={12} strokeWidth={2} />
  );
}
