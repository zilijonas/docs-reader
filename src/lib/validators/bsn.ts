import { digitsOnly } from './shared';

export const isBsnValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 8 && digits.length !== 9) return false;
  const padded = digits.padStart(9, '0');
  let sum = 0;
  for (let index = 0; index < 8; index += 1) {
    sum += (padded.charCodeAt(index) - 48) * (9 - index);
  }
  sum -= padded.charCodeAt(8) - 48;

  return sum % 11 === 0;
};
