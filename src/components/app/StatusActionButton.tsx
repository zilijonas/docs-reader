import type { ReactNode } from 'react';

import { IconButton } from '../../components/ui';

export function StatusActionButton({
  onClick,
  size = 'md',
  title,
  children,
}: {
  onClick: () => void;
  size?: 'md' | 'lg';
  title: string;
  children: ReactNode;
}) {
  return (
    <IconButton onClick={onClick} size={size} title={title} tone="surface" shape="pill">
      {children}
    </IconButton>
  );
}
