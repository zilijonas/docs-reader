import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function EmptyState({
  className,
  icon,
  title,
  description,
}: {
  className?: string;
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={cn('px-5 py-10 text-center', className)}>
      {icon ? <div className="flex justify-center text-success">{icon}</div> : null}
      <div className="mt-2.5 text-sm text-content-muted">{title}</div>
      <div className="mt-1 text-sm text-content-subtle">{description}</div>
    </div>
  );
}
