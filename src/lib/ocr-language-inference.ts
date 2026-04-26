import { DEFAULT_OCR_LANGUAGES } from './app-config';
import type { PageAsset } from '../types';
import type { OcrLanguageDetection } from '../types/worker';

const MAX_EXTRA_LANGUAGES = 3;
const MIN_BOOTSTRAP_LETTERS = 50;
const MIN_BOOTSTRAP_SCORE = 0.6;
const MIN_BOOTSTRAP_MARGIN = 0.15;
const GREEK_REGEX = /\p{Script=Greek}/gu;
const CYRILLIC_REGEX = /\p{Script=Cyrillic}/gu;
const SHARED_SCORE_THRESHOLD = 1.2;

const LANGUAGE_SPECIAL_CHARS = {
  deu: 'äöüß',
  fra: 'àâæçéèêëîïôœùûüÿ',
  spa: 'áéíñóúü',
  ita: 'àèéìíîòóùú',
  por: 'ãáâàçéêíóôõúü',
  nld: 'ëïöüáéèíó',
  pol: 'ąćęłńóśźż',
  lit: 'ąčęėįšųūž',
  lav: 'āčēģīķļņšūž',
  est: 'äöõü',
  swe: 'åäö',
  dan: 'æøå',
  nor: 'æøå',
  fin: 'äöå',
  ces: 'áčďéěíňóřšťúůýž',
  slk: 'áäčďéíĺľňóôŕšťúýž',
  hun: 'áéíóöőúüű',
  ron: 'ăâîșşșțţț',
  hrv: 'čćđšž',
  slv: 'čšž',
  tur: 'çğışöü',
} as const satisfies Record<string, string>;

const languageEntries = Object.entries(LANGUAGE_SPECIAL_CHARS);
const characterFrequency = languageEntries.reduce<Record<string, number>>(
  (counts, [, characters]) => {
    Array.from(new Set(Array.from(characters))).forEach((character) => {
      counts[character] = (counts[character] ?? 0) + 1;
    });
    return counts;
  },
  {},
);

const FRANC_TO_TESSERACT_LANGUAGE = {
  bul: 'bul',
  ces: 'ces',
  dan: 'dan',
  deu: 'deu',
  ell: 'ell',
  eng: 'eng',
  est: 'est',
  fin: 'fin',
  fra: 'fra',
  hrv: 'hrv',
  hun: 'hun',
  ita: 'ita',
  lav: 'lav',
  lit: 'lit',
  nld: 'nld',
  nob: 'nor',
  nno: 'nor',
  nor: 'nor',
  pol: 'pol',
  por: 'por',
  ron: 'ron',
  slk: 'slk',
  slv: 'slv',
  spa: 'spa',
  swe: 'swe',
  tur: 'tur',
} as const satisfies Record<string, string>;

const FRANC_ONLY_LANGUAGES = Object.keys(FRANC_TO_TESSERACT_LANGUAGE);

const countMatches = (text: string, regex: RegExp) => {
  const matches = text.match(regex);
  return matches?.length ?? 0;
};

const collectSearchableText = (pages: PageAsset[]) =>
  pages
    .filter((page) => page.lane === 'searchable')
    .map((page) => page.textContent.trim())
    .filter(Boolean)
    .join(' ');

export const inferOcrLanguagesFromText = (
  text: string,
  maxExtraLanguages = MAX_EXTRA_LANGUAGES,
): string[] => {
  const normalized = text.toLocaleLowerCase();
  const scores = new Map<string, number>();

  const greekCount = countMatches(normalized, GREEK_REGEX);
  if (greekCount > 0) {
    scores.set('ell', greekCount);
  }

  const cyrillicCount = countMatches(normalized, CYRILLIC_REGEX);
  if (cyrillicCount > 0) {
    scores.set('bul', cyrillicCount);
  }

  languageEntries.forEach(([language, characters]) => {
    let uniqueMatches = 0;
    const score = Array.from(characters).reduce((sum, character) => {
      const occurrences = normalized.split(character).length - 1;
      if (occurrences <= 0) {
        return sum;
      }

      if ((characterFrequency[character] ?? 0) === 1) {
        uniqueMatches += occurrences;
      }

      return sum + occurrences * (1 / (characterFrequency[character] ?? 1));
    }, 0);

    if (uniqueMatches > 0 || score >= SHARED_SCORE_THRESHOLD) {
      scores.set(language, (scores.get(language) ?? 0) + score);
    }
  });

  const extraLanguages = [...scores.entries()]
    .filter(([language, score]) => language !== 'eng' && score > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, maxExtraLanguages)
    .map(([language]) => language);

  return [...DEFAULT_OCR_LANGUAGES, ...extraLanguages];
};

