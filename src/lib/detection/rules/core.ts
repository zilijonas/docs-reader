import { CONFIDENCE } from '../config';
import type { DetectionRule } from '../rule';
import { isIbanValid, isLuhnValid, isVatNumberValid } from '../../validators';
import { ADDRESS_RULE, DATE_RULE } from './address';

const POSTAL_PATTERNS = [
  '\\b[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}\\b',
  '\\b\\d{4}\\s?[A-Z]{2}\\b',
  '\\b\\d{2}-\\d{3}\\b',
  '\\b\\d{4}-\\d{3}\\b',
  '\\b0\\d{4}\\b',
  '(?<!(?:Nr\\.|No\\.|Nº|Reg\\.)\\s?)\\b(?:LT|LV|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|EE|IE)-\\d{4,5}\\b|\\b(?:LT|LV|EE)\\d{4,5}\\b',
  '(?:\\b(?:PLZ|CAP|CP|ZIP|post(?:al)?\\s*code|postcode|pašto\\s*kodas|kod\\s*pocztowy|PSČ|ирис|postnummer)\\b[^\\d]{0,6})\\d{3,5}(?:-\\d{3,4})?',
  '\\b[AC-FHKNPRTV-Y]\\d{2}\\s?[AC-FHKNPRTV-Y0-9]{4}\\b',
];

const EU_VAT_COUNTRY =
  '(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)';
const POSTAL_PREFIX_COUNTRY =
  '(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)';
const IBAN_SEPARATOR = '[\\s\\u00A0]?';
const VEHICLE_UNIT_SUFFIX = '(?:km|kms|kilometers?|kilometres?|mi|miles?)';
// Plate token must be one of the well-known compact country layouts.
// Any free-form 2-3 segment alphanumeric run produces too many false
// positives in invoices/itineraries (currency amounts, flight numbers,
// booking refs, table cells).
// Plate layouts: letters-digits, digits-letters, or letter-digit-letter
// triplets. We rely on the postFilter to drop the noisier matches.
// Reject contexts wrapped in "/" (product codes like "MXP93ZM/A") or "."
// (filenames, version strings, e.g. "v1.2") at the boundaries.
const LICENSE_PLATE_RE =
  /(?<![\p{L}\p{N}/.])(?:[A-Z]{1,3}[ -]?\d{2,5}[ -]?[A-Z]{0,3}|\d{1,4}[ -]?[A-Z]{1,3}[ -]?\d{0,4}|[A-Z]{2}\d{2}[ -]?[A-Z]{3})(?![\p{L}\p{N}/.])/giu;
const PLATE_WORD_BLOCKLIST = new Set([
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'PLN',
  'SEK',
  'NOK',
  'DKK',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'JPY',
  'CNY',
  'KM',
  'KMS',
  'MILE',
  'MILES',
  'IBAN',
  'SWIFT',
  'BIC',
  'NON',
  'STOP',
  'ETKT',
  'PCS',
  'PC',
  'BB',
  'HB',
  'AI',
  'ETK',
  'TRAVEL',
  'FLIGHT',
  'BOOKING',
  // Tax / accounting acronyms — collide with "<digits> <ACRONYM>" plate
  // shape on invoice rows ("27 PVM", "PVM 164").
  'PVM',
  'PVMI',
  'GST',
  'VAT',
  'TAX',
  'NET',
  'GROSS',
  'FEE',
  'TVA',
  'IVA',
  'MOMS',
  'BTW',
  'ALV',
  // Common 2-letter IATA airline codes — collide with 2-letter plate +
  // 3-4 digit flight numbers ("BT 685", "IB 440").
  'BT',
  'IB',
  'IS',
  'AY',
  'AF',
  'BA',
  'KL',
  'LH',
  'LO',
  'SK',
  'AZ',
  'TK',
  'OS',
  'FR',
  'U2',
  'EW',
  'KM',
  'MS',
  'OK',
  'RO',
  'SN',
  'TP',
  // Month / weekday abbreviations — collide with day-month-year date
  // shorthand ("18 SEP 19", "MON 18").
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'SEPT',
  'OCT',
  'NOV',
  'DEC',
  'MON',
  'TUE',
  'TUES',
  'WED',
  'THU',
  'THUR',
  'THURS',
  'FRI',
  'SAT',
  'SUN',
]);

const normalizeWhitespace = (value: string) => value.replace(/[\s\u00A0]+/gu, ' ').trim();

const extractDigits = (value: string) => value.replace(/\D+/g, '');

const isVinLike = (value: string) => {
  const normalized = value.toUpperCase();
  return /[A-Z]/.test(normalized) && /\d/.test(normalized) && !/[IOQ]/.test(normalized);
};

const isStructuredHyphenatedId = (value: string) => {
  const segments = value.toUpperCase().split('-').filter(Boolean);

  if (segments.length < 3) {
    return false;
  }

  if (!segments.every((segment) => /^[A-Z0-9]+$/u.test(segment))) {
    return false;
  }

  const totalDigits = segments.reduce((sum, segment) => sum + extractDigits(segment).length, 0);
  const hasLongSegment = segments.some((segment) => segment.length >= 6);

  return totalDigits >= 6 && hasLongSegment;
};

