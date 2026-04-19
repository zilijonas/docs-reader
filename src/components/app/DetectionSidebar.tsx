import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Download, Plus, RotateCcw, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/cn';

import { Button, Chip, EmptyState, IconButton, Input, Kbd, ProgressBar, StatusDot } from '../../components/ui';
import type { DetectionStatus, FilterState, ProcessingProgress } from '../../lib/types';
import {
  DETECTION_TYPE_META,
  DETECTION_TYPE_ORDER,
  KEYBOARD_SHORTCUTS,
  REVIEW_FILTER_TABS,
  groupReviewItemsByType,
  type ReviewItem,
} from '../../features/redactor';

export type SidebarItem = ReviewItem;

export function DetectionSidebar({
  mobileOpen,
  onClose,
  onApproveAll,
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
  onApproveGroup,
  onApproveDetection,
  onRejectDetection,
  onToggleManualStatus,
  onDeleteManual,
  onJumpToPage,
  items,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  onApproveAll: () => void;
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
  onApproveGroup: (groupId: string) => void;
  onApproveDetection: (id: string) => void;
  onRejectDetection: (id: string) => void;
  onToggleManualStatus: (id: string, status: DetectionStatus) => void;
  onDeleteManual: (id: string) => void;
  onJumpToPage: (pageIndex: number) => void;
  items: SidebarItem[];
}) {
  const groupedItems = groupReviewItemsByType(items);
  const counts = {
    suggested: items.filter((item) => item.status === 'suggested').length,
    approved: items.filter((item) => item.status === 'approved').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
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
            <X size={14} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className="sidebar-mobile-actions mt-3 gap-2">
          <Button onClick={onReset} size="sm" variant="ghost">
            <RotateCcw size={14} strokeWidth={1.5} />
            Reset session
          </Button>
          <Button disabled={processing} onClick={onExport} size="sm">
            <Download size={14} strokeWidth={1.5} />
            Export
            <ArrowRight size={14} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border px-5 pt-3.5">
        {REVIEW_FILTER_TABS.map(({ label, status }) => {
          const isActive = filters.statuses.includes(status);

          return (
            <button
              className={cn(
                'ui-text-control -mb-px mr-5 flex items-center gap-1.5 border-b-2 bg-transparent py-2.5 transition-colors duration-200 ease-standard',
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

      <div className="border-b border-border px-5 py-3">
        <Button fullWidth onClick={onApproveAll} size="sm" variant="secondary">
          Approve all
        </Button>
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
          <ProgressBar value={progress.progress} />
          <p className="type-data mt-2">{progress.message}</p>
        </div>
      ) : null}

      <div className="border-b border-border px-5 py-ui-section">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="type-data">
            Watch for these words
          </span>
        </div>

        <div className="mb-2.5 flex gap-1.5">
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
              className="font-mono"
              interactive
              key={keyword}
              onClick={() => void onRemoveKeyword(keyword)}
            >
              <span>{keyword}</span>
              <X className="text-content-subtle" size={10} strokeWidth={1.5} />
            </Chip>
          ))}
          {keywords.length === 0 ? (
            <span className="ui-text-note italic text-content-subtle">None yet.</span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {DETECTION_TYPE_ORDER.map((type) => {
          const typeItems = groupedItems[type] || [];
          if (typeItems.length === 0) {
            return null;
          }

          const isExpanded = expandedGroups[type];
          const pendingCount = typeItems.filter((item) => item.status === 'suggested').length;
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
                  {pendingCount > 0 ? <StatusDot tone="warning" /> : null}
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
                  {pendingCount > 1 && type !== 'manual' ? (
                    <div className="px-5 pb-2.5">
                      <button
                        className="ui-text-note w-full rounded-control border border-dashed border-border-strong bg-transparent px-2.5 py-1.5 text-left font-mono tracking-ui-wide text-content-muted transition-colors duration-200 ease-standard hover:border-content-subtle hover:text-content"
                        onClick={() => {
                          typeItems.forEach((item) => {
                            if (item.status === 'suggested' && !item.manual) {
                              onApproveDetection(item.id);
                            }
                          });
                        }}
                        type="button"
                      >
                        → Approve all {pendingCount} in this group
                      </button>
                    </div>
                  ) : null}

                  {typeItems.map((item) => (
                    <DetectionRow
                      item={item}
                      key={item.id}
                      onApprove={() => (item.manual ? onToggleManualStatus(item.id, 'approved') : onApproveDetection(item.id))}
                      onApproveAll={
                        item.groupId && (item.matchCount ?? 0) > 1
                          ? () => onApproveGroup(item.groupId!)
                          : undefined
                      }
                      onDelete={item.manual ? () => onDeleteManual(item.id) : undefined}
                      onJump={() => onJumpToPage(item.pageIndex)}
                      onReject={() => (item.manual ? onToggleManualStatus(item.id, 'rejected') : onRejectDetection(item.id))}
                    />
                  ))}
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

      <div className="border-t border-border bg-surface-muted px-5 py-3">
        <div className="ui-text-label flex items-center gap-4 font-mono tracking-ui-wide text-content-subtle">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <span className="inline-flex items-center gap-1" key={shortcut.key}>
              {shortcut.key.includes('/') ? (
                <>
                  {shortcut.key.split('/').map((key, index) => (
                    <span className="inline-flex items-center gap-1" key={key}>
                      {index > 0 ? <span>/</span> : null}
                      <Kbd>{key}</Kbd>
                    </span>
                  ))}
                </>
              ) : (
                <Kbd>{shortcut.key}</Kbd>
              )}
              {shortcut.label}
            </span>
          ))}
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
  const statusTone =
    item.status === 'approved'
      ? 'safe'
      : item.status === 'rejected'
        ? 'muted'
        : 'warning';

  return (
    <div className="flex items-stretch transition-[background-color] duration-200 ease-standard">
      <button
        className="flex flex-1 flex-col gap-1 bg-transparent px-5 py-2.5 text-left"
        onClick={onJump}
        type="button"
      >
        <div className="flex items-center gap-2">
          <StatusDot tone={statusTone} />
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
              <button
                className="text-content-muted underline transition-colors duration-200 ease-standard hover:text-content"
                onClick={(event) => {
                  event.stopPropagation();
                  onApproveAll();
                }}
                type="button"
              >
                approve all {item.matchCount}
              </button>
            </>
          ) : null}
        </div>
      </button>

      <div className="flex items-center gap-0.5 pr-2.5">
        <StatusActionButton active={item.status === 'approved'} activeTone="safe" onClick={onApprove} title="Approve (A)">
          <Check size={12} strokeWidth={2} />
        </StatusActionButton>
        <StatusActionButton active={item.status === 'rejected'} activeTone="muted" onClick={onReject} title="Reject (R)">
          <X size={12} strokeWidth={2} />
        </StatusActionButton>
        {onDelete ? (
          <StatusActionButton active={false} activeTone="danger" onClick={onDelete} title="Remove">
            <Trash2 size={12} strokeWidth={2} />
          </StatusActionButton>
        ) : null}
      </div>
    </div>
  );
}

function StatusActionButton({
  active,
  activeTone,
  onClick,
  title,
  children,
}: {
  active: boolean;
  activeTone: 'safe' | 'muted' | 'danger';
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <IconButton onClick={onClick} title={title} tone={active ? activeTone : 'neutral'}>
      {children}
    </IconButton>
  );
}
