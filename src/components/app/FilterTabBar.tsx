import { cn } from '@/lib/cn';
import type { DetectionStatus, FilterState } from '../../lib/types';
import { REVIEW_FILTER_TABS } from '../../features/redactor';

export function FilterTabBar({
  counts,
  filters,
  onChangeFilters,
}: {
  counts: Record<Exclude<DetectionStatus, 'dismissed'>, number>;
  filters: FilterState;
  onChangeFilters: (next: Partial<FilterState>) => void;
}) {
  return (
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
  );
}
