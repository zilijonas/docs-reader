const digitsOnly = (value: string) => value.replace(/\D+/g, '');

const toCodePoint = (char: string) => char.charCodeAt(0);

export const isLuhnValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length < 12 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

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

// French NIR (INSEE) format:
//   S(1) YY(2) MM(2) DEP(2) COM(3) ORD(3) KEY(2)  => 15 digits (13-digit base + 2-digit key)
//   Corsica dept is "2A" / "2B"; normalize to "19" / "18" before computing MOD 97.
const NIR_CORSICA_REPLACEMENT: Record<string, string> = { A: '19', B: '18' };
const normalizeNir = (raw: string) => {
  const trimmed = raw.replace(/[\s-]+/g, '').toUpperCase();
  const deptSecondChar = trimmed[6];
  const replacement = NIR_CORSICA_REPLACEMENT[deptSecondChar];
  if (!replacement) return trimmed;
  return trimmed.slice(0, 5) + replacement + trimmed.slice(7);
};

export const isNirValid = (value: string): boolean => {
  const raw = value.replace(/[\s-]+/g, '').toUpperCase();
  if (!/^[12]\d{4}(?:\d{2}|2[AB])\d{6}\d{2}$/.test(raw)) return false;

  const normalized = normalizeNir(raw);
  if (!/^[12]\d{14}$/.test(normalized)) return false;

  const base = normalized.slice(0, 13);
  const key = Number.parseInt(normalized.slice(13), 10);
  // 13-digit base fits within Number.MAX_SAFE_INTEGER (9.0e15), no BigInt needed.
  const expected = 97 - (Number.parseInt(base, 10) % 97);
  return expected === key;
};

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
export const isDniValid = (value: string): boolean => {
  const cleaned = value.replace(/[\s-]+/g, '').toUpperCase();
  const dni = cleaned.match(/^(\d{8})([A-Z])$/);
  if (dni) {
    const expected = DNI_LETTERS[Number.parseInt(dni[1], 10) % 23];
    return expected === dni[2];
  }
  const nie = cleaned.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nie) {
    const prefix = { X: '0', Y: '1', Z: '2' }[nie[1] as 'X' | 'Y' | 'Z'];
    const expected = DNI_LETTERS[Number.parseInt(prefix + nie[2], 10) % 23];
    return expected === nie[3];
  }
  return false;
};

const CF_ODD_VALUES: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const CF_EVEN_VALUES: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
  U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};
export const isCodiceFiscaleValid = (value: string): boolean => {
  const cf = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) return false;
  let sum = 0;
  for (let index = 0; index < 15; index += 1) {
    const char = cf[index];
    sum += index % 2 === 0 ? CF_ODD_VALUES[char] : CF_EVEN_VALUES[char];
  }
  return String.fromCharCode(65 + (sum % 26)) === cf[15];
};

const LT_PERSONAL_WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
const LT_PERSONAL_WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
export const isLithuanianPersonalCodeValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;
  const centuryDigit = digits.charCodeAt(0) - 48;
  if (centuryDigit < 1 || centuryDigit > 6) return false;
  const month = Number.parseInt(digits.slice(5, 7), 10);
  if (month < 1 || month > 12) return false;
  const day = Number.parseInt(digits.slice(7, 9), 10);
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

const EE_PERSONAL_WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
const EE_PERSONAL_WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
export const isEstonianPersonalCodeValid = (value: string): boolean => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;
  const century = digits.charCodeAt(0) - 48;
  if (century < 1 || century > 8) return false;
  const month = Number.parseInt(digits.slice(3, 5), 10);
  if (month < 1 || month > 12) return false;
  const day = Number.parseInt(digits.slice(5, 7), 10);
  if (day < 1 || day > 31) return false;

  const sum = (weights: number[]) =>
    weights.reduce((total, weight, idx) => total + weight * (digits.charCodeAt(idx) - 48), 0);

  let checksum = sum(EE_PERSONAL_WEIGHTS_1) % 11;
  if (checksum === 10) {
    checksum = sum(EE_PERSONAL_WEIGHTS_2) % 11;
    if (checksum === 10) checksum = 0;
  }
  return checksum === digits.charCodeAt(10) - 48;
};

// UK NINO — validates format + prefix blacklist (no checksum exists)
const NINO_INVALID_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ']);
export const isNinoValid = (value: string): boolean => {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(cleaned)) return false;
  return !NINO_INVALID_PREFIXES.has(cleaned.slice(0, 2));
};

// German Steuer-ID: 11 digits, among first 10 exactly one digit appears twice
// (old) or three times (since 2016). Last digit is ISO 7064 MOD 11,10 checksum.
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
