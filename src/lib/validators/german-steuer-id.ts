import { digitsOnly } from './shared';

export const isGermanSteuerIdValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;

  const counts = new Map<string, number>();
  for (const char of digits.slice(0, 10)) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  const repeated = [...counts.values()].filter((count) => count >= 2);
  if (repeated.length !== 1) return false;
  if (repeated[0] !== 2 && repeated[0] !== 3) return false;
  if (counts.size < 8 || counts.size > 9) return false;

  let product = 10;
  for (let index = 0; index < 10; index += 1) {
    const digit = digits.charCodeAt(index) - 48;
    let sum = (digit + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  const expected = (11 - product) % 10;
  return expected === digits.charCodeAt(10) - 48;
};