const isLongPhoneLike = (value: string) => {
  const normalized = normalizeWhitespace(value);
  const digits = extractDigits(normalized);

  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  // Phone numbers do not use "." or "," as separators in our reference
  // formats. Reject anything containing them to keep invoice amounts
  // ("1.000 164.460 164", "1,234.56") out of phone matches.
  if (/[.,]/.test(normalized)) {
    return false;
  }

  if (/^\d{4}-\d{2}(?:-\d{2})?(?:\s+\d{4,6})?$/u.test(normalized)) {
    return false;
  }

  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/u.test(normalized)) {
    return false;
  }

  // Reject numbered list rows like "3. 1995.11.25" or "1. 100 000": the
  // phone rule otherwise grabs a row index plus the next column.
  if (/^\d{1,3}\.\s/u.test(normalized)) {
    return false;
  }

  // Reject anything containing a date in YYYY.MM.DD or YYYY-MM-DD form.
  if (/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/u.test(normalized)) {
    return false;
  }

  if (/^\+?\d{1,3}(?:\s\d{3}){2,}$/u.test(normalized)) {
    return false;
  }

  if (new RegExp(`\\b${VEHICLE_UNIT_SUFFIX}\\b`, 'iu').test(normalized)) {
    return false;
  }

  const hasPhoneMarker = /[+()\-–—]/.test(normalized);

  // Without a phone marker, reject shapes that aren't phone-like:
  //   - first group ≥ 4 digits (e.g. "2023 09308", "0501 2222")
  //   - more than 4 groups total ("10 10 000 6 000", table cells)
  if (!hasPhoneMarker) {
    const groups = normalized.split(/\s+/u).filter(Boolean);
    if (groups.length > 4) {
      return false;
    }
    const firstGroup = groups[0] ?? '';
    if (/^\d+$/u.test(firstGroup) && firstGroup.length >= 4) {
      return false;
    }
  }

  return /[+\s().-]/.test(normalized);
};

const isShortServicePhone = (value: string) => /^[1-9]\d{4,5}$/u.test(value);

const isCardLikeFormat = (value: string) => {
  const compact = value.replace(/[ -]+/g, '');
  if (!/^\d{13,19}$/.test(compact)) return false;
  if (!/[ -]/.test(value)) return true;
  const groups = value.trim().split(/[ -]+/);
  if (groups.length === 4 && groups.every((group) => /^\d{4}$/.test(group))) return true;
  if (
    groups.length === 3 &&
    /^\d{4}$/.test(groups[0]) &&
    /^\d{6}$/.test(groups[1]) &&
    /^\d{5}$/.test(groups[2])
  ) {
    return true;
  }
  return false;
};

const isLikelyLicensePlate = (value: string) => {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[ -]+/gu, '').toUpperCase();

  if (compact.length < 5 || compact.length > 9) {
    return false;
  }

  if (!/^[A-Z0-9]+$/u.test(compact)) {
    return false;
  }

  if (!/[A-Z]/u.test(compact) || !/\d/u.test(compact)) {
    return false;
  }

  if (new RegExp(`^(?:${POSTAL_PREFIX_COUNTRY})\\d{3,5}$`, 'u').test(compact)) {
    return false;
  }

  if (new RegExp(`\\d\\s*${VEHICLE_UNIT_SUFFIX}$`, 'iu').test(trimmed)) {
    return false;
  }

  if (/[a-ząčęėįšųūž]/u.test(trimmed) && /[ -]/u.test(trimmed)) {
    return false;
  }

  for (const segment of trimmed.toUpperCase().split(/[ -]+/u)) {
    if (PLATE_WORD_BLOCKLIST.has(segment)) {
      return false;
    }
  }

  return true;
};

export const POSTAL_RULE: DetectionRule = {
  type: 'postal',
  pattern: new RegExp(`(?:${POSTAL_PATTERNS.join('|')})`, 'gu'),
  confidence: CONFIDENCE.postal,
};

export const VIN_RULE: DetectionRule = {
  type: 'id',
  pattern: /(?<![\p{L}\p{N}])[A-HJ-NPR-Z0-9]{17}(?![\p{L}\p{N}])/gu,
  confidence: 0.94,
  postFilter: isVinLike,
};

export const DOCUMENT_ID_RULE: DetectionRule = {
  type: 'id',
  pattern: /(?<![\p{L}\p{N}])[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,12}){2,}(?![\p{L}\p{N}])/gu,
  confidence: 0.9,
  postFilter: isStructuredHyphenatedId,
};

