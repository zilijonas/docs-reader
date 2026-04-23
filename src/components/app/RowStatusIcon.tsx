import { Circle, CircleCheck } from 'lucide-react';

import type { DetectionStatus } from '../../types';

export function RowStatusIcon({ status }: { status: DetectionStatus }) {
  return status === 'confirmed' ? (
    <CircleCheck className="text-success shrink-0" size={12} strokeWidth={2} />
  ) : (
    <Circle className="text-warning shrink-0" size={12} strokeWidth={2} />
  );
}
