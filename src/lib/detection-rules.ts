import type { DetectionType } from './types';
import {
  isBsnValid,
  isCodiceFiscaleValid,
  isDniValid,
  isEstonianPersonalCodeValid,
  isGermanSteuerIdValid,
  isIbanValid,
  isLithuanianPersonalCodeValid,
  isLuhnValid,
  isNinoValid,
  isNirValid,
  isPeselValid,
} from './detection-validators';

export interface DetectionRule {
  type: DetectionType;
  pattern: RegExp;
  confidence: number;
  /** Optional validator. If it returns `false`, match is dropped. */
  postFilter?: (match: string) => boolean;
}

// Months — full + short — for all major European locales.
const MONTHS = [
  // English
  'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
  'may', 'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sept', 'sep',
  'october', 'oct', 'november', 'nov', 'december', 'dec',
  // German
  'januar', 'jänner', 'februar', 'märz', 'mär', 'mai', 'juni', 'juli', 'august',
  'september', 'oktober', 'november', 'dezember', 'dez',
  // French
  'janvier', 'janv', 'février', 'fevrier', 'févr', 'fevr', 'mars', 'avril', 'avr',
  'mai', 'juin', 'juillet', 'juil', 'août', 'aout', 'septembre', 'sept',
  'octobre', 'oct', 'novembre', 'nov', 'décembre', 'decembre', 'déc', 'dec',
  // Spanish
  'enero', 'ene', 'febrero', 'febr', 'marzo', 'mar', 'abril', 'abr',
  'mayo', 'may', 'junio', 'jun', 'julio', 'jul', 'agosto', 'ago',
  'septiembre', 'setiembre', 'sept', 'set', 'octubre', 'oct', 'noviembre', 'nov',
  'diciembre', 'dic',
  // Italian
  'gennaio', 'gen', 'febbraio', 'feb', 'marzo', 'mar', 'aprile', 'apr',
  'maggio', 'mag', 'giugno', 'giu', 'luglio', 'lug', 'agosto', 'ago',
  'settembre', 'set', 'ottobre', 'ott', 'novembre', 'nov', 'dicembre', 'dic',
  // Portuguese
  'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  // Dutch
  'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
  'augustus', 'september', 'oktober', 'november', 'december',
  // Polish (nominative + genitive)
  'styczeń', 'stycznia', 'luty', 'lutego', 'marzec', 'marca', 'kwiecień', 'kwietnia',
  'maj', 'maja', 'czerwiec', 'czerwca', 'lipiec', 'lipca', 'sierpień', 'sierpnia',
  'wrzesień', 'września', 'październik', 'października', 'listopad', 'listopada',
  'grudzień', 'grudnia',
  // Lithuanian (nominative + genitive forms seen on dates)
  'sausis', 'sausio', 'vasaris', 'vasario', 'kovas', 'kovo', 'balandis', 'balandžio',
  'gegužė', 'gegužės', 'birželis', 'birželio', 'liepa', 'liepos',
  'rugpjūtis', 'rugpjūčio', 'rugsėjis', 'rugsėjo', 'spalis', 'spalio',
  'lapkritis', 'lapkričio', 'gruodis', 'gruodžio',
  // Latvian
  'janvāris', 'janvāra', 'februāris', 'februāra', 'marts', 'marta',
  'aprīlis', 'aprīļa', 'maijs', 'maija', 'jūnijs', 'jūnija', 'jūlijs', 'jūlija',
  'augusts', 'augusta', 'septembris', 'septembra', 'oktobris', 'oktobra',
  'novembris', 'novembra', 'decembris', 'decembra',
  // Estonian
  'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli',
  'august', 'september', 'oktoober', 'november', 'detsember',
  // Finnish
  'tammikuu', 'tammikuuta', 'helmikuu', 'helmikuuta', 'maaliskuu', 'maaliskuuta',
  'huhtikuu', 'huhtikuuta', 'toukokuu', 'toukokuuta', 'kesäkuu', 'kesäkuuta',
  'heinäkuu', 'heinäkuuta', 'elokuu', 'elokuuta', 'syyskuu', 'syyskuuta',
  'lokakuu', 'lokakuuta', 'marraskuu', 'marraskuuta', 'joulukuu', 'joulukuuta',
  // Swedish
  'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli',
  'augusti', 'september', 'oktober', 'november', 'december',
  // Norwegian / Danish
  'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli',
  'august', 'september', 'oktober', 'november', 'desember', 'december',
  // Czech / Slovak
  'leden', 'ledna', 'únor', 'února', 'březen', 'března', 'duben', 'dubna',
  'květen', 'května', 'červen', 'června', 'červenec', 'července',
  'srpen', 'srpna', 'září', 'říjen', 'října', 'listopad', 'listopadu',
  'prosinec', 'prosince',
  'január', 'februára', 'marca', 'apríl', 'máj', 'jún', 'júl',
  'august', 'september', 'október', 'november', 'december',
  // Hungarian
  'január', 'februári', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
  // Romanian
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  // Greek (transliteration + native)
  'ιανουάριος', 'φεβρουάριος', 'μάρτιος', 'απρίλιος', 'μάιος', 'ιούνιος',
  'ιούλιος', 'αύγουστος', 'σεπτέμβριος', 'οκτώβριος', 'νοέμβριος', 'δεκέμβριος',
  // Bulgarian
  'януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли',
  'август', 'септември', 'октомври', 'ноември', 'декември',
  // Croatian / Slovenian
  'siječanj', 'siječnja', 'veljača', 'veljače', 'ožujak', 'ožujka',
  'travanj', 'travnja', 'svibanj', 'svibnja', 'lipanj', 'lipnja',
  'srpanj', 'srpnja', 'kolovoz', 'kolovoza', 'rujan', 'rujna',
  'listopad', 'listopada', 'studeni', 'studenoga', 'prosinac', 'prosinca',
  'januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij',
  'avgust', 'september', 'oktober', 'november', 'december',
  // Turkish
  'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz',
  'ağustos', 'eylül', 'ekim', 'kasım', 'aralık',
];

