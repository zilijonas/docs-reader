import { makeAlternation, makeCaseInsensitiveAlternation } from '../regex-utils';

// Street tokens — locale-specific — for conservative address detection.
//
// Tokens are split into two classes:
//  - LONG (3+ chars):  dot is OPTIONAL — `straße`, `street`, `ulica`, `rue`.
//  - SHORT (1–2 chars): dot is REQUIRED — `g.`, `pr.`, `al.`, `ul.`, `st.`.
// This prevents single-letter false positives (every capitalized word has
// random 1–2-letter suffixes that would otherwise collide) while still
// catching the ubiquitous Lithuanian / Polish / English abbreviations.
export const LONG_STREET_TOKENS = [
  // English
  'street',
  'avenue',
  'road',
  'lane',
  'boulevard',
  'drive',
  'court',
  'square',
  'place',
  'alley',
  'way',
  // German
  'straße',
  'strasse',
  'str',
  'gasse',
  'weg',
  'platz',
  'allee',
  'ring',
  'ufer',
  'damm',
  'steig',
  // French
  'rue',
  'avenue',
  'boulevard',
  'place',
  'chemin',
  'impasse',
  'quai',
  'route',
  'allée',
  'allee',
  'cours',
  'voie',
  // Spanish / Portuguese
  'calle',
  'avenida',
  'plaza',
  'paseo',
  'camino',
  'carrer',
  'ronda',
  'passeig',
  'rua',
  'travessa',
  'largo',
  'praça',
  'praca',
  // Italian
  'via',
  'viale',
  'piazza',
  'corso',
  'vicolo',
  'contrada',
  'piazzale',
  'largo',
  // Dutch / Flemish
  'straat',
  'laan',
  'plein',
  'kade',
  // Polish
  'ulica',
  'aleja',
  'plac',
  'skwer',
  // Lithuanian
  'gatvė',
  'gatve',
  'prospektas',
  'alėja',
  'aleja',
  'skersgatvis',
  'takas',
  'plentas',
  // Latvian / Estonian
  'iela',
  'prospekts',
  'bulvāris',
  'bulvaris',
  'tänav',
  'tanav',
  'puiestee',
  'maantee',
  // Nordic
  'gatan',
  'gata',
  'vägen',
  'vagen',
  'gade',
  'vej',
  'allé',
  // Czech / Slovak
  'ulice',
  'třída',
  'trida',
  'náměstí',
  'namesti',
  'námestie',
  'namestie',
  'nábreží',
  // Hungarian
  'utca',
  'tér',
  'ter',
  'körút',
  'korut',
  'sétány',
  'setany',
  // Romanian
  'strada',
  'bulevardul',
  'calea',
  'soseaua',
  'șoseaua',
  // Greek
  'οδός',
  'πλατεία',
  'λεωφόρος',
];

export const SHORT_STREET_TOKENS = [
  // English
  'st',
  'ave',
  'rd',
  'ln',
  'blvd',
  'dr',
  'ct',
  'sq',
  'pl',
  'hwy',
  // German
  'str',
  // Polish
  'ul',
  'al',
  'pl',
  // Lithuanian
  'g',
  'pr',
  'al',
  'skg',
  'pl',
  // Hungarian
  'u',
  'út',
  'krt',
  // Romanian
  'bd',
  'blv',
  'b-dul',
  'sos',
];

export const LONG_STREET_ALT = makeCaseInsensitiveAlternation(LONG_STREET_TOKENS);
export const SHORT_STREET_ALT = makeCaseInsensitiveAlternation(SHORT_STREET_TOKENS);

// Matches either a long token (dot optional) or a short token followed by
// a required dot. Short-token dot is non-negotiable — the dot is what
// distinguishes `pr.` (prospektas) from `pr` inside `prospektas` itself.
export const STREET_TOKEN_CLAUSE = `(?:(?:${LONG_STREET_ALT})\\.?|(?:${SHORT_STREET_ALT})\\.)`;

// City / locality suffix markers, used only at the tail of an address.
//  - Long forms (`miestas`, `stadt`, `ville`) have optional dot.
//  - Short forms (`m.`, `raj.`, `sav.`, `sen.`) REQUIRE the dot.
export const LONG_CITY_MARKERS = [
  'miestas',
  'miesto',
  'miasto',
  'rajonas',
  'seniūnija',
  'seniunija',
  'apskritis',
  'stadt',
  'ville',
  'cedex',
  'város',
  'varos',
  'miasteczko',
  'község',
  'kozseg',
  'comune',
  'municipio',
  'concello',
  'distrikt',
  'gemeinde',
];

export const SHORT_CITY_MARKERS = [
  // Lithuanian locality abbreviations
  'm',
  'mst',
  'mstl',
  'k',
  'vs',
  'r',
  'sav',
  'sen',
  'pag',
  'apskr',
  'raj',
];

export const LONG_CITY_ALT = makeCaseInsensitiveAlternation(LONG_CITY_MARKERS);
export const SHORT_CITY_ALT = makeCaseInsensitiveAlternation(SHORT_CITY_MARKERS);

// Connector words that sit between capitalized name tokens inside an
// address (`rue de la Paix`, `Plaza de España`, `van der Waals laan`).
// Kept lowercase-only — capitalized "De"/"Van" is rare and wrongly allowing
// it lets the regex chain arbitrary lowercase sentence fragments.
export const ADDRESS_CONNECTORS = [
  'de',
  'la',
  'le',
  'les',
  'des',
  'du',
  'da',
  'do',
  'dos',
  'das',
  'van',
  'von',
  'der',
  'den',
  'al',
  'del',
  'y',
  'e',
  'und',
  'et',
  'of',
  'the',
];

export const CONNECTOR_ALT = makeAlternation(ADDRESS_CONNECTORS);
