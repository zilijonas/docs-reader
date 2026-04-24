// Multilingual labels commonly preceding a person name in forms / headers.
// Lowercase, diacritic-preserving. Consumers lowercase incoming tokens.
export const NAME_LABELS = [
  // Lithuanian
  'vardas',
  'vardą',
  'vardo',
  'pavardė',
  'pavardes',
  'pavardė,',
  'vardas pavardė',
  'vardas, pavardė',
  'asmuo',
  'atstovas',
  'pareigūnas',
  // Latvian
  'vārds',
  'vards',
  'uzvārds',
  'uzvards',
  'vārds uzvārds',
  'personvārds',
  // English
  'name',
  'full name',
  'first name',
  'last name',
  'given name',
  'surname',
  'family name',
  // German
  'name',
  'vorname',
  'nachname',
  'familienname',
  'nachname, vorname',
  // Spanish
  'nombre',
  'apellido',
  'apellidos',
  'nombre y apellidos',
  'nombre completo',
];

// Multi-token label phrases that must match as a contiguous sequence of spans.
export const NAME_LABEL_PHRASES: string[][] = NAME_LABELS.filter((label) => label.includes(' ')).map(
  (label) => label.split(/\s+/).map((token) => stripTrailingPunctuation(token.toLowerCase())),
);

export const NAME_LABEL_SINGLE: Set<string> = new Set(
  NAME_LABELS.filter((label) => !label.includes(' ')).map((label) =>
    stripTrailingPunctuation(label.toLowerCase()),
  ),
);

// Signature labels — lowercased, dot-tolerant. Trigger visual sig detection.
export const SIGNATURE_LABELS: Set<string> = new Set([
  // Lithuanian
  'parašas',
  'parasas',
  'parašu',
  'pasirašyta',
  'pasirase',
  'pasirašė',
  // Latvian
  'paraksts',
  'parakstīts',
  'parakstits',
  // English
  'signature',
  'signed',
  'sign',
  // German
  'unterschrift',
  'unterzeichnet',
  'unterzeichnung',
  // Spanish
  'firma',
  'firmado',
  'firmada',
]);

// Lowercase connectors permitted inside a multi-token personal name.
export const NAME_CONNECTORS: Set<string> = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'le',
  'y',
  'e',
  'da',
  'di',
  'do',
  'dos',
  'das',
  'van',
  'von',
  'der',
  'den',
  'ter',
  'af',
  'al',
]);

// Capitalized tokens that look like names but are not — legal entity markers,
// country codes, honorifics handled separately. Lowercased for comparison.
export const NAME_STOPWORDS: Set<string> = new Set([
  // Legal entity markers
  'uab',
  'ab',
  'mb',
  'ub',
  'vši',
  'vsi',
  'asbl',
  'sia',
  'as',
  'ou',
  'oü',
  'ky',
  'ky.',
  'gmbh',
  'ag',
  'kg',
  'ohg',
  'eg',
  'ug',
  'sa',
  'sl',
  'slu',
  'sau',
  'sarl',
  'srl',
  'spa',
  'ltd',
  'inc',
  'llc',
  'corp',
  'plc',
  'bv',
  'nv',
  'oy',
  'aps',
  // Honorifics / titles
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'p',
  'p.',
  'pon',
  'pon.',
  'herr',
  'frau',
  'don',
  'doña',
  'dona',
  'sr',
  'sra',
  'srta',
  // Misc header words
  'page',
  'puslapis',
  'lapa',
  'seite',
  'página',
  'pagina',
  'tel',
  'tel.',
  'fax',
  'email',
  'e-mail',
  'www',
  'http',
  'https',
  // Common address/doc words (Lithuanian)
  'data',
  'adresas',
  'kodas',
  'dokumentas',
  'numeris',
  'sąskaita',
  'saskaita',
  'ataskaita',
]);

function stripTrailingPunctuation(value: string) {
  return value.replace(/[\s:;,.!?()[\]{}'"“”‘’«»]+$/u, '');
}

export { stripTrailingPunctuation };
