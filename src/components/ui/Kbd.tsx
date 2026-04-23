import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'rounded-control-sm border-border-strong bg-canvas text-content text-xxs inline-flex min-w-3.5 items-center justify-center border px-1.5 py-0.5 font-mono shadow-[inset_0_-1px_0_0_color-mix(in_oklab,var(--theme-content-subtle)_16%,transparent)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