const MONTHS_ALT = Array.from(new Set(MONTHS.map((month) => month.toLowerCase()))).join('|');

// Street tokens — locale-specific — for conservative address detection.
//
// Tokens are split into two classes:
//  - LONG (3+ chars):  dot is OPTIONAL — `straße`, `street`, `ulica`, `rue`.
//  - SHORT (1–2 chars): dot is REQUIRED — `g.`, `pr.`, `al.`, `ul.`, `st.`.
// This prevents single-letter false positives (every capitalized word has
// random 1–2-letter suffixes that would otherwise collide) while still
// catching the ubiquitous Lithuanian / Polish / English abbreviations.
const LONG_STREET_TOKENS = [
  // English
  'street', 'avenue', 'road', 'lane', 'boulevard', 'drive', 'court', 'square', 'place', 'alley', 'way',
  // German
  'straße', 'strasse', 'str', 'gasse', 'weg', 'platz', 'allee', 'ring', 'ufer', 'damm', 'steig',
  // French
  'rue', 'avenue', 'boulevard', 'place', 'chemin', 'impasse', 'quai', 'route', 'allée', 'allee', 'cours', 'voie',
  // Spanish / Portuguese
  'calle', 'avenida', 'plaza', 'paseo', 'camino', 'carrer', 'ronda', 'passeig',
  'rua', 'travessa', 'largo', 'praça', 'praca',
  // Italian
  'via', 'viale', 'piazza', 'corso', 'vicolo', 'contrada', 'piazzale', 'largo',
  // Dutch / Flemish
  'straat', 'laan', 'plein', 'kade',
  // Polish
  'ulica', 'aleja', 'plac', 'skwer',
  // Lithuanian
  'gatvė', 'gatve', 'prospektas', 'alėja', 'aleja', 'skersgatvis', 'takas', 'plentas',
  // Latvian / Estonian
  'iela', 'prospekts', 'bulvāris', 'bulvaris',
  'tänav', 'tanav', 'puiestee', 'maantee',
  // Nordic
  'gatan', 'gata', 'vägen', 'vagen', 'gade', 'vej', 'allé',
  // Czech / Slovak
  'ulice', 'třída', 'trida', 'náměstí', 'namesti', 'námestie', 'namestie', 'nábreží',
  // Hungarian
  'utca', 'tér', 'ter', 'körút', 'korut', 'sétány', 'setany',
  // Romanian
  'strada', 'bulevardul', 'calea', 'soseaua', 'șoseaua',
  // Greek
  'οδός', 'πλατεία', 'λεωφόρος',
];

