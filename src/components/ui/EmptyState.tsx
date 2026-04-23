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
      {icon ? <div className="text-success flex justify-center">{icon}</div> : null}
      <div className="text-content-muted mt-2.5 text-sm">{title}</div>
      <div className="text-content-subtle mt-1 text-sm">{description}</div>
    </div>
  );
}