export const ID_RULE: DetectionRule = {
  type: 'id',
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:` +
      `(?:Nr\\.?|No\\.?|Nº)\\s*[A-Z0-9]{1,4}-[A-Z0-9]{2,6}` +
      `|\\d{3}-\\d{2}-\\d{4}` +
      `|(?!${POSTAL_PREFIX_COUNTRY}\\d{3,5}(?!\\d))[A-Z]{1,3}\\d{5,10}` +
      `|\\d{2}[A-Z]{2}\\d{6,}` +
      `)(?![\\p{L}\\p{N}])`,
    'giu',
  ),
  confidence: CONFIDENCE.id,
};

export const NUMBER_RULE: DetectionRule = {
  type: 'number',
  pattern: /\b\d{8,}\b/g,
  confidence: CONFIDENCE.number,
};

// Phone separators are spaces, hyphens, parens — explicitly NOT dots /
// commas, since those are decimal / thousand separators in invoice tables
// ("1.000 164.460 164" is not a phone).
export const PHONE_RULE: DetectionRule = {
  type: 'phone',
  pattern: new RegExp(
    `(?<![\\w\\d])` +
      `(?!\\d{4}-\\d{2}(?:-\\d{2})?(?:[ T]\\d{1,2}:\\d{2}(?::\\d{2})?)?)` +
      `(?:\\+\\d{1,3}[\\s\\-()]*)?(?:\\(?\\d{1,4}\\)?(?:[\\s\\-()]+)){1,4}\\d{2,8}` +
      `(?![\\w\\d])` +
      `(?!\\s*${VEHICLE_UNIT_SUFFIX}\\b)`,
    'gu',
  ),
  confidence: CONFIDENCE.phone,
  postFilter: isLongPhoneLike,
};

export const SHORT_SERVICE_PHONE_RULE: DetectionRule = {
  type: 'phone',
  pattern: /(?<![\w\d])[1-9]\d{4,5}(?![\w\d])/g,
  confidence: 0.84,
  postFilter: isShortServicePhone,
};

export const COMPACT_INTERNATIONAL_PHONE_RULE: DetectionRule = {
  type: 'phone',
  pattern: /(?<![\w\d])\+\d{7,15}(?![\w\d])/g,
  confidence: 0.88,
  postFilter: (match) => {
    const digits = extractDigits(match);
    return digits.length >= 7 && digits.length <= 15;
  },
};

export const LICENSE_PLATE_RULE: DetectionRule = {
  type: 'licensePlate',
  pattern: LICENSE_PLATE_RE,
  confidence: CONFIDENCE.licensePlate,
  postFilter: isLikelyLicensePlate,
};

export const CORE_RULES: DetectionRule[] = [
  {
    type: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    confidence: CONFIDENCE.email,
  },
  {
    type: 'url',
    pattern: /\bhttps?:\/\/[^\s<>()]+|\b(?:www\.)[^\s<>()]+\.[a-z]{2,}\S*/giu,
    confidence: CONFIDENCE.url,
  },
  PHONE_RULE,
  SHORT_SERVICE_PHONE_RULE,
  COMPACT_INTERNATIONAL_PHONE_RULE,
  {
    // Use Unicode-aware boundaries — JS \b uses ASCII word chars, so an
    // IBAN followed by a non-ASCII Lithuanian letter ("…87252 Pirkėjas")
    // would otherwise satisfy \b mid-name and the postFilter would reject
    // the over-grown match.
    type: 'iban',
    pattern: new RegExp(
      `(?<![\\p{L}\\p{N}])[A-Z]{2}\\d{2}(?:${IBAN_SEPARATOR}[A-Z0-9]{2,4}){2,7}(?:${IBAN_SEPARATOR}[A-Z0-9]{1,4})?(?![\\p{L}\\p{N}])`,
      'giu',
    ),
    confidence: CONFIDENCE.iban,
    postFilter: isIbanValid,
  },
  {
    // Unicode-aware boundaries: ASCII \b treats Lithuanian Į/Š/etc. as
    // non-word, so a country prefix like "SI" can otherwise latch onto
    // the inside of an LT word (e.g. "ĮSIGALIOJIMAS" → "SI"+"GALIOJIMAS").
    type: 'vat',
    pattern: new RegExp(
      `(?<![\\p{L}\\p{N}])${EU_VAT_COUNTRY}[\\s\\-\\u00A0]?[A-Z0-9]{2,14}(?![\\p{L}\\p{N}])`,
      'gu',
    ),
    confidence: CONFIDENCE.vat,
    postFilter: isVatNumberValid,
  },
  {
    type: 'card',
    pattern: /(?<![\d\w])(?:\d[ -]?){12,18}\d(?![\d\w])/g,
    confidence: CONFIDENCE.card,
    postFilter: (match) => {
      if (!isCardLikeFormat(match)) return false;
      return isLuhnValid(match);
    },
  },
  LICENSE_PLATE_RULE,
  POSTAL_RULE,
  ADDRESS_RULE,
  DATE_RULE,
  VIN_RULE,
  DOCUMENT_ID_RULE,
  ID_RULE,
  NUMBER_RULE,
];
