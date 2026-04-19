import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[14px] items-center justify-center rounded-[6px] border border-border-strong bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-content shadow-[inset_0_-1px_0_0_color-mix(in_oklab,var(--theme-content-subtle)_16%,transparent)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
