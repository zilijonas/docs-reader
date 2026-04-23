import { CONFIDENCE } from '../config';
import type { DetectionRule } from '../rule';
import {
  isBsnValid,
  isCodiceFiscaleValid,
  isDniValid,
  isEstonianPersonalCodeValid,
  isGermanSteuerIdValid,
  isLithuanianPersonalCodeValid,
  isNinoValid,
  isNirValid,
  isPeselValid,
} from '../../validators';

export const NATIONAL_ID_RULES: DetectionRule[] = [
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])[1-6]\d{10}(?![\d\w])/g,
    confidence: CONFIDENCE.nationalId,
    postFilter: isLithuanianPersonalCodeValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{6}-\d{5}(?![\d\w])/g,
    confidence: 0.95,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])[1-8]\d{10}(?![\d\w])/g,
    confidence: 0.95,
    postFilter: isEstonianPersonalCodeValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{11}(?![\d\w])/g,
    confidence: 0.95,
    postFilter: isPeselValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{8,9}(?![\d\w])/g,
    confidence: 0.88,
    postFilter: isBsnValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\d\w])\d{11}(?![\d\w])/g,
    confidence: 0.9,
    postFilter: isGermanSteuerIdValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\w\d])[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z](?![\w\d])/gi,
    confidence: 0.97,
    postFilter: isCodiceFiscaleValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\w\d])(?:[XYZ]\d{7}|\d{8})[A-Z](?![\w\d])/gi,
    confidence: 0.95,
    postFilter: isDniValid,
  },
  {
    type: 'nationalId',
    pattern:
      /(?<![\w\d])[12]\s?\d{2}\s?(?:0[1-9]|1[0-2])\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}\s?\d{2}(?![\w\d])/gi,
    confidence: 0.96,
    postFilter: isNirValid,
  },
  {
    type: 'nationalId',
    pattern: /(?<![\w\d])[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D](?![\w\d])/g,
    confidence: 0.95,
    postFilter: isNinoValid,
  },
];