const SHORT_STREET_TOKENS = [
  // English
  'st', 'ave', 'rd', 'ln', 'blvd', 'dr', 'ct', 'sq', 'pl', 'hwy',
  // German
  'str',
  // Polish
  'ul', 'al', 'pl',
  // Lithuanian
  'g', 'pr', 'al', 'skg', 'pl',
  // Hungarian
  'u', 'út', 'krt',
  // Romanian
  'bd', 'blv', 'b-dul', 'sos',
];

const escapeToken = (token: string) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const makeAlternation = (tokens: string[]) =>
  Array.from(new Set(tokens.map((token) => token.toLowerCase())))
    .sort((a, b) => b.length - a.length)
    .map(escapeToken)
    .join('|');

const LONG_STREET_ALT = makeAlternation(LONG_STREET_TOKENS);
const SHORT_STREET_ALT = makeAlternation(SHORT_STREET_TOKENS);

// Matches either a long token (dot optional) or a short token followed by
// a required dot. Short-token dot is non-negotiable — the dot is what
// distinguishes `pr.` (prospektas) from `pr` inside `prospektas` itself.
const STREET_TOKEN_CLAUSE = `(?:(?:${LONG_STREET_ALT})\\.?|(?:${SHORT_STREET_ALT})\\.)`;

// City / locality suffix markers, used only at the tail of an address.
//  - Long forms (`miestas`, `stadt`, `ville`) have optional dot.
//  - Short forms (`m.`, `raj.`, `sav.`, `sen.`) REQUIRE the dot.
const LONG_CITY_MARKERS = [
  'miestas', 'miesto', 'miasto', 'rajonas', 'seniūnija', 'seniunija', 'apskritis',
  'stadt', 'ville', 'cedex', 'város', 'varos', 'miasteczko', 'község', 'kozseg',
  'comune', 'municipio', 'concello', 'distrikt', 'gemeinde',
];
const SHORT_CITY_MARKERS = [
  // Lithuanian locality abbreviations
  'm', 'mst', 'mstl', 'k', 'vs', 'r', 'sav', 'sen', 'pag', 'apskr', 'raj',
];

const LONG_CITY_ALT = makeAlternation(LONG_CITY_MARKERS);
const SHORT_CITY_ALT = makeAlternation(SHORT_CITY_MARKERS);

// Connector words that sit between capitalized name tokens inside an
// address (`rue de la Paix`, `Plaza de España`, `van der Waals laan`).
const ADDRESS_CONNECTORS = [
  'de', 'la', 'le', 'les', 'des', 'du', 'da', 'do', 'dos', 'das',
  'van', 'von', 'der', 'den', 'al', 'del', 'y', 'e', 'und', 'et', 'of', 'the',
];
const CONNECTOR_ALT = makeAlternation(ADDRESS_CONNECTORS);

