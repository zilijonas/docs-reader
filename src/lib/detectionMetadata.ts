import type { DetectionType } from './types';

export const DETECTION_TYPE_ORDER: DetectionType[] = [
  'email',
  'phone',
  'url',
  'iban',
  'card',
  'nationalId',
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
  date: 'Date',
  id: 'ID',
  number: 'Number',
  postal: 'Postal code',
  address: 'Address',
  vat: 'VAT number',
  nationalId: 'National ID',
  keyword: 'Custom keyword',
  manual: 'Manual',
};
