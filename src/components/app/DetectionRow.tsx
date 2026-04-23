import { Check, Trash2, X as XIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import type { ReviewItem } from '../../features/redactor';
import { RowStatusIcon } from './RowStatusIcon';
import { StatusActionButton } from './StatusActionButton';

export function DetectionRow({
  item,
  onJump,
  onConfirm,
  onUnconfirm,
  onDelete,
  onConfirmAll,
  onConfirmAllLabel,
}: {
  item: ReviewItem;
  onJump: () => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onDelete?: () => void;
  onConfirmAll?: () => void;
  onConfirmAllLabel?: string;
}) {
  const isConfirmed = item.status === 'confirmed';

  return (
    <div className="ease-standard flex items-stretch transition-[background-color] duration-200">
      <div className="flex flex-1 flex-col gap-1 px-5 py-2.5 text-left">
        <button
          className="flex items-center gap-2 bg-transparent text-left"
          onClick={onJump}
          type="button"
        >
          <span
            className={cn(
              'text-content max-w-measure-review-snippet overflow-hidden text-ellipsis whitespace-nowrap',
              item.manual ? 'text-field italic' : 'text-control font-mono',
            )}
          >
            {item.snippet}
          </span>
        </button>

        <div className="text-content-subtle text-badge flex items-center gap-2.5 font-mono">
          <RowStatusIcon status={item.status} />
          <span>p.{item.pageIndex + 1}</span>
          {!item.manual ? <span>{Math.round(item.confidence * 100)}%</span> : null}
          {onConfirmAll && onConfirmAllLabel ? (
            <button
              className="text-content-muted ease-standard hover:text-content cursor-pointer underline transition-colors duration-200"
              onClick={onConfirmAll}
              type="button"
            >
              {onConfirmAllLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mr-5 flex items-center gap-0.5">
        <StatusActionButton
          onClick={isConfirmed ? onUnconfirm : onConfirm}
          size="lg"
          title={isConfirmed ? copy.sidebar.unconfirmTooltip : copy.sidebar.confirmTooltip}
        >
          {isConfirmed ? (
            <XIcon size={14} strokeWidth={2} className="text-danger/70" />
          ) : (
            <Check size={14} strokeWidth={2} className="text-success" />
          )}
        </StatusActionButton>
        {onDelete ? (
          <StatusActionButton onClick={onDelete} title={copy.sidebar.removeTooltip}>
            <Trash2 size={12} strokeWidth={2} />
          </StatusActionButton>
        ) : null}
      </div>
    </div>
  );
}