// Postal-code patterns per country.
const POSTAL_PATTERNS = [
  // UK (full or outward+inward)
  '\\b[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}\\b',
  // Netherlands
  '\\b\\d{4}\\s?[A-Z]{2}\\b',
  // Poland, Portugal
  '\\b\\d{2}-\\d{3}\\b',
  '\\b\\d{4}-\\d{3}\\b',
  // Prefixed EU-style
  '\\b(?:LT|LV|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|EE|IE)-?\\s?\\d{3,5}\\b',
  // Anchored by label (PLZ/CAP/CP/ZIP/pašto/kod pocztowy/PSČ/Postcode)
  '(?:\\b(?:PLZ|CAP|CP|ZIP|post(?:al)?\\s*code|postcode|pašto\\s*kodas|kod\\s*pocztowy|PSČ|ирис|postnummer)\\b[^\\d]{0,6})\\d{3,5}(?:-\\d{3,4})?',
  // Ireland Eircode
  '\\b[AC-FHKNPRTV-Y]\\d{2}\\s?[AC-FHKNPRTV-Y0-9]{4}\\b',
];

const EU_VAT_COUNTRY = '(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)';

// Per-country national IDs — each paired with checksum validator where possible.
const NATIONAL_ID_RULES: DetectionRule[] = [
  {
    // Lithuanian asmens kodas (11 digits, first is century 1-6)
    type: 'nationalId',
    pattern: /(?<![\d\w])[1-6]\d{10}(?![\d\w])/g,
    confidence: 0.97,
    postFilter: isLithuanianPersonalCodeValid,
  },
  {
    // Latvian personas kods — 6 digits + "-" + 5 digits
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{6}-\d{5}(?![\d\w])/g,
    confidence: 0.95,
  },
  {
    // Estonian isikukood — same length as LT but first digit 1-8
    type: 'nationalId',
    pattern: /(?<![\d\w])[1-8]\d{10}(?![\d\w])/g,
    confidence: 0.95,
    postFilter: isEstonianPersonalCodeValid,
  },
  {
    // Polish PESEL — 11 digits with checksum
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{11}(?![\d\w])/g,
    confidence: 0.95,
    postFilter: isPeselValid,
  },
  {
    // Dutch BSN — 8 or 9 digits, 11-test
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{8,9}(?![\d\w])/g,
    confidence: 0.88,
    postFilter: isBsnValid,
  },
  {
    // German Steuer-ID — 11 digits with MOD 11,10 checksum
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{11}(?![\d\w])/g,
    confidence: 0.9,
    postFilter: isGermanSteuerIdValid,
  },
  {
    // Italian codice fiscale — 16 alphanumeric
    type: 'nationalId',
    pattern: /(?<![\w\d])[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z](?![\w\d])/gi,
    confidence: 0.97,
    postFilter: isCodiceFiscaleValid,
  },
  {
    // Spanish DNI/NIE — 8 digits + letter, or prefix letter + 7 digits + letter
    type: 'nationalId',
    pattern: /(?<![\w\d])(?:[XYZ]\d{7}|\d{8})[A-Z](?![\w\d])/gi,
    confidence: 0.95,
    postFilter: isDniValid,
  },
  {
    // French NIR (INSEE) — 13 digits + 2-digit key, flexible spacing
    type: 'nationalId',
    pattern: /(?<![\w\d])[12]\s?\d{2}\s?(?:0[1-9]|1[0-2])\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}\s?\d{2}(?![\w\d])/gi,
    confidence: 0.96,
    postFilter: isNirValid,
  },
  {
    // UK NINO
    type: 'nationalId',
    pattern: /(?<![\w\d])[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D](?![\w\d])/g,
    confidence: 0.95,
    postFilter: isNinoValid,
  },
];

