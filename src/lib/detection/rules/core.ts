import { CONFIDENCE } from '../config';
import type { DetectionRule } from '../rule';
import { isIbanValid, isLuhnValid } from '../../validators';
import { ADDRESS_RULE, DATE_RULE } from './address';

const POSTAL_PATTERNS = [
  '\\b[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}\\b',
  '\\b\\d{4}\\s?[A-Z]{2}\\b',
  '\\b\\d{2}-\\d{3}\\b',
  '\\b\\d{4}-\\d{3}\\b',
  '\\b0\\d{4}\\b',
  '\\b(?:LT|LV|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|EE|IE)-?\\s?\\d{3,5}\\b',
  '(?:\\b(?:PLZ|CAP|CP|ZIP|post(?:al)?\\s*code|postcode|pašto\\s*kodas|kod\\s*pocztowy|PSČ|ирис|postnummer)\\b[^\\d]{0,6})\\d{3,5}(?:-\\d{3,4})?',
  '\\b[AC-FHKNPRTV-Y]\\d{2}\\s?[AC-FHKNPRTV-Y0-9]{4}\\b',
];

const EU_VAT_COUNTRY =
  '(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)';
const POSTAL_PREFIX_COUNTRY =
  '(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)';
const IBAN_SEPARATOR = '[\\s\\u00A0]?';
const VEHICLE_UNIT_SUFFIX = '(?:km|kms|kilometers?|kilometres?|mi|miles?)';

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

  if (/^\d{4}-\d{2}(?:-\d{2})?(?:\s+\d{4,6})?$/u.test(normalized)) {
    return false;
  }

  if (new RegExp(`\\b${VEHICLE_UNIT_SUFFIX}\\b`, 'iu').test(normalized)) {
    return false;
  }

  return /[+\s().-]/.test(normalized);
};

const isShortServicePhone = (value: string) => /^[1-9]\d{4,5}$/u.test(value);

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
      `|\\d{3}[- ]?\\d{2}[- ]?\\d{4}` +
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

export const PHONE_RULE: DetectionRule = {
  type: 'phone',
  pattern: new RegExp(
    `(?<![\\w\\d])` +
      `(?!\\d{4}-\\d{2}(?:-\\d{2})?(?:[ T]\\d{1,2}:\\d{2}(?::\\d{2})?)?)` +
      `(?:\\+\\d{1,3}[\\s.\\-()]*)?(?:\\(?\\d{1,4}\\)?(?:[\\s.\\-()]+)){1,4}\\d{2,8}` +
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
    type: 'iban',
    pattern: new RegExp(
      `\\b[A-Z]{2}\\d{2}(?:${IBAN_SEPARATOR}[A-Z0-9]{2,4}){2,7}(?:${IBAN_SEPARATOR}[A-Z0-9]{1,4})?\\b`,
      'giu',
    ),
    confidence: CONFIDENCE.iban,
    postFilter: isIbanValid,
  },
  {
    type: 'vat',
    pattern: new RegExp(`\\b${EU_VAT_COUNTRY}[\\s-]?[A-Z0-9]{8,14}\\b`, 'gu'),
    confidence: CONFIDENCE.vat,
  },
  {
    type: 'card',
    pattern: /(?<![\d\w])(?:\d[ -]?){12,18}\d(?![\d\w])/g,
    confidence: CONFIDENCE.card,
    postFilter: isLuhnValid,
  },
  POSTAL_RULE,
  ADDRESS_RULE,
  DATE_RULE,
  VIN_RULE,
  DOCUMENT_ID_RULE,
  ID_RULE,
  NUMBER_RULE,
];
