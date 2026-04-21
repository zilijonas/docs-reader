import { escapeToken } from '../regex-utils';
import { CORE_RULES } from './core';
import { NATIONAL_ID_RULES } from './national-id';

export const DETECTION_RULES = [...CORE_RULES, ...NATIONAL_ID_RULES];

export const buildKeywordPattern = (keywords: string[]): RegExp | null => {
  const filtered = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (!filtered.length) return null;

  const escaped = filtered.map(escapeToken).join('|');
  return new RegExp(`(?<![\\p{L}\\d])(?:${escaped})(?![\\p{L}\\d])`, 'giu');
};
