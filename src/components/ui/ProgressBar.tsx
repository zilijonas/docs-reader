import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

export function ProgressBar({
  className,
  indicatorClassName,
  value,
}: {
  className?: string;
  indicatorClassName?: string;
  value: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      className={cn('h-0.5 overflow-hidden rounded-full bg-border', className)}
      style={{ '--progress-value': `${clamped * 100}%` } as CSSProperties}
    >
      <div
        className={cn(
          'h-full w-[var(--progress-value)] bg-content transition-[width] duration-[460ms] ease-standard',
          indicatorClassName,
        )}
      />
    </div>
  );
}
