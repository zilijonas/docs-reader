import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const alertVariants = cva('rounded-control border text-left', {
  variants: {
    tone: {
      info: 'border-border bg-surface-muted text-content-muted',
      success: 'border-success/30 bg-success-soft text-success-ink',
      warning: 'border-warning/30 bg-warning-soft text-warning-ink',
      danger: 'border-danger/35 bg-danger-soft text-danger',
    },
    density: {
      compact: 'ui-text-control px-2.5 py-2',
      regular: 'px-4 py-3 text-sm',
    },
  },
  defaultVariants: {
    tone: 'info',
    density: 'regular',
  },
});

type AlertVariantProps = VariantProps<typeof alertVariants>;

type AlertProps = AlertVariantProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'className'> & {
    children: ReactNode;
    className?: string;
  };

export function Alert({ children, className, density, tone, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ density, tone }), className)} role="status" {...props}>
      {children}
    </div>
  );
}

export { alertVariants };
