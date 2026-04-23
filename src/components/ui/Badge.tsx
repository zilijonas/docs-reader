import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'ui-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono tracking-ui-tight transition-colors duration-200 ease-standard',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface text-content',
        muted: 'border-transparent bg-transparent text-content-subtle',
        safe: 'border-success/25 bg-success-soft text-success-ink',
        warning: 'border-warning/25 bg-warning-soft text-warning-ink',
        danger: 'border-danger/25 bg-danger-soft text-danger',
      },
      size: {
        sm: 'text-badge',
        md: 'text-badge',
      },
      emphasis: {
        filled: '',
        subtle: 'shadow-none',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'sm',
      emphasis: 'filled',
    },
  },
);

export function Badge({
  children,
  className,
  tone,
  size,
  emphasis,
}: {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size, emphasis }), className)}>{children}</span>;
}

export { badgeVariants };
