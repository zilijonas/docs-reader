import { digitsOnly } from './shared';

const LT_PERSONAL_WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
const LT_PERSONAL_WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];

export const isLithuanianPersonalCodeValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;
  const centuryDigit = digits.charCodeAt(0) - 48;
  if (centuryDigit < 1 || centuryDigit > 6) return false;
  const month = Number.parseInt(digits.slice(3, 5), 10);
  if (month < 1 || month > 12) return false;
  const day = Number.parseInt(digits.slice(5, 7), 10);
  if (day < 1 || day > 31) return false;

  const sum = (weights: number[]) =>
    weights.reduce((total, weight, idx) => total + weight * (digits.charCodeAt(idx) - 48), 0);

  let checksum = sum(LT_PERSONAL_WEIGHTS_1) % 11;
  if (checksum === 10) {
    checksum = sum(LT_PERSONAL_WEIGHTS_2) % 11;
    if (checksum === 10) checksum = 0;
  }

  return checksum === digits.charCodeAt(10) - 48;
};