const CORE_RULES: DetectionRule[] = [
  {
    type: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    confidence: 0.98,
  },
  {
    type: 'url',
    pattern: /\bhttps?:\/\/[^\s<>()]+|\b(?:www\.)[^\s<>()]+\.[a-z]{2,}\S*/giu,
    confidence: 0.95,
  },
  {
    // Phone — requires + or a digit-group separator so pure digit runs are not false positives.
    type: 'phone',
    pattern: /(?<![\w\d])(?:\+\d{1,3}[\s.\-()]?)?(?:\(?\d{1,4}\)?[\s.\-]){1,5}\d{2,4}(?![\w\d])/g,
    confidence: 0.9,
    postFilter: (match) => {
      const digits = match.replace(/\D+/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
  },
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{2,4}){2,7}(?:[\s]?[A-Z0-9]{1,4})?\b/giu,
    confidence: 0.97,
    postFilter: isIbanValid,
  },
  {
    type: 'vat',
    pattern: new RegExp(`\\b${EU_VAT_COUNTRY}[\\s-]?[A-Z0-9]{8,14}\\b`, 'gu'),
    confidence: 0.9,
  },
  {
    type: 'card',
    pattern: /(?<![\d\w])(?:\d[ -]?){12,18}\d(?![\d\w])/g,
    confidence: 0.9,
    postFilter: isLuhnValid,
  },
];

// Postal — union per-country regex fragments.
const POSTAL_RULE: DetectionRule = {
  type: 'postal',
  pattern: new RegExp(`(?:${POSTAL_PATTERNS.join('|')})`, 'gu'),
  confidence: 0.82,
};

// ---------------------------------------------------------------------------
// Address rule
//
// An address has three variable-position anchors:
//   [street-token]  [street-name]  [house-number]
// in one of three orders, optionally followed by a postal + city tail.
//
// We capture the full phrase so the bounding box covers the whole address —
// not just the street abbreviation like `g.` or `pr.`.
//
// Fragments used below:
//   NAME_WORD       — a single capitalized word (Unicode-safe letters).
//   NAME_CHAIN      — 1-5 capitalized words possibly glued by connectors
//                     like "de la", "van der", "del".
//   INITIALS        — up to 3 leading initials (`J. `, `A. M. `).
//   NUMBER_CLAUSE   — house number, optional letter (12a), optional suffix (12-14, 12/3).
//   POSTAL_TAIL     — optional `,? 01118` / `, 08131` / `LT-01118` tail.
//   CITY_TAIL       — optional city words possibly closed by a marker like `m.`.
// ---------------------------------------------------------------------------

const NAME_WORD = `\\p{Lu}[\\p{L}\\-'’]{1,40}`;
const NAME_CHAIN = `${NAME_WORD}(?:\\s+(?:(?:${CONNECTOR_ALT})\\s+)?${NAME_WORD}){0,4}`;
const INITIALS = `(?:\\p{Lu}\\.\\s*){0,3}`;
const NUMBER_CLAUSE = `\\d{1,4}[a-zA-Z]?(?:[\\s\\-/]\\d{1,4}[a-zA-Z]?)?`;

// Postal tail: accepts the most common European formats (UK outward+inward,
// NL 1234 AB, PL/PT 00-000, prefixed LT-/LV-/etc., or a bare 4–6 digit code).
const POSTAL_TAIL =
  `(?:\\s*[,;]?\\s*(?:` +
  `[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}` + // UK
  `|\\d{4}\\s?[A-Z]{2}` + // NL
  `|\\d{2}-\\d{3}` + // PL
  `|\\d{4}-\\d{3}` + // PT
  `|(?:LT|LV|EE|AT|BE|CH|DE|FR|IT|ES|PT|PL|SE|FI|DK|NO|NL|HR|SI|SK|CZ|HU|RO|GR|BG|IE)-?\\s?\\d{3,5}` +
  `|\\d{4,6}` + // bare numeric postal (LT 01118, DE 10115, ES/FR/IT 28013, SE 11356, HU 1051)
  `))?`;

