import { describe, expect, it } from 'vitest';

import { detectSensitiveData, groupDetections } from './detection';
import { dedupeDetections } from './utils';
import type { TextSpan } from './types';

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
    const detections = detectSensitiveData(0, 'alice@example.com Call +1 202 555 0101', spans, ['Call']);
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
    const numberDetection = detections.find((detection) => detection.normalizedSnippet === '110051834');

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

  it('detects German date with "März" and a PLZ postal code', () => {
    const { text, spans } = buildPage(['Am', '15.', 'März', '2024', 'PLZ', '10115', 'Berlin']);
    const detections = detectSensitiveData(0, text, spans);

    expect(detections.some((detection) => detection.type === 'date')).toBe(true);
    expect(detections.some((detection) => detection.type === 'postal')).toBe(true);
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

  it('validates IBANs via checksum and rejects random alphanumerics', () => {
    const { text, spans } = buildPage(['IBAN', 'GB82WEST12345698765432', 'XX00BAD00000000000000']);
    const detections = detectSensitiveData(0, text, spans);

    const ibans = detections.filter((detection) => detection.type === 'iban');
    expect(ibans.length).toBe(1);
    expect(ibans[0].normalizedSnippet).toBe('gb82west12345698765432');
  });

  it('detects a card number only when it passes Luhn', () => {
    const valid = buildPage(['Card', '4539148803436467']);
    const invalid = buildPage(['Card', '4539148803436468']);

    const validDetections = detectSensitiveData(0, valid.text, valid.spans);
    const invalidDetections = detectSensitiveData(0, invalid.text, invalid.spans);

    expect(validDetections.some((detection) => detection.type === 'card')).toBe(true);
    expect(invalidDetections.some((detection) => detection.type === 'card')).toBe(false);
  });

  it('detects an address anchored by a street token', () => {
    const { text, spans } = buildPage(['Sender:', 'Hauptstraße', '42,', '10115', 'Berlin']);
    const detections = detectSensitiveData(0, text, spans);

    expect(
      detections.some(
        (detection) => detection.type === 'address' || detection.normalizedSnippet.includes('straße'),
      ),
    ).toBe(true);
  });

  it('captures a Lithuanian address with initials, short street token, postal and locality marker', () => {
    const { text, spans } = buildPage(['J.', 'Basanavičiaus', 'g.', '10,', '01118,', 'Vilniaus', 'm.']);
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
    const { text, spans } = buildPage(['Tarpininko', 'adresas:', 'Konstitucijos', 'pr.', '24,', '08131', 'Vilniaus', 'm.']);
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
