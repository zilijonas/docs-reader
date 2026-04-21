import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PageArrowButton } from './PageArrowButton';
import { PageButton } from './PageButton';

export function ReviewPagination({
  activePage = 0,
  className,
  compact = false,
  pageCount = 0,
  onActivatePage,
}: {
  activePage?: number;
  className?: string;
  compact?: boolean;
  pageCount?: number;
  onActivatePage?: (pageIndex: number) => void;
}) {
  if (pageCount <= 0) {
    return null;
  }

  const paginationItems = compact ? buildPaginationItems(pageCount, activePage) : buildFullPaginationItems(pageCount);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {compact ? (
        <PageArrowButton
          disabled={activePage <= 0}
          label="Previous page"
          onClick={() => onActivatePage?.(activePage - 1)}
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
        </PageArrowButton>
      ) : null}

      {paginationItems.map((item, index) =>
        item.type === 'ellipsis' ? (
          <span className="ui-text-caption px-1.5 font-mono text-content-subtle" key={`ellipsis-${index}`}>
            ...
          </span>
        ) : (
          <PageButton
            active={item.pageIndex === activePage}
            key={item.pageIndex}
            label={item.pageIndex + 1}
            onClick={() => onActivatePage?.(item.pageIndex)}
          />
        ),
      )}

      {compact ? (
        <PageArrowButton
          disabled={activePage >= pageCount - 1}
          label="Next page"
          onClick={() => onActivatePage?.(activePage + 1)}
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </PageArrowButton>
      ) : null}
    </div>
  );
}

function buildFullPaginationItems(pageCount: number) {
  return Array.from({ length: pageCount }, (_, pageIndex) => ({ type: 'page' as const, pageIndex }));
}

function buildPaginationItems(pageCount: number, activePage: number) {
  if (pageCount <= 3) {
    return buildFullPaginationItems(pageCount);
  }

  const start = Math.max(0, Math.min(activePage - 1, pageCount - 3));
  const visiblePages = Array.from({ length: 3 }, (_, index) => start + index);
  const items: Array<{ type: 'page'; pageIndex: number } | { type: 'ellipsis' }> = [];

  if (start > 0) {
    items.push({ type: 'ellipsis' });
  }

  visiblePages.forEach((pageIndex) => {
    items.push({ type: 'page', pageIndex });
  });

  if (start + 3 < pageCount) {
    items.push({ type: 'ellipsis' });
  }

  return items;
}