// City tail: optional city name (1–4 words) optionally closed with a short
// or long locality marker like `m.`, `raj.`, `miestas`, `stadt`, `ville`.
const CITY_TAIL =
  `(?:\\s*[,;]?\\s*${NAME_CHAIN}` +
  `(?:\\s+(?:${SHORT_CITY_ALT})\\.|\\s+(?:${LONG_CITY_ALT}))?)?`;

// Three address forms. All share POSTAL_TAIL + CITY_TAIL.
//
// A. Compound street (German-style): `Hauptstraße 42`, `Ringstrasse 7`.
//    Pattern: <CapitalizedPrefix><long-token><sep><number>
//
// B. Word + token + number (English / Baltic / Polish):
//    `Main Street 42`, `Basanavičiaus g. 10`, `Konstitucijos pr. 24`.
//
// C. Token + word + number (Romance / Slavic): `rue de la Paix 12`,
//    `ul. Mickiewicza 5`, `calle Mayor 3`.
const ADDRESS_BODY =
  // A. compound (long token only — short tokens must be free-standing)
  `\\p{Lu}[\\p{L}\\-'’]{0,40}(?:${LONG_STREET_ALT})(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  // B. optional initials + name chain + token + number
  `${INITIALS}${NAME_CHAIN}\\s+${STREET_TOKEN_CLAUSE}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}` +
  `|` +
  // C. token + optional leading connector + name chain + number
  `${STREET_TOKEN_CLAUSE}\\s+(?:(?:${CONNECTOR_ALT})\\s+)*${NAME_CHAIN}(?:[,;]?\\s+|\\s*[-–]\\s*)${NUMBER_CLAUSE}`;

const ADDRESS_RULE: DetectionRule = {
  type: 'address',
  pattern: new RegExp(
    // Unicode-aware boundary at the start — plain `\b` is ASCII-only so
    // it misfires on letters like `ž`, `ä`, `ß`.
    `(?<![\\p{L}\\p{N}])(?:${ADDRESS_BODY})${POSTAL_TAIL}${CITY_TAIL}`,
    'giu',
  ),
  confidence: 0.72,
};

// Date — pure numeric formats + month-name formats in many locales.
const DATE_RULE: DetectionRule = {
  type: 'date',
  pattern: new RegExp(
    // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd
    `\\b(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[./\\-]\\d{1,2}[./\\-]\\d{2,4}|` +
      // d month yyyy  OR  month d, yyyy  OR  month dth yyyy  OR  yyyy month d
      `\\d{1,2}\\.?\\s+(?:${MONTHS_ALT})\\.?(?:\\s+\\d{2,4})?|` +
      `(?:${MONTHS_ALT})\\.?\\s+\\d{1,2},?\\s+\\d{2,4}|` +
      `\\d{4}\\s+(?:${MONTHS_ALT})\\.?\\s+\\d{1,2})\\b`,
    'giu',
  ),
  confidence: 0.86,
};

const ID_RULE: DetectionRule = {
  type: 'id',
  pattern: /\b(?:\d{3}[- ]?\d{2}[- ]?\d{4}|[A-Z]{1,3}\d{5,10}|\d{2}[A-Z]{2}\d{6,})\b/gi,
  confidence: 0.88,
};

const NUMBER_RULE: DetectionRule = {
  type: 'number',
  pattern: /\b\d{8,}\b/g,
  confidence: 0.72,
};

export const DETECTION_RULES: DetectionRule[] = [
  ...CORE_RULES,
  ...NATIONAL_ID_RULES,
  POSTAL_RULE,
  ADDRESS_RULE,
  DATE_RULE,
  ID_RULE,
  NUMBER_RULE,
];

export const buildKeywordPattern = (keywords: string[]): RegExp | null => {
  const filtered = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (!filtered.length) return null;

  const escaped = filtered
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(`(?<![\\p{L}\\d])(?:${escaped})(?![\\p{L}\\d])`, 'giu');
};
