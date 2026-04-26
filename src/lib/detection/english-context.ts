import type { TextSpan } from '../../types';

const FOREIGN_DIACRITIC_RE =
  /[ąčęėįšųūžĄČĘĖĮŠŲŪŽäöüßÄÖÜáéíñóúü¿¡ÁÉÍÑÓÚÜćłńóśźżĆŁŃÓŚŹŻâêîôûÂÊÎÔÛàèìòùÀÈÌÒÙа-яА-ЯёЁ]/u;

const ENGLISH_LABEL_TOKENS = new Set<string>([
  'name',
  'first',
  'last',
  'author',
  'authored',
  'by',
  'signed',
  'sincerely',
  'regards',
  'yours',
  'customer',
  'patient',
  'client',
  'buyer',
  'seller',
  'employee',
  'tenant',
  'landlord',
  'recipient',
  'sender',
  'dear',
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
]);

const stripPunctLower = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}'"“”‘’«»]+$/u, '');

// Decide whether a page is English-like enough to run compromise validation.
// Two signals, either is sufficient:
//   - the page contains a recognised English name-context cue word, OR
//   - the page is mostly ASCII Latin with no foreign diacritics.
export const isEnglishLikePage = (spans: TextSpan[]): boolean => {
  if (spans.length === 0) return false;

  let foreignChars = 0;
  let asciiLetterChars = 0;
  let totalLetterChars = 0;
  let hasEnglishLabel = false;

  for (const span of spans) {
    const text = span.text;
    if (!text) continue;
    if (!hasEnglishLabel) {
      const lower = stripPunctLower(text);
      if (lower && ENGLISH_LABEL_TOKENS.has(lower)) {
        hasEnglishLabel = true;
      }
    }
    for (const ch of text) {
      if (FOREIGN_DIACRITIC_RE.test(ch)) {
        foreignChars += 1;
        totalLetterChars += 1;
      } else if (/[A-Za-z]/.test(ch)) {
        asciiLetterChars += 1;
        totalLetterChars += 1;
      } else if (/\p{L}/u.test(ch)) {
        totalLetterChars += 1;
      }
    }
  }

  if (hasEnglishLabel) return true;
  if (totalLetterChars < 20) return false;

  const asciiRatio = asciiLetterChars / totalLetterChars;
  const foreignRatio = foreignChars / totalLetterChars;
  return asciiRatio >= 0.85 && foreignRatio < 0.02;
};
