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
      className={cn('bg-border h-0.5 overflow-hidden rounded-full', className)}
      style={{ '--progress-value': `${clamped * 100}%` } as CSSProperties}
    >
      <div
        className={cn(
          'bg-content ease-standard h-full w-(--progress-value) transition-[width] duration-500',
          indicatorClassName,
        )}
      />
    </div>
  );
}
