import { describe, expect, it } from 'vitest';

import { detectNames } from './names';
import { stripLithuanianSuffix, type LithuanianNameDataset } from './lt-morphology';
import type { TextSpan } from '../../types';

let spanCounter = 0;

const makeSpan = (text: string, x: number, y: number, width = 0.06, height = 0.03): TextSpan => {
  const id = `span_lt_${spanCounter++}`;
  return {
    id,
    pageIndex: 0,
    text,
    box: { x, y, width, height },
    source: 'native',
    confidence: 1,
    start: 0,
    end: text.length,
  };
};

const line = (tokens: string[], y: number, startX = 0.1, gap = 0.07): TextSpan[] =>
  tokens.map((token, index) => makeSpan(token, startX + index * gap, y));

const makeDataset = (names: string[]): LithuanianNameDataset => {
  const firstNames = new Set<string>();
  const firstNameStems = new Set<string>();
  for (const raw of names) {
    const cleaned = raw.normalize('NFC').toLowerCase();
    firstNames.add(cleaned);
    for (const stem of stripLithuanianSuffix(cleaned)) {
      if (stem.length >= 4 && stem !== cleaned) firstNameStems.add(stem);
    }
  }
  return { firstNames, firstNameStems };
};

describe('detectNames (Lithuanian)', () => {
  it('detects exact pair "Jonas Jonaitis"', () => {
    const dataset = makeDataset(['jonas']);
    const spans = line(['Jonas', 'Jonaitis'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const lt = detections.find((d) => d.snippet === 'Jonas Jonaitis');
    expect(lt).toBeTruthy();
    expect(lt!.confidence).toBeGreaterThanOrEqual(0.85);
    expect(lt!.source).toBe('heuristic');
  });

  it('detects inflected pair "Petro Petraičio"', () => {
    const dataset = makeDataset(['petras']);
    const spans = line(['Petro', 'Petraičio'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const lt = detections.find((d) => d.snippet === 'Petro Petraičio');
    expect(lt).toBeTruthy();
    expect(lt!.confidence).toBeCloseTo(0.8, 2);
  });

  it('detects female married "Žydrūnė Kazlauskienė"', () => {
    const dataset = makeDataset(['žydrūnė']);
    const spans = line(['Žydrūnė', 'Kazlauskienė'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    expect(detections.some((d) => d.snippet === 'Žydrūnė Kazlauskienė')).toBe(true);
  });

  it('detects female patronymic "Žydrūnė Kazlauskaitė"', () => {
    const dataset = makeDataset(['žydrūnė']);
    const spans = line(['Žydrūnė', 'Kazlauskaitė'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    expect(detections.some((d) => d.snippet === 'Žydrūnė Kazlauskaitė')).toBe(true);
  });

  it('detects 3-token "Manto Petro Jokubausko"', () => {
    const dataset = makeDataset(['mantas', 'petras']);
    const spans = line(['Manto', 'Petro', 'Jokubausko'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const lt = detections.find((d) => d.snippet === 'Manto Petro Jokubausko');
    expect(lt).toBeTruthy();
  });

  it('rejects solo first name without label', () => {
    const dataset = makeDataset(['jonas']);
    const spans = line(['Jonas', 'visited', 'the', 'office'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    expect(detections.some((d) => d.snippet === 'Jonas')).toBe(false);
  });

  it('label wins over LT heuristic on same name', () => {
    const dataset = makeDataset(['jonas']);
    const spans = line(['Vardas', 'Pavardė:', 'Jonas', 'Jonaitis'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const labelBased = detections.find((d) => d.confidence >= 0.9);
    expect(labelBased?.snippet).toBe('Jonas Jonaitis');
  });

  it('rejects medium-suffix surname when anchor is not a first name', () => {
    const dataset = makeDataset(['jonas']);
    // Vilnius + Kapstonas: neither a first-name match → no high-conf LT hit.
    const spans = line(['Vilnius', 'Kapstonas', 'hello'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const strong = detections.find((d) => d.confidence >= 0.8 && d.snippet.includes('Kapstonas'));
    expect(strong).toBeUndefined();
  });

  it('preserves prior behavior with null dataset (English pair fallback)', () => {
    const spans = line(['Alice', 'Johnson', 'visited', 'the', 'office'], 0.2);
    const detections = detectNames(0, spans, 'searchable', null);
    const capitalized = detections.find((d) => d.snippet === 'Alice Johnson');
    expect(capitalized).toBeTruthy();
    expect(capitalized!.confidence).toBeLessThan(0.85);
  });

  it('rejects short-stem Ona inflections (Ono, Onos)', () => {
    const dataset = makeDataset(['ona']);
    for (const first of ['Ono', 'Onos']) {
      const spans = line([first, 'Onaitis'], 0.2);
      const detections = detectNames(0, spans, 'searchable', dataset);
      expect(detections.find((d) => d.confidence >= 0.8)).toBeUndefined();
    }
  });

  it('rejects short-stem Ieva inflections (Ie, Ievos)', () => {
    const dataset = makeDataset(['ieva']);
    for (const first of ['Ie', 'Ievos']) {
      const spans = line([first, 'Petraitis'], 0.2);
      const detections = detectNames(0, spans, 'searchable', dataset);
      expect(detections.find((d) => d.confidence >= 0.8)).toBeUndefined();
    }
  });

  it('rejects short-stem Lina inflections (Lin, Linos)', () => {
    const dataset = makeDataset(['lina']);
    for (const first of ['Lin', 'Linos']) {
      const spans = line([first, 'Jonaitis'], 0.2);
      const detections = detectNames(0, spans, 'searchable', dataset);
      expect(detections.find((d) => d.confidence >= 0.8)).toBeUndefined();
    }
  });

  it('rejects short-stem Rasa inflections (Ras, Rasos)', () => {
    const dataset = makeDataset(['rasa']);
    for (const first of ['Ras', 'Rasos']) {
      const spans = line([first, 'Kazlauskas'], 0.2);
      const detections = detectNames(0, spans, 'searchable', dataset);
      expect(detections.find((d) => d.confidence >= 0.8)).toBeUndefined();
    }
  });

  it('LT pair suppresses capitalized fallback on the same span', () => {
    const dataset = makeDataset(['jonas']);
    const spans = line(['Jonas', 'Jonaitis'], 0.2);
    const detections = detectNames(0, spans, 'searchable', dataset);
    const ltHits = detections.filter((d) => d.snippet === 'Jonas Jonaitis');
    expect(ltHits).toHaveLength(1);
  });

  it('rejects Lithuanian legal/government phrases as names', () => {
    const dataset = makeDataset(['jonas', 'linas', 'kestutis']);
    const samples = [
      ['vadovaujantis', 'Lietuvos', 'Respublikos', 'civilinio', 'kodekso'],
      ['Valstybinės', 'kelių', 'transporto', 'inspekcijos', 'prie', 'Susisiekimo'],
      ['Vadovaudamiesi', 'Lietuvos', 'Respublikos', 'saugaus', 'eismo', 'automobilių'],
      ['jiems', 'yra', 'žinoma,', 'jog', 'Lietuvos', 'Respublikos', 'kelių'],
      ['TRANSPORTO', 'PRIEMONĖS', 'PIRKIMO-PARDAVIMO', 'SUTARTIS'],
    ];

    for (const tokens of samples) {
      const detections = detectNames(0, line(tokens, 0.2), 'searchable', dataset);
      expect(detections).toHaveLength(0);
    }
  });
});
