import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';

import { copy } from '@/lib/copy';

import { Alert, CircularProgress, EmptyState, IconButton, ProgressBar } from '../../components/ui';
import {
  DETECTION_TYPE_META,
  DETECTION_TYPE_ORDER,
  groupReviewItemsByType,
} from '../../features/redactor';
import { useReviewContext } from '../../features/redactor/context/ReviewContext';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';
import { DetectionGroupHeader } from './DetectionGroupHeader';
import { DetectionRow } from './DetectionRow';
import { FilterTabBar } from './FilterTabBar';
import { KeywordWatchlist } from './KeywordWatchlist';
import { SidebarActionRow } from './SidebarActionRow';

export function DetectionSidebar() {
  const {
    closeReviewPanel,
    error,
    handleKeywordRemove,
    handleKeywordSubmit,
    isProcessing,
    isSidebarOpen,
    keywordDraft,
    progress,
    scrollToReviewItem,
    setKeywordDraft,
  } = useWorkflowContext();
  const {
    confirmAll,
    confirmedCount,
    customKeywords,
    deferredReviewItems,
    filters,
    handlePrimaryExport,
    handleResetRequest,
    removeManualRedaction,
    revertAll,
    setDetectionStatus,
    setFilters,
    setManualStatus,
    unconfirmedCount,
    warnings,
  } = useReviewContext();
  const groupedItems = groupReviewItemsByType(deferredReviewItems);
  const counts = {
    unconfirmed: deferredReviewItems.filter((item) => item.status === 'unconfirmed').length,
    confirmed: deferredReviewItems.filter((item) => item.status === 'confirmed').length,
  };
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DETECTION_TYPE_ORDER.map((type) => [type, true])),
  );

  return (
    <aside
      className="review-sidebar flex h-full flex-col overflow-auto bg-canvas"
      data-open={isSidebarOpen}
    >
      <div className="sidebar-mobile-header sticky top-0 z-raised border-b border-border bg-canvas px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="type-data">{copy.sidebar.reviewQueue}</span>
          <IconButton className="size-ui-close" onClick={closeReviewPanel} shape="pill" tone="surface">
            <XIcon size={14} strokeWidth={1.5} />
          </IconButton>
        </div>

        <SidebarActionRow
          disabledExport={isProcessing}
          onExport={handlePrimaryExport}
          onReset={handleResetRequest}
        />
      </div>

      {(warnings.length > 0 || error) ? (
        <div className="border-b border-border px-5 py-3">
          {warnings.map((warning) => (
            <Alert className="mb-1.5" density="compact" key={warning} tone="warning">
              {warning}
            </Alert>
          ))}
          {error ? (
            <Alert density="compact" tone="danger">
              {error}
            </Alert>
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

      <KeywordWatchlist
        draft={keywordDraft}
        keywords={customKeywords}
        onAddKeyword={handleKeywordSubmit}
        onDraftChange={setKeywordDraft}
        onRemoveKeyword={handleKeywordRemove}
      />

      <FilterTabBar counts={counts} filters={filters} onChangeFilters={setFilters} />

      {unconfirmedCount > 0 || confirmedCount > 0 ? (
        <div className="px-5 pb-3">
          <button
            className="flex gap-1 items-center justify-between ui-text-note w-full rounded-control border border-dashed border-border-strong bg-transparent px-2.5 py-1.5 text-left font-mono tracking-ui-wide text-content-muted transition-colors duration-200 ease-standard hover:border-content-subtle hover:text-content"
            onClick={() => {
              if (unconfirmedCount > 0) {
                confirmAll();
              } else {
                revertAll();
              }
            }}
            type="button"
          >
            {unconfirmedCount > 0 ? (
              <>
                {copy.sidebar.confirmAllOnAll(unconfirmedCount)}
                <Check size={12} strokeWidth={1.5} />
              </>
            ) : (
              <>
                {copy.sidebar.unconfirmAllOnAll(confirmedCount)}
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
          const groupUnconfirmedCount = typeItems.filter((item) => item.status === 'unconfirmed').length;
          const meta = DETECTION_TYPE_META[type];

          return (
            <div className="border-b border-border" key={type}>
              <DetectionGroupHeader
                count={typeItems.length}
                expanded={isExpanded}
                hasUnconfirmed={groupUnconfirmedCount > 0}
                icon={meta.icon()}
                label={meta.pluralLabel}
                onToggle={() =>
                  setExpandedGroups((currentGroups) => ({ ...currentGroups, [type]: !currentGroups[type] }))
                }
              />

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

                            if (groupUnconfirmedCount > 0 && item.status === 'unconfirmed') {
                              setDetectionStatus(item.id, 'confirmed');
                            }

                            if (groupUnconfirmedCount === 0 && item.status === 'confirmed') {
                              setDetectionStatus(item.id, 'unconfirmed');
                            }
                          });
                        }}
                        type="button"
                      >
                        {groupUnconfirmedCount > 0
                          ? copy.sidebar.confirmAllInGroup(groupUnconfirmedCount)
                          : copy.sidebar.rejectAllInGroup(typeItems.length)}
                        {groupUnconfirmedCount > 0 ? <Check size={12} strokeWidth={1.5} /> : <XIcon size={12} strokeWidth={1.5} />}
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
                          item.manual ? setManualStatus(item.id, 'confirmed') : setDetectionStatus(item.id, 'confirmed')
                        }
                        onConfirmAll={
                          matchGroupItems.length > 0
                            ? () => {
                                matchGroupItems.forEach((candidate) => {
                                  if (matchGroupUnconfirmedCount > 0 && candidate.status === 'unconfirmed') {
                                    setDetectionStatus(candidate.id, 'confirmed');
                                  }

                                  if (matchGroupUnconfirmedCount === 0 && candidate.status === 'confirmed') {
                                    setDetectionStatus(candidate.id, 'unconfirmed');
                                  }
                                });
                              }
                            : undefined
                        }
                        onConfirmAllLabel={
                          matchGroupItems.length > 0
                            ? matchGroupUnconfirmedCount > 0
                              ? copy.sidebar.confirmAllShort(matchGroupUnconfirmedCount)
                              : copy.sidebar.rejectAllShort(matchGroupItems.length)
                            : undefined
                        }
                        onDelete={item.manual ? () => removeManualRedaction(item.id) : undefined}
                        onJump={() => scrollToReviewItem(item.id, item.pageIndex)}
                        onUnconfirm={() =>
                          item.manual ? setManualStatus(item.id, 'unconfirmed') : setDetectionStatus(item.id, 'unconfirmed')
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {deferredReviewItems.length === 0 ? (
          <EmptyState
            description={copy.sidebar.emptyDescription}
            icon={<Check size={18} strokeWidth={1.5} />}
            title={copy.sidebar.emptyTitle}
          />
        ) : null}
      </div>
    </aside>
  );
}
