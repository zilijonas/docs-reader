import { describe, expect, it } from 'vitest';

import { detectSensitiveData, groupDetections } from './detection';
import { dedupeDetections } from './utils';
import type { TextSpan } from '../types';

const spans: TextSpan[] = [
  {
    id: 'span_0',
    pageIndex: 0,
    text: 'alice@example.com',
    box: { x: 0.1, y: 0.1, width: 0.2, height: 0.04 },
    source: 'native',
    confidence: 1,
    start: 0,
    end: 17,
  },
  {
    id: 'span_1',
    pageIndex: 0,
    text: 'Call',
    box: { x: 0.1, y: 0.2, width: 0.05, height: 0.04 },
    source: 'native',
    confidence: 1,
    start: 18,
    end: 22,
  },
  {
    id: 'span_2',
    pageIndex: 0,
    text: '+1 202 555 0101',
    box: { x: 0.17, y: 0.2, width: 0.2, height: 0.04 },
    source: 'native',
    confidence: 1,
    start: 23,
    end: 38,
  },
];

describe('detectSensitiveData', () => {
  it('detects rule matches and normalizes snippets', () => {
    const detections = detectSensitiveData(0, 'alice@example.com Call +1 202 555 0101', spans, [
      'Call',
    ]);
    const types = detections.map((detection) => detection.type);

    expect(types).toContain('email');
    expect(types).toContain('phone');
    expect(types).toContain('keyword');
    expect(detections.every((detection) => detection.normalizedSnippet.length > 0)).toBe(true);
  });

  it('shrinks detections to the smallest matching span window when range mapping drifts wide', () => {
    const driftedSpans: TextSpan[] = [
      {
        id: 'span_0',
        pageIndex: 0,
        text: 'Kodas',
        box: { x: 0.08, y: 0.24, width: 0.1, height: 0.05 },
        source: 'native',
        confidence: 1,
        start: 0,
        end: 5,
      },
      {
        id: 'span_1',
        pageIndex: 0,
        text: 'adresas',
        box: { x: 0.2, y: 0.24, width: 0.18, height: 0.05 },
        source: 'native',
        confidence: 1,
        start: 6,
        end: 13,
      },
      {
        id: 'span_2',
        pageIndex: 0,
        text: '110051834',
        box: { x: 0.62, y: 0.245, width: 0.16, height: 0.05 },
        source: 'native',
        confidence: 1,
        start: 14,
        end: 22,
      },
    ];

    const detections = detectSensitiveData(0, 'Kodas adresas 110051834', driftedSpans);
    const numberDetection = detections.find(
      (detection) => detection.normalizedSnippet === '110051834',
    );

    expect(numberDetection?.box.x).toBeCloseTo(0.62);
    expect(numberDetection?.box.y).toBeCloseTo(0.245);
    expect(numberDetection?.box.width).toBeCloseTo(0.16);
    expect(numberDetection?.box.height).toBeCloseTo(0.05);
  });
});

describe('groupDetections', () => {
  it('adds stable group ids and match counts for repeated matches', () => {
    const grouped = groupDetections([
      {
        id: 'a',
        type: 'email',
        label: 'Email',
        pageIndex: 0,
        box: { x: 0.1, y: 0.1, width: 0.2, height: 0.04 },
        snippet: 'alice@example.com',
        normalizedSnippet: 'alice@example.com',
        source: 'rule',
        confidence: 0.98,
        status: 'unconfirmed',
      },
      {
        id: 'b',
        type: 'email',
        label: 'Email',
        pageIndex: 1,
        box: { x: 0.2, y: 0.3, width: 0.2, height: 0.04 },
        snippet: 'alice@example.com',
        normalizedSnippet: 'alice@example.com',
        source: 'rule',
        confidence: 0.98,
        status: 'unconfirmed',
      },
    ]);

    expect(grouped[0].groupId).toBe(grouped[1].groupId);
    expect(grouped[0].matchCount).toBe(2);
    expect(grouped[1].matchCount).toBe(2);
  });
});

