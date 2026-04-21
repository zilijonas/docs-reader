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
      className="flex w-full items-center justify-between bg-transparent px-5 py-3 text-content"
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-content-muted">{icon}</span>
        <span className="ui-text-field font-medium">{label}</span>
        <span className="ui-text-label font-mono text-content-subtle">({count})</span>
      </div>

      <div className="flex items-center gap-2">
        {hasUnconfirmed ? <StatusDot tone="warning" /> : null}
        <ChevronDown
          className={cn(
            'size-ui-icon text-content-subtle transition-transform duration-200 ease-standard',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
          strokeWidth={1.5}
        />
      </div>
    </button>
  );
}
