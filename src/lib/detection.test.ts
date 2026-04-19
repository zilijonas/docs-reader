import { describe, expect, it } from 'vitest';

import { detectSensitiveData, groupDetections } from './detection';
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
