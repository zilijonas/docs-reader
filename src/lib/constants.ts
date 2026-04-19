export const APP_LIMITS = {
  maxPages: 30,
  maxFileSizeMb: 25,
  previewScale: 1.35,
  exportScale: 2,
  ocrScale: 2,
  minTextSpanCountForNativeText: 8,
  minTextCharactersForNativeText: 64,
} as const;

export const DETECTION_TYPE_LABELS = {
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  iban: 'IBAN',
  card: 'Card number',
  date: 'Date',
  id: 'ID',
  number: 'Number',
  keyword: 'Custom keyword',
  manual: 'Manual',
} as const;

export const PRIVACY_PROMISE = [
  'Documents stay in your browser. Nothing is uploaded to an app server.',
  'Pyodide, PyMuPDF, and OCR assets are served with the app so processing stays local at runtime.',
  'Review every suggestion before exporting. Detection is assistive, not guaranteed.',
] as const;

export const FILE_ACCEPT = 'application/pdf';
