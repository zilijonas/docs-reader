import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border px-2.5 py-1 text-xs transition-colors duration-200 ease-standard',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface text-content',
        muted: 'border-border bg-surface-muted text-content-muted',
      },
      interactive: {
        true: 'cursor-pointer hover:border-border-strong hover:bg-surface-muted',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      interactive: false,
    },
  },
);

export function Chip({
  children,
  className,
  tone,
  interactive,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof chipVariants> & {
    children: ReactNode;
  }) {
  return (
    <button className={cn(chipVariants({ tone, interactive }), className)} type="button" {...props}>
      {children}
    </button>
  );
}

export { chipVariants };
