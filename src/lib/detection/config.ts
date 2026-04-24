export const READING_ORDER_LINE_THRESHOLD = 0.012;
export const SOURCE_CONFIDENCE_MERGE_THRESHOLD = 0.05;

export const CONFIDENCE = {
  email: 0.98,
  phone: 0.9,
  url: 0.95,
  iban: 0.97,
  card: 0.9,
  licensePlate: 0.84,
  date: 0.86,
  id: 0.88,
  number: 0.72,
  postal: 0.82,
  address: 0.72,
  vat: 0.9,
  nationalId: 0.98,
  keyword: 0.99,
  manual: 1,
} as const;

export const BOX_CLOSENESS_THRESHOLD = 0.012;
export const OVERLAP_RATIO_THRESHOLD = 0.8;

export const TESSDATA_CDN = 'https://tessdata.projectnaptha.com/4.0.0_fast';
