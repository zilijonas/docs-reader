import type { DetectionType } from '../types';

export const APP_LIMITS = {
  maxPages: 30,
  maxFileSizeMb: 25,
  previewScale: 1.35,
  exportScale: 2,
  ocrScale: 2,
  minTextSpanCountForNativeText: 8,
  minTextCharactersForNativeText: 64,
  // Garbled-text fallback thresholds. A page that meets the basic span /
  // char counts but produces letter sequences with too few lowercase
  // letters and too few vowel-bearing tokens is treated as a corrupt
  // text layer and routed through OCR instead. See pyodide.ts.
  // A page is treated as garbled when *both* the lowercase-letter ratio
  // and the vowel-bearing-token ratio are below their thresholds. The
  // numbers below are tuned against the real test corpus: legitimate
  // ALL-CAPS itinerary pages have low lowercase but still high vowel
  // ratio (>0.85), while broken-CMap PDFs collapse on both signals.
  nativeTextMinLowercaseRatio: 0.1,
  nativeTextMinVowelTokenRatio: 0.7,
  nativeTextGarbledMinLetters: 40,
} as const;

export const PRIVACY_PROMISE = [
  'Documents stay in your browser during processing. Nothing is uploaded to an app server.',
  'Google Analytics may collect site usage metrics, but document contents are not sent there.',
  'Pyodide, PyMuPDF, and OCR assets are served with the app so processing stays local at runtime.',
  'Review every suggestion before exporting. Detection is assistive, not guaranteed.',
] as const;

export const FILE_ACCEPT = 'application/pdf';

export const OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'deu', label: 'German' },
  { code: 'fra', label: 'French' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'nld', label: 'Dutch' },
  { code: 'pol', label: 'Polish' },
  { code: 'lit', label: 'Lithuanian' },
  { code: 'lav', label: 'Latvian' },
  { code: 'est', label: 'Estonian' },
  { code: 'swe', label: 'Swedish' },
  { code: 'dan', label: 'Danish' },
  { code: 'nor', label: 'Norwegian' },
  { code: 'fin', label: 'Finnish' },
  { code: 'ces', label: 'Czech' },
  { code: 'slk', label: 'Slovak' },
  { code: 'hun', label: 'Hungarian' },
  { code: 'ron', label: 'Romanian' },
  { code: 'ell', label: 'Greek' },
  { code: 'bul', label: 'Bulgarian' },
  { code: 'hrv', label: 'Croatian' },
  { code: 'slv', label: 'Slovenian' },
  { code: 'tur', label: 'Turkish' },
] as const;

export const DEFAULT_OCR_LANGUAGES: string[] = ['eng'];

export const ANALYTICS = {
  enabled: import.meta.env.PROD,
  measurementId: import.meta.env.PUBLIC_GA_MEASUREMENT_ID || 'G-X1ZEX4LY01',
} as const;

export const DETECTION_TYPE_ORDER: DetectionType[] = [
  'email',
  'phone',
  'url',
  'iban',
  'card',
  'licensePlate',
  'nationalId',
  'name',
  'signature',
  'vat',
  'postal',
  'address',
  'date',
  'id',
  'number',
  'keyword',
  'manual',
];

export const DETECTION_TYPE_LABELS: Record<DetectionType, string> = {
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  iban: 'IBAN',
  card: 'Card number',
  licensePlate: 'License plate',
  date: 'Date',
  id: 'ID',
  number: 'Number',
  postal: 'Postal code',
  address: 'Address',
  vat: 'VAT number',
  nationalId: 'National ID',
  name: 'Name',
  signature: 'Signature',
  keyword: 'Custom keyword',
  manual: 'Manual',
};
