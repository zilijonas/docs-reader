import { toCodePoint } from './shared';

export const isIbanValid = (value: string): boolean => {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return false;
  }

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = toCodePoint(char);
    const numeric = code >= 65 && code <= 90 ? String(code - 55) : char;
    for (const chunk of numeric) {
      remainder = (remainder * 10 + (chunk.charCodeAt(0) - 48)) % 97;
    }
  }

  return remainder === 1;
};
