import { digitsOnly } from './shared';

const PESEL_WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

export const isPeselValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;

  const month = Number.parseInt(digits.slice(2, 4), 10) % 20;
  if (month < 1 || month > 12) return false;
  const day = Number.parseInt(digits.slice(4, 6), 10);
  if (day < 1 || day > 31) return false;

  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += (digits.charCodeAt(index) - 48) * PESEL_WEIGHTS[index];
  }
  const checksum = (10 - (sum % 10)) % 10;

  return checksum === digits.charCodeAt(10) - 48;
};
