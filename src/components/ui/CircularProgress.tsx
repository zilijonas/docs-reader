import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

const getRootStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
});

const getIndicatorStyle = (dashOffset: number): CSSProperties => ({
  transform: 'rotate(-90deg)',
  transformOrigin: '50% 50%',
  transition: 'stroke-dashoffset 400ms var(--theme-ease-standard)',
  strokeDashoffset: dashOffset,
});

export function CircularProgress({
  className,
  size = 36,
  strokeWidth = 3,
  value,
}: {
  className?: string;
  size?: number;
  strokeWidth?: number;
  value: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={getRootStyle(size)}
    >
      <svg className="absolute inset-0" height={size} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={getIndicatorStyle(dashOffset)}
        />
      </svg>
      <span className="ui-text-label relative font-mono text-content-muted">
        {Math.round(clamped * 100)}
      </span>
    </div>
  );
}
