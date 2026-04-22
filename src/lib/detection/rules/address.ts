import { CONFIDENCE } from '../config';
import { MONTHS_ALT } from '../locales/months';
import { LONG_CITY_ALT, LONG_STREET_ALT, SHORT_CITY_ALT, CONNECTOR_ALT, STREET_TOKEN_CLAUSE } from '../locales/street-tokens';
import type { DetectionRule } from '../rule';

const NAME_WORD = `\\p{Lu}[\\p{L}\\-'’]{1,40}`;
const NAME_CHAIN = `${NAME_WORD}(?:\\s+(?:(?:${CONNECTOR_ALT})\\s+)?${NAME_WORD}){0,4}`;
const INITIALS = `(?:\\p{Lu}\\.\\s*){0,3}`;
const SAINT_PREFIX = `(?:[ŠšSs]v\\.?\\s+)`;
const NUMBER_CLAUSE = `\\d{1,4}[\\p{L}]?(?:\\s*[-–/]\\s*\\d{1,4}[\\p{L}]?)?`;

const POSTAL_SEGMENT =
  `\\s*[,;]?\\s*(?:` +
  `[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}` +
  `|\\d{4}\\s?[A-Z]{2}` +
  `|\\d{2}-\\d{3}` +
  `|\\d{4}-\\d{3}` +
  `|(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)-?\\s?\\d{3,5}` +
  `|\\d{4,6}` +
  `)`;

const CITY_SEGMENT =
  `\\s*[,;]?\\s*${NAME_CHAIN}` +
  `(?:\\s+(?:${SHORT_CITY_ALT})\\.|\\s+(?:${LONG_CITY_ALT})\\.?)?`;

const TOKEN_ADDRESS_BODY =
  `\\p{Lu}[\\p{L}\\-'’]{0,40}(?:${LONG_STREET_ALT})(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  `${INITIALS}${NAME_CHAIN}\\s+${STREET_TOKEN_CLAUSE}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  `${STREET_TOKEN_CLAUSE}\\s+(?:(?:${CONNECTOR_ALT})\\s+)*${NAME_CHAIN}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;

const SAINT_ADDRESS_BODY = `${SAINT_PREFIX}${NAME_CHAIN}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;

export const ADDRESS_RULE: DetectionRule = {
  type: 'address',
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:` +
      `(?:${TOKEN_ADDRESS_BODY})(?:${POSTAL_SEGMENT}(?:${CITY_SEGMENT})?|${CITY_SEGMENT})` +
      `|` +
      `(?:${SAINT_ADDRESS_BODY})(?:${POSTAL_SEGMENT}(?:${CITY_SEGMENT})?|${CITY_SEGMENT})?` +
      `)`,
    'gu',
  ),
  confidence: CONFIDENCE.address,
};

export const DATE_RULE: DetectionRule = {
  type: 'date',
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:\\d{4}-\\d{2}-\\d{2}(?:[ T]\\d{1,2}:\\d{2}(?::\\d{2})?)?|\\d{1,2}[./\\-]\\d{1,2}[./\\-]\\d{2,4}|` +
      `\\d{1,2}\\.?\\s+(?:${MONTHS_ALT})\\.?(?:\\s+\\d{2,4})?|` +
      `(?:${MONTHS_ALT})\\.?\\s+\\d{1,2},?\\s+\\d{2,4}|` +
      `\\d{4}\\s+(?:m\\.?\\s+)?(?:${MONTHS_ALT})\\.?\\s+\\d{1,2}(?:\\s*d\\.?|d\\.?)?)` +
      `(?![\\p{L}\\p{N}])`,
    'giu',
  ),
  confidence: CONFIDENCE.date,
};
