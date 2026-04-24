import { NAME_STOPWORDS, stripTrailingPunctuation } from './locales/name-labels';

export interface LithuanianNameDataset {
  firstNames: Set<string>;
  firstNameStems?: Set<string>;
}

// LT declension endings, longest first. Stripping short suffixes blindly
// would collapse many non-names into dataset hits, so we cap the strip
// depth at one ending per token.
export const LT_CASE_SUFFIXES: string[] = [
  'iams',
  'iems',
  'ioms',
  'ėmis',
  'omis',
  'ėje',
  'oje',
  'yje',
  'ūms',
  'ams',
  'oms',
  'aus',
  'eis',
  'ies',
  'iui',
  'ius',
  'ioje',
  'iai',
  'ios',
  'ėms',
  'emis',
  'iau',
  'io',
  'iu',
  'ių',
  'ei',
  'ės',
  'ui',
  'ai',
  'os',
  'us',
  'as',
  'is',
  'ys',
  'es',
  'ą',
  'ę',
  'į',
  'o',
  'u',
  'a',
  'ė',
  'e',
  'i',
  'y',
  'ų',
];

const sortedCaseSuffixes = [...LT_CASE_SUFFIXES].sort((a, b) => b.length - a.length);

export const LT_SURNAME_STRONG_SUFFIXES: string[] = [
  // Male patronymic
  'aitis',
  'ytis',
  'utis',
  'aičio',
  'yčio',
  'učio',
  'aičiui',
  'yčiui',
  'učiui',
  'aičiai',
  'yčiai',
  'učiai',
  'aičių',
  'aitį',
  'ytį',
  'utį',
  // Female patronymic (unmarried) + inflected
  'aitė',
  'ytė',
  'utė',
  'aitės',
  'ytės',
  'utės',
  'aitei',
  'aitę',
  'aite',
  'ūtės',
  'ūtei',
  'ūtė',
  'iūtė',
  'iūtės',
  'iūtei',
  'iūtę',
  // Female married + inflected
  'ienė',
  'ienės',
  'ienei',
  'ienę',
  'iene',
  'ienėms',
  'ienėje',
  'ienių',
  // -auskas family
  'auskas',
  'ausko',
  'auskui',
  'auską',
  'auske',
  'auskai',
  'auskų',
  'auskienė',
  'auskienės',
  'auskienei',
  'auskienę',
  'auskaitė',
  'auskaitės',
  'auskaitei',
  'auskaitę',
  'auskaičio',
  'auskaičiai',
  // -evičius family
  'evičius',
  'evičiaus',
  'evičiui',
  'evičių',
  'evičienė',
  'evičienės',
  'evičienei',
  'evičienę',
  'evičiūtė',
  'evičiūtės',
  'evičiūtei',
  'evičiūtę',
  // -avičius family
  'avičius',
  'avičiaus',
  'avičiui',
  'avičių',
  'avičienė',
  'avičienės',
  'avičienei',
  'avičienę',
  'avičiūtė',
  'avičiūtės',
  'avičiūtei',
  'avičiūtę',
];

const sortedStrongSurnameSuffixes = [...LT_SURNAME_STRONG_SUFFIXES].sort(
  (a, b) => b.length - a.length,
);

export const LT_SURNAME_MEDIUM_SUFFIXES: string[] = ['as', 'is', 'ys', 'us', 'os', 'ės'];

const HAS_DIGIT_RE = /\d/u;
const MIN_FIRST_NAME_LENGTH = 4;
const MIN_FIRST_NAME_STEM_LENGTH = 4;
const MIN_SURNAME_LENGTH = 5;

const normalizeToken = (raw: string) =>
  stripTrailingPunctuation(raw.trim())
    .normalize('NFC')
    .toLowerCase();

export const stripLithuanianSuffix = (token: string): string[] => {
  const stems: string[] = [];
  for (const suffix of sortedCaseSuffixes) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      stems.push(token.slice(0, token.length - suffix.length));
    }
  }
  stems.push(token);
  return stems;
};

export const isLikelyLithuanianFirstName = (
  token: string,
  dataset: LithuanianNameDataset | null,
): { match: boolean; exact: boolean } => {
  if (!dataset) return { match: false, exact: false };
  const cleaned = normalizeToken(token);
  if (!cleaned || cleaned.length < MIN_FIRST_NAME_LENGTH) return { match: false, exact: false };
  if (HAS_DIGIT_RE.test(cleaned)) return { match: false, exact: false };
  if (NAME_STOPWORDS.has(cleaned)) return { match: false, exact: false };

  if (dataset.firstNames.has(cleaned)) {
    return { match: true, exact: true };
  }

  const stems = stripLithuanianSuffix(cleaned);
  for (const stem of stems) {
    if (stem.length < MIN_FIRST_NAME_STEM_LENGTH) continue;
    if (stem === cleaned) continue;
    if (dataset.firstNames.has(stem)) {
      return { match: true, exact: false };
    }
  }

  if (dataset.firstNameStems) {
    for (const stem of stems) {
      if (stem.length < MIN_FIRST_NAME_STEM_LENGTH) continue;
      if (stem === cleaned) continue;
      if (dataset.firstNameStems.has(stem)) {
        return { match: true, exact: false };
      }
    }
  }
  return { match: false, exact: false };
};

export const isLikelyLithuanianSurname = (
  token: string,
): { strong: boolean; medium: boolean } => {
  const cleaned = normalizeToken(token);
  if (!cleaned || cleaned.length < MIN_SURNAME_LENGTH) return { strong: false, medium: false };
  if (HAS_DIGIT_RE.test(cleaned)) return { strong: false, medium: false };
  if (NAME_STOPWORDS.has(cleaned)) return { strong: false, medium: false };

  for (const suffix of sortedStrongSurnameSuffixes) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 1) {
      return { strong: true, medium: false };
    }
  }

  for (const suffix of LT_SURNAME_MEDIUM_SUFFIXES) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      return { strong: false, medium: true };
    }
  }

  return { strong: false, medium: false };
};
