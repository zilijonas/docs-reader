import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';
import { Panel } from './Panel';

const dialogPanelVariants = cva('w-full', {
  variants: {
    size: {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type DialogProps = VariantProps<typeof dialogPanelVariants> & {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  top?: boolean;
  labelledBy?: string;
};

export function Dialog({ children, className, labelledBy, onClose, open, size, top }: DialogProps) {
  useEffect(() => {
    if (!open || !onClose) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const content = (
    <div
      aria-labelledby={labelledBy}
      aria-modal="true"
      className={cn(
        'app-modal-overlay fixed inset-0 flex justify-center bg-content/35 px-4 backdrop-blur-sm',
        top ? 'z-modal-top items-start pt-[calc(env(safe-area-inset-top)+1rem)]' : 'z-modal items-center',
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
    >
      <Panel className={cn(dialogPanelVariants({ size }), className)} padding="lg" tone="overlay">
        {children}
      </Panel>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}

export { dialogPanelVariants };
