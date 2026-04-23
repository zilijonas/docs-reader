import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const panelVariants = cva('rounded-(--radius-panel) border shadow-panel', {
  variants: {
    tone: {
      surface: 'border-border/90 bg-surface',
      muted: 'border-border/80 bg-surface-muted',
      canvas: 'border-border/90 bg-canvas',
      overlay: 'border-border/80 bg-surface/95 backdrop-blur-md',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-7',
    },
  },
  defaultVariants: {
    tone: 'surface',
    padding: 'md',
  },
});

export function Panel<T extends ElementType = 'div'>({
  as,
  children,
  className,
  padding,
  tone,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, 'children'> &
  VariantProps<typeof panelVariants> & {
    as?: T;
    children: ReactNode;
  }) {
  const Component = as ?? 'div';
  return (
    <Component className={cn(panelVariants({ tone, padding }), className)} {...props}>
      {children}
    </Component>
  );
}

export { panelVariants };
