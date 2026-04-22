import { CONFIDENCE } from '../config';
import type { DetectionRule } from '../rule';
import { isIbanValid, isLuhnValid } from '../../validators';
import { ADDRESS_RULE, DATE_RULE } from './address';

const POSTAL_PATTERNS = [
  '\\b[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}\\b',
  '\\b\\d{4}\\s?[A-Z]{2}\\b',
  '\\b\\d{2}-\\d{3}\\b',
  '\\b\\d{4}-\\d{3}\\b',
  '\\b(?:LT|LV|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|EE|IE)-?\\s?\\d{3,5}\\b',
  '(?:\\b(?:PLZ|CAP|CP|ZIP|post(?:al)?\\s*code|postcode|pašto\\s*kodas|kod\\s*pocztowy|PSČ|ирис|postnummer)\\b[^\\d]{0,6})\\d{3,5}(?:-\\d{3,4})?',
  '\\b[AC-FHKNPRTV-Y]\\d{2}\\s?[AC-FHKNPRTV-Y0-9]{4}\\b',
];

const EU_VAT_COUNTRY =
  '(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)';
const POSTAL_PREFIX_COUNTRY =
  '(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)';

export const POSTAL_RULE: DetectionRule = {
  type: 'postal',
  pattern: new RegExp(`(?:${POSTAL_PATTERNS.join('|')})`, 'gu'),
  confidence: CONFIDENCE.postal,
};

export const ID_RULE: DetectionRule = {
  type: 'id',
  pattern:
    new RegExp(
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
  {
    type: 'phone',
    pattern:
      /(?<![\w\d])(?!\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?)(?:\+\d{1,3}[\s.\-()]?)?(?:\(?\d{1,4}\)?[\s.\-]){1,5}\d{2,4}(?![\w\d])/g,
    confidence: CONFIDENCE.phone,
    postFilter: (match) => {
      const digits = match.replace(/\D+/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
  },
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{2,4}){2,7}(?:[\s]?[A-Z0-9]{1,4})?\b/giu,
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
  ID_RULE,
  NUMBER_RULE,
];
