import type { InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const inputVariants = cva(
  'ui-control flex w-full rounded-[var(--radius-control)] border bg-canvas text-content outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-standard placeholder:text-content-subtle focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
      tone: {
        default: 'border-border-strong',
        subtle: 'border-border bg-surface',
      },
    },
    defaultVariants: {
      size: 'md',
      tone: 'default',
    },
  },
);

export function Input({
  className,
  size,
  tone,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>) {
  return <input className={cn(inputVariants({ size, tone }), className)} {...props} />;
}

export { inputVariants };