describe('detectSensitiveData multi-locale', () => {
  const makeSpan = (id: string, text: string, start: number): TextSpan => ({
    id,
    pageIndex: 0,
    text,
    box: { x: 0.1, y: 0.1 + start * 0.001, width: 0.3, height: 0.04 },
    source: 'native',
    confidence: 1,
    start,
    end: start + text.length,
  });

  const buildPage = (words: string[]) => {
    const spans: TextSpan[] = [];
    let cursor = 0;
    const parts: string[] = [];
    words.forEach((word, index) => {
      const prefix = index === 0 ? '' : ' ';
      const start = cursor + prefix.length;
      parts.push(prefix + word);
      spans.push(makeSpan(`span_${index}`, word, start));
      cursor = start + word.length;
    });
    return { text: parts.join(''), spans };
  };

  const snippetsOfType = (detections: ReturnType<typeof detectSensitiveData>, type: string) =>
    detections.filter((detection) => detection.type === type).map((detection) => detection.snippet);

  const detectSingleSpan = (text: string) =>
    detectSensitiveData(0, text, [
      {
        id: 'single',
        pageIndex: 0,
        text,
        box: { x: 0.1, y: 0.2, width: 0.8, height: 0.04 },
        source: 'native',
        confidence: 1,
        start: 0,
        end: text.length,
      },
    ]);

  it('detects German date with "März" and a PLZ postal code', () => {
    const { text, spans } = buildPage(['Am', '15.', 'März', '2024', 'PLZ', '10115', 'Berlin']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'date')).toBe(true);
    expect(detections.some((detection) => detection.type === 'postal')).toBe(true);
  });

  it('keeps an ISO timestamp as one date detection and avoids a partial phone match', () => {
    const { text, spans } = buildPage(['2025-08-12', '13:14']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'date')).toEqual(['2025-08-12 13:14']);
    expect(snippetsOfType(detections, 'phone')).toEqual([]);
  });

  it('detects weekday-prefixed month-name dates', () => {
    const { text, spans } = buildPage(['MON', '18', 'SEPTEMBER', '2023']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'date')).toContain('MON 18 SEPTEMBER 2023');
  });

  it('detects a Lithuanian asmens kodas via checksum-validated national ID rule', () => {
    const { text, spans } = buildPage(['Asmens', 'kodas:', '38501011239']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'nationalId')).toBe(true);
  });

  it('detects a French NIR number', () => {
    const { text, spans } = buildPage(['NIR', '1', '84', '12', '75', '116', '002', '25']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'nationalId')).toBe(true);
  });

  it('detects an EU VAT number', () => {
    const { text, spans } = buildPage(['Invoice', 'VAT', 'DE123456789']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'vat')).toBe(true);
  });

  it('detects a UK postcode', () => {
    const { text, spans } = buildPage(['Delivery', 'to', 'SW1A', '1AA']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'postal')).toBe(true);
  });

  it('detects bare Lithuanian postal codes and postcode-plus-city phrases', () => {
    const bare = detectSingleSpan('01209');
    const withCity = detectSingleSpan('09308 Vilnius');

    expect(snippetsOfType(bare, 'postal')).toContain('01209');
    expect(snippetsOfType(withCity, 'postal')).toContain('09308');
    expect(snippetsOfType(withCity, 'phone')).toEqual([]);
  });

  it('validates IBANs via checksum and rejects random alphanumerics', () => {
    const { text, spans } = buildPage(['IBAN', 'GB82WEST12345698765432', 'XX00BAD00000000000000']);
    const detections = detectSensitiveData(0, text, spans);

    const ibans = detections.filter((detection) => detection.type === 'iban');
    expect(ibans.length).toBe(1);
    expect(ibans[0].normalizedSnippet).toBe('gb82west12345698765432');
  });

  it('detects Lithuanian IBANs in contiguous and grouped forms', () => {
    const contiguous = detectSingleSpan('LT121000011101001000');
    const grouped = detectSingleSpan('LT12 1000 0111 0100 1000');
    const groupedNbsp = detectSingleSpan(`LT12\u00A01000\u00A00111\u00A00100\u00A01000`);

    expect(snippetsOfType(contiguous, 'iban')).toContain('LT121000011101001000');
    expect(snippetsOfType(grouped, 'iban')).toContain('LT12 1000 0111 0100 1000');
    expect(snippetsOfType(groupedNbsp, 'iban')).toContain(
      `LT12\u00A01000\u00A00111\u00A00100\u00A01000`,
    );
  });

  it('detects a card number only when it passes Luhn', () => {
    const valid = buildPage(['Card', '4539148803436467']);
    const invalid = buildPage(['Card', '4539148803436468']);

    const validDetections = detectSensitiveData(0, valid.text, valid.spans);
    const invalidDetections = detectSensitiveData(0, invalid.text, invalid.spans);

    expect(validDetections.some((detection) => detection.type === 'card')).toBe(true);
    expect(invalidDetections.some((detection) => detection.type === 'card')).toBe(false);
  });

  it('detects broad vehicle license plate formats', () => {
    const examples = [
      'ABC123',
      'ABC 123',
      'AB-123-CD',
      '123 ABC',
      'A123BC',
      'LTU123',
      'AA 1234',
      '12 ABC 34',
      'abc123',
    ];

    for (const example of examples) {
      expect(snippetsOfType(detectSingleSpan(example), 'licensePlate')).toContain(example);
    }
  });

  it('keeps plate detection from swallowing prose and mileage records', () => {
    expect(snippetsOfType(detectSingleSpan('20 straipsnyje'), 'licensePlate')).toEqual([]);
    expect(snippetsOfType(detectSingleSpan('2020-10 15037km'), 'licensePlate')).toEqual([]);
  });

  it('detects an address anchored by a street token', () => {
    const { text, spans } = buildPage(['Sender:', 'Hauptstraße', '42,', '10115', 'Berlin']);
    const detections = detectSensitiveData(0, text, spans);

    expect(
      detections.some(
        (detection) =>
          detection.type === 'address' || detection.normalizedSnippet.includes('straße'),
      ),
    ).toBe(true);
  });

  it('captures a Lithuanian address with initials, short street token, postal and locality marker', () => {
    const { text, spans } = buildPage([
      'J.',
      'Basanavičiaus',
      'g.',
      '10,',
      '01118,',
      'Vilniaus',
      'm.',
    ]);
    const detections = detectSensitiveData(0, text, spans);
    const address = detections.find((detection) => detection.type === 'address');

    expect(address).toBeTruthy();
    expect(address?.normalizedSnippet).toContain('basanavičiaus');
    expect(address?.normalizedSnippet).toContain('g.');
    expect(address?.normalizedSnippet).toContain('01118');
    expect(address?.normalizedSnippet).toContain('vilniaus');
    expect(address?.normalizedSnippet).toContain('m.');
  });

  it('captures a Lithuanian address with no initials and a trailing locality marker', () => {
    const { text, spans } = buildPage([
      'Tarpininko',
      'adresas:',
      'Konstitucijos',
      'pr.',
      '24,',
      '08131',
      'Vilniaus',
      'm.',
    ]);
    const detections = detectSensitiveData(0, text, spans);
    const address = detections.find((detection) => detection.type === 'address');

    expect(address).toBeTruthy();
    expect(address?.normalizedSnippet).toContain('konstitucijos');
    expect(address?.normalizedSnippet).toContain('pr.');
    expect(address?.normalizedSnippet).toContain('24');
    expect(address?.normalizedSnippet).toContain('08131');
    expect(address?.normalizedSnippet).toContain('vilniaus');
    expect(address?.normalizedSnippet).toContain('m.');
  });

  it('keeps a city-first Lithuanian postal code separate from the street address', () => {
    const { text, spans } = buildPage(['Kriviu', 'g.', '35', '-', '35,', 'Vilnius,', 'LT01231']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'address')).toContain('Kriviu g. 35 - 35, Vilnius');
    expect(snippetsOfType(detections, 'postal')).toContain('LT01231');
    expect(snippetsOfType(detections, 'address')).not.toContain(
      'Kriviu g. 35 - 35, Vilnius, LT01231',
    );
  });

  it('detects uppercase Lithuanian short street abbreviations without dots when address-like', () => {
    const detections = detectSingleSpan('KONSITUCIJOS PR 12');

    expect(snippetsOfType(detections, 'address')).toContain('KONSITUCIJOS PR 12');
  });

  it('detects Lithuanian written dates with optional year and day markers', () => {
    const { text, spans } = buildPage(['2015', 'm.', 'spalio', '26d.']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'date')).toContain('2015 m. spalio 26d.');
  });

  it('detects prefixed short hyphenated case numbers', () => {
    const { text, spans } = buildPage(['Nr.', '2B-231']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'id')).toContain('Nr. 2B-231');
  });

  it('does not treat unprefixed short hyphenated tokens as ids', () => {
    const { text, spans } = buildPage(['Statusas', '2B-231']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'id')).toEqual([]);
  });

  it('detects saint-prefixed Lithuanian street names without an explicit street token', () => {
    const { text, spans } = buildPage(['Šv.', 'Stepono', '5-37']);
    const detections = detectSensitiveData(0, text, spans);

    expect(snippetsOfType(detections, 'address')).toContain('Šv. Stepono 5-37');
  });

  it('detects saint-prefixed Lithuanian street names with collapsed punctuation', () => {
    const detections = detectSingleSpan('Šv.Stepono 5-37');

    expect(snippetsOfType(detections, 'address')).toContain('Šv.Stepono 5-37');
  });

  it('detects VINs and rejects VIN-like strings with forbidden letters', () => {
    const valid = detectSingleSpan('SHHFK37806U011394');
    const invalid = detectSingleSpan('SHHFK37806U01I394');

    expect(snippetsOfType(valid, 'id')).toContain('SHHFK37806U011394');
    expect(snippetsOfType(invalid, 'id')).toEqual([]);
  });

  it('detects global phone layouts including Lithuanian local and short service numbers', () => {
    const lithuanian = detectSingleSpan('370 5 2102737');
    const shortService = detectSingleSpan('19001');
    const compactIntl = detectSingleSpan('+37052102737');
    const us = detectSingleSpan('(202) 555-0101');

    expect(snippetsOfType(lithuanian, 'phone')).toContain('370 5 2102737');
    expect(snippetsOfType(shortService, 'phone')).toContain('19001');
    expect(snippetsOfType(compactIntl, 'phone')).toContain('+37052102737');
    expect(snippetsOfType(us, 'phone')).toContain('(202) 555-0101');
  });

  it('does not treat odometer-like date-plus-distance records as phone or number detections', () => {
    const detections = detectSingleSpan('2020-10 15037km');

    expect(snippetsOfType(detections, 'phone')).toEqual([]);
    expect(snippetsOfType(detections, 'number')).toEqual([]);
    expect(snippetsOfType(detections, 'id')).toEqual([]);
  });

  it('detects structured hyphenated document identifiers as a whole token', () => {
    const detections = detectSingleSpan('LT26-L18-20145172-9');

    expect(snippetsOfType(detections, 'id')).toContain('LT26-L18-20145172-9');
    expect(snippetsOfType(detections, 'number')).not.toContain('20145172');
  });

  it('rejects ordinary business words that should not trigger rule detections', () => {
    for (const text of ['Atsiskaitymo', 'Įsipareigojimai', 'Įsigaliojimas']) {
      expect(detectSingleSpan(text)).toEqual([]);
    }
  });

  it('rejects short SKU-like hyphenated tokens that are not document ids', () => {
    const detections = detectSingleSpan('AB-123-XYZ');

    expect(snippetsOfType(detections, 'id')).toEqual([]);
  });

  it('rejects Lithuanian vehicle ownership prose as sensitive data', () => {
    const words = [
      'yra',
      'deklaravęs',
      'duomenis',
      'apie',
      'registruojamos',
      'transporto',
      'priemonės',
      'nuosavybės',
      'teisę.',
    ];
    const tokenized = buildPage(words);
    const wideText = words.join(' ');

    expect(detectSensitiveData(0, tokenized.text, tokenized.spans)).toHaveLength(0);
    expect(detectSingleSpan(wideText)).toHaveLength(0);
  });

  it('accepts weekday-prefixed month names across multiple locales', () => {
    const german = detectSingleSpan('Mo 18 März 2024');
    const french = detectSingleSpan('lun. 18 septembre 2023');
    const spanish = detectSingleSpan('LUN 18 SEPTIEMBRE 2023');

    expect(snippetsOfType(german, 'date')).toContain('Mo 18 März 2024');
    expect(snippetsOfType(french, 'date')).toContain('lun. 18 septembre 2023');
    expect(snippetsOfType(spanish, 'date')).toContain('LUN 18 SEPTIEMBRE 2023');
  });

  it('extends the address bounding box across every span of the phrase', () => {
    const { text, spans } = buildPage(['Konstitucijos', 'pr.', '24,', '08131', 'Vilniaus', 'm.']);
    const detections = detectSensitiveData(0, text, spans);
    const address = detections.find((detection) => detection.type === 'address');

    expect(address).toBeTruthy();
    // The union must span at least the first ("Konstitucijos") and last ("m.") spans.
    const firstSpan = spans[0];
    const lastSpan = spans[spans.length - 1];
    const boxRight = address!.box.x + address!.box.width;
    const spanRight = lastSpan.box.x + lastSpan.box.width;
    expect(address!.box.x).toBeCloseTo(firstSpan.box.x, 5);
    expect(boxRight).toBeCloseTo(spanRight, 5);
  });

  it('clips the bounding box when one wide span covers surrounding text plus the match', () => {
    // Simulates native PDF extraction producing a single text-run that
    // spans an entire sentence — the address match should not inherit the
    // whole span's bounding box, only the portion it actually covers.
    const wideText = 'į Lietuvos banką adresu Totorių g. 4, LT-01121 Vilnius.';
    const spans: TextSpan[] = [
      {
        id: 'wide',
        pageIndex: 0,
        text: wideText,
        box: { x: 0.1, y: 0.5, width: 0.8, height: 0.03 },
        source: 'native',
        confidence: 1,
        start: 0,
        end: wideText.length,
      },
    ];

    const detections = detectSensitiveData(0, wideText, spans);
    const address = detections.find((detection) => detection.type === 'address');

    expect(address).toBeTruthy();
    // Address phrase "Totorių g. 4, LT-01121 Vilnius" starts around char 24 of 55.
    // The clipped box must be noticeably narrower than the full 0.8-wide span
    // and must start past the span's left edge.
    expect(address!.box.width).toBeLessThan(0.6);
    expect(address!.box.x).toBeGreaterThan(0.2);
    // And the right edge must lie within the original span.
    expect(address!.box.x + address!.box.width).toBeLessThanOrEqual(0.9 + 1e-6);
  });

  it('captures a French token-prefixed address with connectors', () => {
    const { text, spans } = buildPage(['rue', 'de', 'la', 'Paix', '12,', '75002', 'Paris']);
    const detections = detectSensitiveData(0, text, spans);
    const address = detections.find((detection) => detection.type === 'address');

    expect(address).toBeTruthy();
    expect(address?.normalizedSnippet).toContain('rue');
    expect(address?.normalizedSnippet).toContain('paix');
    expect(address?.normalizedSnippet).toContain('12');
  });
});

