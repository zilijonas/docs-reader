import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'ui-control inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border border-brand bg-brand text-canvas shadow-none hover:border-brand-hover hover:bg-brand-hover',
        secondary:
          'border border-border bg-surface text-content shadow-none hover:border-border-strong hover:bg-surface-muted',
        ghost:
          'border border-transparent bg-transparent text-content hover:bg-surface-muted hover:text-content',
        subtle:
          'border border-transparent bg-surface-muted text-content-muted hover:bg-surface hover:text-content',
        danger:
          'border border-danger/20 bg-danger-soft text-danger hover:border-danger/30 hover:bg-danger/10',
        inverse:
          'border border-canvas bg-canvas text-content shadow-none hover:bg-surface hover:border-surface',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-7 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type CommonProps = ButtonVariantProps & {
  children: ReactNode;
  className?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

type LinkButtonProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'> & {
    href: string;
  };

type NativeButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    href?: undefined;
  };

export function Button({
  children,
  className,
  fullWidth,
  leadingIcon,
  size,
  trailingIcon,
  variant,
  ...props
}: NativeButtonProps | LinkButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
  const content = (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  );

  if ('href' in props && props.href) {
    return (
      <a className={classes} {...props}>
        {content}
      </a>
    );
  }

  const { type, ...buttonProps } = props as NativeButtonProps;

  return (
    <button className={classes} {...buttonProps} type={type ?? 'button'}>
      {content}
    </button>
  );
}

export { buttonVariants };
