import type { TextSpan } from '../../types';
import { stripTrailingPunctuation } from './locales/name-labels';

export const LT_CHARS_RE = /[ąčęėįšųūž]/iu;

export const LT_LABEL_TOKENS = new Set<string>([
  'vardas',
  'vardo',
  'vardą',
  'vardu',
  'pavardė',
  'pavarde',
  'pavardės',
  'pavardes',
  'pavardę',
  'pavarde,',
  'parašas',
  'paraso',
  'parašo',
  'pasirašyta',
  'pasirasyta',
]);

export const hasLithuanianContext = (spans: TextSpan[]): boolean => {
  let ltCharTokens = 0;
  for (const span of spans) {
    const raw = span.text.trim();
    if (!raw) continue;
    const lower = stripTrailingPunctuation(raw.toLowerCase());
    if (LT_LABEL_TOKENS.has(lower)) {
      return true;
    }
    if (LT_CHARS_RE.test(raw)) {
      ltCharTokens += 1;
      if (ltCharTokens >= 2) {
        return true;
      }
    }
  }
  return false;
};
