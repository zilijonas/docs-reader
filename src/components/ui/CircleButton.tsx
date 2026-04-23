import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const circleButtonVariants = cva(
  'relative inline-flex items-center justify-center rounded-full transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-8',
        md: 'size-10 md:size-9',
        lg: 'size-12',
      },
      tone: {
        neutral: '',
        accent: '',
        danger: '',
      },
      ring: {
        none: 'border border-transparent',
        soft: 'border border-border',
        strong: 'border border-border shadow-float',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        tone: 'neutral',
        active: false,
        className: 'bg-transparent text-content hover:bg-surface-muted',
      },
      {
        tone: 'neutral',
        active: true,
        className: 'border-brand bg-brand text-white',
      },
      {
        tone: 'accent',
        active: false,
        className: 'bg-surface text-content hover:border-border-strong hover:bg-surface-muted',
      },
      {
        tone: 'accent',
        active: true,
        className: 'border-brand bg-brand text-white',
      },
      {
        tone: 'danger',
        active: false,
        className: 'bg-transparent text-danger hover:bg-danger-soft',
      },
    ],
    defaultVariants: {
      size: 'md',
      tone: 'neutral',
      ring: 'none',
      active: false,
    },
  },
);

type CircleButtonVariantProps = VariantProps<typeof circleButtonVariants>;

type CircleButtonProps = CircleButtonVariantProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    children: ReactNode;
    className?: string;
  };

export function CircleButton({
  active,
  children,
  className,
  ring,
  size,
  tone,
  type,
  ...props
}: CircleButtonProps) {
  return (
    <button
      className={cn(circleButtonVariants({ active, ring, size, tone }), className)}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  );
}

export { circleButtonVariants };
