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
        'ui-text-caption flex size-7 items-center justify-center rounded-control border font-mono transition-colors duration-200 ease-standard',
        active
          ? 'border-content bg-content text-canvas'
          : 'border-border bg-canvas text-content-muted hover:border-border-strong hover:bg-surface-muted',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
