import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const segmentedButtonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-pill font-medium transition-colors duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-[0.8125rem]',
      },
      selected: {
        true: 'bg-content text-canvas',
        false: 'text-content-muted hover:bg-surface-muted hover:text-content',
      },
      iconOnly: {
        true: 'aspect-square px-0',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
      iconOnly: false,
    },
  },
);

type SegmentedButtonVariantProps = VariantProps<typeof segmentedButtonVariants>;

type SegmentedButtonProps = SegmentedButtonVariantProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    children: ReactNode;
    className?: string;
  };

export function SegmentedButton({
  children,
  className,
  iconOnly,
  selected,
  size,
  type,
  ...props
}: SegmentedButtonProps) {
  return (
    <button
      className={cn(segmentedButtonVariants({ iconOnly, selected, size }), className)}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  );
}

export { segmentedButtonVariants };