export const normalizeBootstrapText = (text: string) => text.replace(/\s+/g, ' ').trim();

export const countBootstrapLetters = (text: string) => text.match(/\p{Letter}/gu)?.length ?? 0;

export const mapFrancLanguageToTesseract = (language: string) =>
  FRANC_TO_TESSERACT_LANGUAGE[language as keyof typeof FRANC_TO_TESSERACT_LANGUAGE] ?? null;

export const resolveFrancLanguageDetection = (
  candidates: Array<[string, number]>,
): OcrLanguageDetection => {
  const normalizedCandidates: Array<{ language: string; score: number }> = candidates.flatMap(
    ([language, score]) => {
      const mappedLanguage = mapFrancLanguageToTesseract(language);
      return mappedLanguage
        ? [
            {
              language: mappedLanguage,
              score,
            },
          ]
        : [];
    },
  );

  const dedupedCandidates = [...normalizedCandidates]
    .sort((left, right) => right.score - left.score)
    .reduce<Array<{ language: string; score: number }>>((items, candidate) => {
      if (!items.some((item) => item.language === candidate.language)) {
        items.push(candidate);
      }
      return items;
    }, []);

  const top = dedupedCandidates[0];
  const runnerUp = dedupedCandidates.find((candidate) => candidate.language !== top?.language);
  const margin = top ? top.score - (runnerUp?.score ?? 0) : 0;
  const hasUsableMatch =
    Boolean(top) && top.score >= MIN_BOOTSTRAP_SCORE && margin >= MIN_BOOTSTRAP_MARGIN;

  const confidence = !top
    ? 'low'
    : top.score >= 0.8 && margin >= 0.25
      ? 'high'
      : hasUsableMatch
        ? 'medium'
        : 'low';
  const languages =
    hasUsableMatch && top && top.language !== 'eng'
      ? ['eng', top.language]
      : [...DEFAULT_OCR_LANGUAGES];

  return {
    method: 'bootstrap-ocr',
    languages,
    confidence,
    detectedLanguage: top?.language,
    candidates: dedupedCandidates.slice(0, 5),
  };
};

export const detectOcrLanguagesFromBootstrapText = async (
  text: string,
  samplePageIndexes: number[],
): Promise<OcrLanguageDetection> => {
  const normalizedText = normalizeBootstrapText(text);
  if (countBootstrapLetters(normalizedText) < MIN_BOOTSTRAP_LETTERS) {
    return {
      method: 'bootstrap-ocr',
      languages: [...DEFAULT_OCR_LANGUAGES],
      confidence: 'low',
      samplePageIndexes,
      candidates: [],
    };
  }

  const { francAll } = await import('franc');
  const detection = resolveFrancLanguageDetection(
    francAll(normalizedText, {
      minLength: MIN_BOOTSTRAP_LETTERS,
      only: FRANC_ONLY_LANGUAGES,
    }),
  );

  return {
    ...detection,
    samplePageIndexes,
  };
};

export const planOcrLanguageFlow = (pages: PageAsset[]) => {
  const ocrPages = pages.filter((page) => page.lane === 'ocr');
  const searchableText = collectSearchableText(pages);
  const hasSearchableText = searchableText.trim().length > 0;
  const resolvedLanguages = inferOcrLanguagesFromText(searchableText);
  const ocrLanguageDetection: OcrLanguageDetection = {
    method: hasSearchableText ? 'searchable-text' : 'default',
    languages: resolvedLanguages,
    confidence: resolvedLanguages.length > DEFAULT_OCR_LANGUAGES.length ? 'medium' : 'low',
    detectedLanguage:
      resolvedLanguages.find((language) => !DEFAULT_OCR_LANGUAGES.includes(language)) ??
      DEFAULT_OCR_LANGUAGES[0],
  };

  return {
    hasOcrPages: ocrPages.length > 0,
    needsLanguageSelection: ocrPages.length > 0 && !hasSearchableText,
    resolvedLanguages,
    ocrLanguageDetection,
  };
};
