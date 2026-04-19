import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-control border transition-[background-color,border-color,color,box-shadow] duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        neutral: 'border-transparent bg-transparent text-content-subtle hover:border-border hover:bg-surface-muted hover:text-content',
        surface: 'border-border bg-surface text-content hover:border-border-strong hover:bg-surface-muted',
        safe: 'border-success bg-success text-canvas hover:border-success hover:bg-success',
        muted: 'border-content-subtle bg-content-subtle text-canvas hover:border-content-muted hover:bg-content-muted',
        danger: 'border-danger bg-danger text-canvas hover:border-danger hover:bg-danger',
      },
      size: {
        sm: 'size-6',
        md: 'size-7',
        lg: 'size-8',
      },
      shape: {
        square: '',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
      shape: 'square',
    },
  },
);

export function IconButton({
  children,
  className,
  tone,
  size,
  shape,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    children: ReactNode;
  }) {
  return (
    <button className={cn(iconButtonVariants({ tone, size, shape }), className)} type="button" {...props}>
      {children}
    </button>
  );
}

export { iconButtonVariants };
