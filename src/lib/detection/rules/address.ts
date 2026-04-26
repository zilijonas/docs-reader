import { CONFIDENCE } from '../config';
import { MONTHS_ALT } from '../locales/months';
import { WEEKDAYS_ALT } from '../locales/weekdays';
import {
  LONG_CITY_ALT,
  LONG_STREET_ALT,
  SHORT_CITY_ALT,
  SHORT_STREET_ALT,
  CONNECTOR_ALT,
  STREET_TOKEN_CLAUSE,
} from '../locales/street-tokens';
import type { DetectionRule } from '../rule';

// Words that frequently precede an address (form labels, country names that
// front the next line) — we must not let NAME_CHAIN swallow them, otherwise
// the highlight bleeds into surrounding context.
const ADDRESS_PREFIX_BLOCKLIST = [
  'Adresas',
  'Adres',
  'Address',
  'Adresse',
  'Adrese',
  'Direccion',
  'Dirección',
  'Latvija',
  'Latvia',
  'Latvijas',
  'Latvijai',
  'Lietuvos',
  'Republikos',
  'Republika',
  'Republikas',
  'Republikai',
  'Lietuva',
  'Liettua',
  'Estija',
  'Estonia',
  'Lenkija',
  'Vokietija',
  'Date',
  'Data',
  'Tel',
  'Phone',
  'Insurance',
  'INSURANCE',
  'BPC',
  'Travel',
  'TRAVEL',
  'RA',
  'Įmonės',
  'Imones',
  'Įmonė',
  'Imone',
  'Kodas',
  'Reg',
  'Administravimas',
  'Administravimo',
  'ADMINISTRAVIMAS',
  'Apmokėjimas',
  'Apmokejimas',
  'Apmokėjimo',
  'Apmokejimo',
  'Mokestis',
  'Mokestį',
  'Mokesti',
  'Mokesčiai',
  'Mokesciai',
  'Objektas',
  'Objekto',
  'Pirkėjas',
  'Pirkejas',
  'Pardavėjas',
  'Pardavejas',
  'Suma',
  'Sumos',
  'Suma:',
  'Kaina',
  'Kainos',
  'Kiekis',
];
const ADDRESS_BLOCK_ALT = ADDRESS_PREFIX_BLOCKLIST.join('|');
const NAME_WORD = `(?!(?:${ADDRESS_BLOCK_ALT})\\b)\\p{Lu}[\\p{L}\\-'’]{1,40}`;
const UPPERCASE_NAME_WORD = `(?!(?:${ADDRESS_BLOCK_ALT})\\b)\\p{Lu}{2,}[\\p{L}\\-'’]{0,40}`;
const NAME_CHAIN = `${NAME_WORD}(?:\\s+(?:(?:${CONNECTOR_ALT})\\s+)?${NAME_WORD}){0,4}`;
const UPPERCASE_NAME_CHAIN = `${UPPERCASE_NAME_WORD}(?:\\s+${UPPERCASE_NAME_WORD}){0,4}`;
// Cities are short — at most one extra token (e.g. "New York", "Vilniaus
// m."). Keeping CITY_NAME_CHAIN tight prevents the rule from absorbing
// trailing context words that follow the address line.
const CITY_NAME_CHAIN = `${NAME_WORD}(?:\\s+${NAME_WORD})?`;
// Allow 1-3 letter abbreviations like "J.", "Kr.", "Sv.", "St." so the
// match captures full street prefixes such as "Kr. Valdemāra iela".
const INITIALS = `(?:\\p{Lu}\\p{Ll}{0,2}\\.\\s*){0,3}`;
const SAINT_PREFIX = `(?:[ŠšSs]v\\.?\\s*)`;
const NUMBER_CLAUSE = `\\d{1,4}[\\p{L}]?(?:\\s*[-–/]\\s*\\d{1,4}[\\p{L}]?)?`;
const UPPERCASE_SHORT_STREET_CLAUSE = `(?:${SHORT_STREET_ALT})\\.?`;

const POSTAL_SEGMENT =
  `\\s*[,;]?\\s*(?:` +
  `[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}` +
  `|\\d{4}\\s?[A-Z]{2}` +
  `|\\d{2}-\\d{3}` +
  `|\\d{4}-\\d{3}` +
  `|(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)-?\\s?\\d{3,5}` +
  `|0\\d{4}` +
  `|\\d{4,6}` +
  `)`;

