import { Circle, CircleCheck } from 'lucide-react';

import type { DetectionStatus } from '../../lib/types';

export function RowStatusIcon({ status }: { status: DetectionStatus }) {
  return status === 'confirmed' ? (
    <CircleCheck className="shrink-0 text-success" size={12} strokeWidth={2} />
  ) : (
    <Circle className="shrink-0 text-warning" size={12} strokeWidth={2} />
  );
}
