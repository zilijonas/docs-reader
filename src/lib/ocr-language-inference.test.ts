import { describe, expect, it } from 'vitest';

import type { PageAsset } from '../types';
import {
  detectOcrLanguagesFromBootstrapText,
  inferOcrLanguagesFromText,
  mapFrancLanguageToTesseract,
  planOcrLanguageFlow,
  resolveFrancLanguageDetection,
} from './ocr-language-inference';

const createPage = (overrides: Partial<PageAsset>): PageAsset => ({
  pageIndex: 0,
  width: 800,
  height: 1000,
  lane: 'searchable',
  previewScale: 1.35,
  textLayerStatus: 'native',
  ocrStatus: 'skipped',
  textContent: '',
  charCount: 0,
  spanCount: 0,
  ...overrides,
});

describe('inferOcrLanguagesFromText', () => {
  it('detects Lithuanian diacritics', () => {
    expect(inferOcrLanguagesFromText('ą č ę ė į š ų ū ž')).toEqual(['eng', 'lit']);
  });

  it('detects Greek script', () => {
    expect(inferOcrLanguagesFromText('Αθήνα και Θεσσαλονίκη')).toEqual(['eng', 'ell']);
  });

  it('detects Cyrillic script as Bulgarian OCR fallback', () => {
    expect(inferOcrLanguagesFromText('София и Пловдив')).toEqual(['eng', 'bul']);
  });

  it('keeps English only for ASCII-only text', () => {
    expect(inferOcrLanguagesFromText('Account number and mailing address')).toEqual(['eng']);
  });

  it('caps extra languages to the top three scores', () => {
    const result = inferOcrLanguagesFromText('ąčęėįšųūž Αθήνα Σέρρες çğışöü áčďéěíňóřšťúůýž š š š');

    expect(result[0]).toBe('eng');
    expect(result).toHaveLength(4);
    expect(result.slice(1).sort()).toEqual(['ces', 'ell', 'lit']);
  });
});

describe('resolveFrancLanguageDetection', () => {
  it('maps ISO language codes to Tesseract codes', () => {
    expect(mapFrancLanguageToTesseract('lit')).toBe('lit');
    expect(mapFrancLanguageToTesseract('nob')).toBe('nor');
    expect(mapFrancLanguageToTesseract('nno')).toBe('nor');
  });

  it('selects a supported non-English language when confidence is usable', () => {
    expect(
      resolveFrancLanguageDetection([
        ['lit', 0.74],
        ['lav', 0.51],
        ['eng', 0.2],
      ]),
    ).toMatchObject({
      method: 'bootstrap-ocr',
      languages: ['eng', 'lit'],
      confidence: 'medium',
      detectedLanguage: 'lit',
    });
  });

  it('keeps English only when the score margin is too low', () => {
    expect(
      resolveFrancLanguageDetection([
        ['lit', 0.7],
        ['lav', 0.62],
      ]),
    ).toMatchObject({
      languages: ['eng'],
      confidence: 'low',
      detectedLanguage: 'lit',
    });
  });

  it('dedupes mapped Norwegian variants', () => {
    const result = resolveFrancLanguageDetection([
      ['nob', 0.82],
      ['nno', 0.72],
      ['dan', 0.2],
    ]);

    expect(result.languages).toEqual(['eng', 'nor']);
    expect(result.candidates?.filter((candidate) => candidate.language === 'nor')).toHaveLength(1);
  });

  it('falls back to English for unsupported or undetected results', () => {
    expect(
      resolveFrancLanguageDetection([
        ['und', 1],
        ['zzz', 0.9],
      ]),
    ).toMatchObject({
      languages: ['eng'],
      confidence: 'low',
    });
  });
});

describe('detectOcrLanguagesFromBootstrapText', () => {
  it('does not run language detection when OCR text is too short', async () => {
    await expect(detectOcrLanguagesFromBootstrapText('Invoice 123', [0])).resolves.toMatchObject({
      languages: ['eng'],
      confidence: 'low',
      samplePageIndexes: [0],
      candidates: [],
    });
  });
});

describe('planOcrLanguageFlow', () => {
  it('auto-runs OCR when searchable text exists', () => {
    const plan = planOcrLanguageFlow([
      createPage({
        lane: 'searchable',
        textContent: 'ą č ę ė į š ų ū ž',
        charCount: 17,
        spanCount: 9,
      }),
      createPage({
        pageIndex: 1,
        lane: 'ocr',
        textLayerStatus: 'missing',
        ocrStatus: 'queued',
      }),
    ]);

    expect(plan).toEqual({
      hasOcrPages: true,
      needsLanguageSelection: false,
      resolvedLanguages: ['eng', 'lit'],
      ocrLanguageDetection: {
        method: 'searchable-text',
        languages: ['eng', 'lit'],
        confidence: 'medium',
        detectedLanguage: 'lit',
      },
    });
  });

  it('marks scanned-only PDFs for bootstrap language detection', () => {
    const plan = planOcrLanguageFlow([
      createPage({
        lane: 'ocr',
        textLayerStatus: 'missing',
        ocrStatus: 'queued',
      }),
      createPage({
        pageIndex: 1,
        lane: 'ocr',
        textLayerStatus: 'missing',
        ocrStatus: 'queued',
      }),
    ]);

    expect(plan).toEqual({
      hasOcrPages: true,
      needsLanguageSelection: true,
      resolvedLanguages: ['eng'],
      ocrLanguageDetection: {
        method: 'default',
        languages: ['eng'],
        confidence: 'low',
        detectedLanguage: 'eng',
      },
    });
  });
});
