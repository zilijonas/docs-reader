import type { DetectionType } from '../types';

export interface DetectionRule {
  type: DetectionType;
  pattern: RegExp;
  confidence: number;
  /** Optional validator. If it returns `false`, match is dropped. */
  postFilter?: (match: string) => boolean;
}
