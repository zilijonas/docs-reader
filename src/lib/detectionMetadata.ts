import type { DetectionType } from './types';

export const DETECTION_TYPE_ORDER: DetectionType[] = [
  'email',
  'phone',
  'url',
  'iban',
  'card',
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
  keyword: 'Custom keyword',
  manual: 'Manual',
};
