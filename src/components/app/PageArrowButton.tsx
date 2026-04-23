import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function PageArrowButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        'rounded-control ease-standard inline-flex size-7 items-center justify-center border transition-colors duration-200',
        disabled
          ? 'border-border bg-canvas text-content-subtle opacity-50'
          : 'border-border bg-canvas text-content-muted hover:border-border-strong hover:bg-surface-muted hover:text-content',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
