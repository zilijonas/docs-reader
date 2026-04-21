import { DEFAULT_OCR_LANGUAGES } from './app-config';
import type { PageAsset } from '../types';

const MAX_EXTRA_LANGUAGES = 3;
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
const characterFrequency = languageEntries.reduce<Record<string, number>>((counts, [, characters]) => {
  Array.from(new Set(Array.from(characters))).forEach((character) => {
    counts[character] = (counts[character] ?? 0) + 1;
  });
  return counts;
}, {});

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

export const inferOcrLanguagesFromText = (text: string, maxExtraLanguages = MAX_EXTRA_LANGUAGES): string[] => {
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

export const planOcrLanguageFlow = (pages: PageAsset[]) => {
  const ocrPages = pages.filter((page) => page.lane === 'ocr');
  const searchableText = collectSearchableText(pages);
  const hasSearchableText = searchableText.trim().length > 0;
  const resolvedLanguages = inferOcrLanguagesFromText(searchableText);

  return {
    hasOcrPages: ocrPages.length > 0,
    needsLanguageSelection: ocrPages.length > 0 && !hasSearchableText,
    resolvedLanguages,
  };
};
