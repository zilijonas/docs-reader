import { describe, expect, it } from 'vitest';

import type { PageAsset } from '../types';
import { inferOcrLanguagesFromText, planOcrLanguageFlow } from './ocr-language-inference';

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
    });
  });

  it('requires manual selection for scanned-only PDFs', () => {
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
    });
  });
});
