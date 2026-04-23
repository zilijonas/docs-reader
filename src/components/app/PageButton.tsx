import { cn } from '@/lib/cn';

export function PageButton({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'rounded-control ease-standard text-caption flex size-7 items-center justify-center border font-mono transition-colors duration-200',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border bg-canvas text-content-muted hover:border-border-strong hover:bg-surface-muted',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
