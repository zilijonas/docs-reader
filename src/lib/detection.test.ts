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
        status: 'suggested',
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
        status: 'suggested',
      },
    ]);

    expect(grouped[0].groupId).toBe(grouped[1].groupId);
    expect(grouped[0].matchCount).toBe(2);
    expect(grouped[1].matchCount).toBe(2);
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
        status: 'suggested',
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
        status: 'suggested',
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
        status: 'suggested',
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
        status: 'suggested',
      },
    ]);

    expect(deduped).toHaveLength(2);
  });
});
