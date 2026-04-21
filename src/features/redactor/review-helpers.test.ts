import { describe, expect, it } from 'vitest';

import type { Detection, ManualRedaction } from '../../lib/types';
import { DEFAULT_REVIEW_FILTERS } from './config';
import {
  createManualRedactionRecord,
  filterReviewItems,
  getReviewCounts,
  nextDetectionStatus,
  updatePreviewRecord,
} from './review-helpers';

const detections: Detection[] = [
  {
    id: 'detection_1',
    type: 'email',
    label: 'Email',
    pageIndex: 0,
    box: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    snippet: 'alice@example.com',
    normalizedSnippet: 'alice@example.com',
    source: 'rule',
    confidence: 0.98,
    status: 'unconfirmed',
  },
  {
    id: 'detection_2',
    type: 'phone',
    label: 'Phone',
    pageIndex: 1,
    box: { x: 0.2, y: 0.2, width: 0.2, height: 0.05 },
    snippet: '+1 202 555 0101',
    normalizedSnippet: '+1 202 555 0101',
    source: 'rule',
    confidence: 0.88,
    status: 'confirmed',
  },
];

const manualRedactions: ManualRedaction[] = [
  {
    id: 'manual_1',
    pageIndex: 0,
    mode: 'box',
    box: { x: 0.3, y: 0.3, width: 0.12, height: 0.08 },
    status: 'unconfirmed',
  },
];

describe('review helpers', () => {
  it('cycles review status predictably', () => {
    expect(nextDetectionStatus('unconfirmed')).toBe('confirmed');
    expect(nextDetectionStatus('confirmed')).toBe('unconfirmed');
  });

  it('filters review items with shared filters', () => {
    const items = filterReviewItems(
      [
        {
          id: '1',
          type: 'email',
          label: 'Email',
          source: 'rule',
          status: 'unconfirmed',
          pageIndex: 1,
          snippet: 'alice@example.com',
          confidence: 1,
          box: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        },
        {
          id: '2',
          type: 'manual',
          label: 'Manual',
          source: 'manual',
          status: 'confirmed',
          pageIndex: 0,
          snippet: 'Manual box',
          confidence: 1,
          box: { x: 0.2, y: 0.2, width: 0.2, height: 0.05 },
          manual: true,
        },
      ],
      {
        ...DEFAULT_REVIEW_FILTERS,
        statuses: ['confirmed'],
        sources: ['manual'],
        types: ['manual'],
      },
    );

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
  });

  it('derives counts across rule detections and manual redactions', () => {
    expect(getReviewCounts(detections, manualRedactions)).toEqual({
      unconfirmedCount: 2,
      confirmedCount: 1,
      reviewCount: 3,
    });
  });

  it('normalizes manual redaction boxes on creation', () => {
    const manualRedaction = createManualRedactionRecord({
      id: 'manual_2',
      pageIndex: 2,
      mode: 'text',
      box: { x: 0.95, y: 0.92, width: 0.2, height: 0.2 },
      snippet: 'secret',
    });

    expect(manualRedaction.box.x).toBe(0.95);
    expect(manualRedaction.box.y).toBe(0.92);
    expect(manualRedaction.box.width).toBeCloseTo(0.05);
    expect(manualRedaction.box.height).toBeCloseTo(0.08);
    expect(manualRedaction.status).toBe('unconfirmed');
  });

  it('updates preview state without losing previous metadata', () => {
    expect(
      updatePreviewRecord(
        {
          0: { pageIndex: 0, status: 'ready', url: 'blob:preview' },
        },
        0,
        { status: 'error', error: 'no preview' },
      ),
    ).toEqual({
      0: { pageIndex: 0, status: 'error', url: 'blob:preview', error: 'no preview' },
    });
  });
});
