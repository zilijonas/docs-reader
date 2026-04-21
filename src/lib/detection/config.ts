export const READING_ORDER_LINE_THRESHOLD = 0.012;
export const SOURCE_CONFIDENCE_MERGE_THRESHOLD = 0.05;

export const CONFIDENCE = {
  email: 0.98,
  phone: 0.9,
  url: 0.9,
  iban: 0.97,
  card: 0.94,
  date: 0.7,
  id: 0.8,
  number: 0.5,
  postal: 0.85,
  address: 0.75,
  vat: 0.95,
  nationalId: 0.98,
  keyword: 0.85,
  manual: 1,
} as const;

export const TESSDATA_CDN =
  'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_best@main';