// City segment must be committed: either by a leading separator (",", ";")
// or by a trailing city-suffix token (e.g. "m.", "miestas"). Without this,
// the rule swallows arbitrary capitalized words that follow the address.
const CITY_SEGMENT =
  `(?:\\s*[,;]\\s*${CITY_NAME_CHAIN}(?:\\s+(?:${SHORT_CITY_ALT})\\.|\\s+(?:${LONG_CITY_ALT})\\.?)?` +
  `|\\s+${CITY_NAME_CHAIN}(?:\\s+(?:${SHORT_CITY_ALT})\\.|\\s+(?:${LONG_CITY_ALT})\\.?))`;

const TOKEN_ADDRESS_BODY =
  `\\p{Lu}[\\p{L}\\-'’]{0,40}(?:${LONG_STREET_ALT})(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  `${INITIALS}${NAME_CHAIN}\\s+${STREET_TOKEN_CLAUSE}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  `${STREET_TOKEN_CLAUSE}\\s+(?:(?:${CONNECTOR_ALT})\\s+)*${NAME_CHAIN}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;

const SAINT_ADDRESS_BODY = `${SAINT_PREFIX}${NAME_CHAIN}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;
const UPPERCASE_SHORT_ADDRESS_BODY = `${UPPERCASE_NAME_CHAIN}\\s+${UPPERCASE_SHORT_STREET_CLAUSE}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;
const OPTIONAL_WEEKDAY_PREFIX = `(?:(?:${WEEKDAYS_ALT})\\.?\\s+)?`;

export const ADDRESS_RULE: DetectionRule = {
  type: 'address',
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:` +
      `(?:${TOKEN_ADDRESS_BODY})(?:${POSTAL_SEGMENT}(?:${CITY_SEGMENT})?|${CITY_SEGMENT})` +
      `|` +
      `(?:${SAINT_ADDRESS_BODY})(?:${POSTAL_SEGMENT}(?:${CITY_SEGMENT})?|${CITY_SEGMENT})?` +
      `|` +
      `(?:${UPPERCASE_SHORT_ADDRESS_BODY})(?:${POSTAL_SEGMENT}(?:${CITY_SEGMENT})?|${CITY_SEGMENT})?` +
      `)`,
    'gu',
  ),
  confidence: CONFIDENCE.address,
};

// Trailing time suffix attached directly to a date — covers "T19:45",
// " 19:45", and the seconds-bearing variants. Used when the format
// already ends with a clear day/year token.
const TRAILING_TIME_SUFFIX = `(?:[ T]\\d{1,2}:\\d{2}(?::\\d{2})?)?`;
// "Year-or-time" tail used with "<day> <MONTH>" formats — the trailing
// integer is optional and may carry a ":MM" / ":MM:SS" time suffix
// attached without a separator (e.g. "18 SEP 19:45").
const YEAR_OR_TIME_TAIL = `(?:\\s+\\d{1,4}(?::\\d{2}(?::\\d{2})?)?)?`;

export const DATE_RULE: DetectionRule = {
  type: 'date',
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${OPTIONAL_WEEKDAY_PREFIX}(?:\\d{4}-\\d{2}-\\d{2}${TRAILING_TIME_SUFFIX}|\\d{1,2}[./\\-]\\d{1,2}[./\\-]\\d{2,4}${TRAILING_TIME_SUFFIX}|` +
      `\\d{1,2}\\.?\\s+(?:${MONTHS_ALT})\\.?${YEAR_OR_TIME_TAIL}|` +
      `(?:${MONTHS_ALT})\\.?\\s+\\d{1,2},?\\s+\\d{2,4}${TRAILING_TIME_SUFFIX}|` +
      `\\d{4}\\s+(?:m\\.?\\s+)?(?:${MONTHS_ALT})\\.?\\s+\\d{1,2}(?:\\s*d\\.?|d\\.?)?))` +
      `(?![\\p{L}\\p{N}])`,
    'giu',
  ),
  confidence: CONFIDENCE.date,
};
