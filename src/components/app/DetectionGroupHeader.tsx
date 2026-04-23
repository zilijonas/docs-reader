import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { StatusDot } from '../../components/ui';

export function DetectionGroupHeader({
  icon,
  label,
  count,
  hasUnconfirmed,
  expanded,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  hasUnconfirmed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="text-content flex w-full items-center justify-between bg-transparent px-5 py-3"
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-content-muted">{icon}</span>
        <span className="text-field font-medium">{label}</span>
        <span className="text-content-subtle text-badge font-mono">({count})</span>
      </div>

      <div className="flex items-center gap-2">
        {hasUnconfirmed ? <StatusDot tone="warning" /> : null}
        <ChevronDown
          className={cn(
            'size-ui-icon text-content-subtle ease-standard transition-transform duration-200',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
          strokeWidth={1.5}
        />
      </div>
    </button>
  );
}
