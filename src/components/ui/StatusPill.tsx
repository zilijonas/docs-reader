import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[0.8125rem]',
  {
    variants: {
      status: {
        neutral: 'border-border bg-surface text-content-muted',
        pending: 'border-detection-ring bg-detection-soft font-medium text-content',
        confirmed: 'border-success/30 bg-success-soft font-medium text-success-ink',
        dismissed: 'border-border bg-surface-muted text-content-subtle',
        manual: 'border-border bg-surface text-content-muted',
        ocr: 'border-border bg-surface text-content-muted lowercase',
      },
      size: {
        sm: 'ui-text-caption gap-1.5 px-2.5 py-0.75',
        md: 'gap-1.5 px-3 py-1.5 text-[0.8125rem]',
      },
    },
    defaultVariants: {
      status: 'neutral',
      size: 'md',
    },
  },
);

type StatusPillVariantProps = VariantProps<typeof statusPillVariants>;

type StatusPillProps = StatusPillVariantProps &
  Omit<HTMLAttributes<HTMLSpanElement>, 'className'> & {
    children: ReactNode;
    className?: string;
  };

export function StatusPill({ children, className, size, status, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ size, status }), className)} {...props}>
      {children}
    </span>
  );
}

export { statusPillVariants };