describe('dedupeDetections', () => {
  it('collapses overlapping generic and specific detections into one precise box', () => {
    const deduped = dedupeDetections([
      {
        id: 'wide-number',
        type: 'number',
        label: 'Number',
        pageIndex: 0,
        box: { x: 0.08, y: 0.24, width: 0.72, height: 0.08 },
        snippet: '110051834',
        normalizedSnippet: '110051834',
        source: 'rule',
        confidence: 0.78,
        status: 'unconfirmed',
      },
      {
        id: 'tight-id',
        type: 'id',
        label: 'ID',
        pageIndex: 0,
        box: { x: 0.62, y: 0.245, width: 0.16, height: 0.05 },
        snippet: '110051834',
        normalizedSnippet: '110051834',
        source: 'rule',
        confidence: 0.9,
        status: 'unconfirmed',
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.type).toBe('id');
    expect(deduped[0]?.box).toEqual({ x: 0.62, y: 0.245, width: 0.16, height: 0.05 });
  });

  it('keeps repeated values when they appear in different parts of the same page', () => {
    const deduped = dedupeDetections([
      {
        id: 'left',
        type: 'number',
        label: 'Number',
        pageIndex: 0,
        box: { x: 0.1, y: 0.2, width: 0.14, height: 0.04 },
        snippet: '110051834',
        normalizedSnippet: '110051834',
        source: 'rule',
        confidence: 0.78,
        status: 'unconfirmed',
      },
      {
        id: 'right',
        type: 'number',
        label: 'Number',
        pageIndex: 0,
        box: { x: 0.62, y: 0.2, width: 0.14, height: 0.04 },
        snippet: '110051834',
        normalizedSnippet: '110051834',
        source: 'rule',
        confidence: 0.78,
        status: 'unconfirmed',
      },
    ]);

    expect(deduped).toHaveLength(2);
  });
});
