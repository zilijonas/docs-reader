import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const statusDotVariants = cva('inline-block rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-content',
      safe: 'bg-success',
      warning: 'bg-warning',
      muted: 'bg-content-subtle',
      danger: 'bg-danger',
    },
    size: {
      sm: 'size-1.5',
      md: 'size-2',
      lg: 'size-2.5',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export function StatusDot({
  className,
  size,
  tone,
}: VariantProps<typeof statusDotVariants> & {
  className?: string;
}) {
  return <span className={cn(statusDotVariants({ tone, size }), className)} />;
}

export { statusDotVariants };
