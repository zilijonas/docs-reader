import { beforeEach, describe, expect, it } from 'vitest';

import type { Detection } from '../types';
import { createManualRedactionRecord } from '../features/redactor';
import { useReviewStore } from './reviewStore';

const baseDetection: Detection = {
  id: 'detection_1',
  type: 'email',
  label: 'Email',
  pageIndex: 0,
  box: { x: 0.1, y: 0.12, width: 0.24, height: 0.05 },
  snippet: 'alice@example.com',
  normalizedSnippet: 'alice@example.com',
  source: 'rule',
  confidence: 0.98,
  status: 'unconfirmed',
};

const seedDocument = (detections: Detection[] = [baseDetection]) => {
  useReviewStore.getState().setDocument({
    sourceDocument: {
      name: 'fixture.pdf',
      size: 1024,
      pageCount: 1,
      mimeType: 'application/pdf',
      fingerprint: 'fixture',
    },
    pages: [
      {
        pageIndex: 0,
        width: 1000,
        height: 1400,
        lane: 'searchable',
        previewScale: 1,
        textLayerStatus: 'native',
        ocrStatus: 'done',
        textContent: 'fixture text',
        charCount: 12,
        spanCount: 1,
      },
    ],
    detections,
    warnings: [],
  });
};

const addManualRedaction = () => {
  useReviewStore.getState().addManualRedaction({
    pageIndex: 0,
    box: { x: 0.2, y: 0.3, width: 0.12, height: 0.08 },
    mode: 'box',
    snippet: 'manual',
  });

  return useReviewStore.getState().manualRedactions[0];
};

beforeEach(() => {
  useReviewStore.getState().reset();
});

describe('reviewStore redo history', () => {
  it('redos a single detection confirm or unconfirm step', () => {
    seedDocument();

    useReviewStore.getState().toggleDetectionStatus('detection_1');
    expect(useReviewStore.getState().detections[0].status).toBe('confirmed');
    expect(useReviewStore.getState().canRedo).toBe(true);

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().detections[0].status).toBe('unconfirmed');
    expect(useReviewStore.getState().canRedo).toBe(false);
  });

  it('redos bulk confirm and bulk unconfirm steps', () => {
    seedDocument();
    addManualRedaction();

    useReviewStore.getState().confirmAll();
    expect(useReviewStore.getState().detections[0].status).toBe('confirmed');
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('confirmed');

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().detections[0].status).toBe('unconfirmed');
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('unconfirmed');

    useReviewStore.getState().confirmAll();
    useReviewStore.getState().revertAll();
    expect(useReviewStore.getState().detections[0].status).toBe('unconfirmed');
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('unconfirmed');

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().detections[0].status).toBe('confirmed');
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('confirmed');
  });

  it('redos manual add and remove steps', () => {
    seedDocument();

    addManualRedaction();
    expect(useReviewStore.getState().manualRedactions).toHaveLength(1);

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().manualRedactions).toHaveLength(0);

    const manualRedaction = addManualRedaction();
    useReviewStore.getState().removeManualRedaction(manualRedaction.id);
    expect(useReviewStore.getState().manualRedactions).toHaveLength(0);

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().manualRedactions).toHaveLength(1);
    expect(useReviewStore.getState().manualRedactions[0].id).toBe(manualRedaction.id);
  });

  it('redos manual confirm steps', () => {
    seedDocument();
    const manualRedaction = addManualRedaction();

    useReviewStore.getState().setManualStatus(manualRedaction.id, 'confirmed');
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('confirmed');

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('unconfirmed');
  });

  it('redos pending manual dismissal steps', () => {
    seedDocument();
    addManualRedaction();

    useReviewStore.getState().clearPendingManualRedactions();
    expect(useReviewStore.getState().manualRedactions).toHaveLength(0);

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().manualRedactions).toHaveLength(1);
    expect(useReviewStore.getState().manualRedactions[0].status).toBe('unconfirmed');
  });

  it('redos manual move steps one change at a time', () => {
    seedDocument();
    const manualRedaction = addManualRedaction();
    const originalBox = manualRedaction.box;

    useReviewStore.getState().updateManualRedaction(manualRedaction.id, {
      x: 0.42,
      y: 0.48,
      width: originalBox.width,
      height: originalBox.height,
    });

    expect(useReviewStore.getState().manualRedactions[0].box.x).toBe(0.42);
    expect(useReviewStore.getState().canRedo).toBe(true);

    useReviewStore.getState().redoLastChange();
    expect(useReviewStore.getState().manualRedactions[0].box).toEqual(originalBox);
    expect(useReviewStore.getState().canRedo).toBe(true);
  });

  it('clears redo history on document, detections, and reset boundaries', () => {
    seedDocument();
    useReviewStore.getState().toggleDetectionStatus('detection_1');
    expect(useReviewStore.getState().canRedo).toBe(true);

    seedDocument();
    expect(useReviewStore.getState().canRedo).toBe(false);

    useReviewStore.getState().toggleDetectionStatus('detection_1');
    expect(useReviewStore.getState().canRedo).toBe(true);

    useReviewStore.getState().setDetections([baseDetection]);
    expect(useReviewStore.getState().canRedo).toBe(false);

    useReviewStore.getState().toggleDetectionStatus('detection_1');
    expect(useReviewStore.getState().canRedo).toBe(true);

    useReviewStore.getState().reset();
    expect(useReviewStore.getState().canRedo).toBe(false);
  });

  it('does not add redo history for no-op changes', () => {
    seedDocument();
    useReviewStore.getState().setDetectionStatus('detection_1', 'unconfirmed');
    expect(useReviewStore.getState().canRedo).toBe(false);

    const manualRedaction = createManualRedactionRecord({
      id: 'manual_seed',
      pageIndex: 0,
      mode: 'box',
      box: { x: 0.3, y: 0.3, width: 0.15, height: 0.08 },
      snippet: 'seed',
    });

    useReviewStore.setState({
      ...useReviewStore.getState(),
      manualRedactions: [manualRedaction],
    });

    useReviewStore.getState().updateManualRedaction(manualRedaction.id, manualRedaction.box);
    expect(useReviewStore.getState().canRedo).toBe(false);
  });

  it('caps redo history at one hundred entries and trims the oldest snapshot', () => {
    seedDocument();
    const manualRedaction = addManualRedaction();

    for (let step = 1; step <= 101; step += 1) {
      useReviewStore.getState().updateManualRedaction(manualRedaction.id, {
        x: 0.2 + step / 1000,
        y: 0.3,
        width: 0.12,
        height: 0.08,
      });
    }

    expect(useReviewStore.getState().canRedo).toBe(true);

    for (let step = 0; step < 100; step += 1) {
      useReviewStore.getState().redoLastChange();
    }

    expect(useReviewStore.getState().canRedo).toBe(false);
    expect(useReviewStore.getState().manualRedactions[0].box.x).toBeCloseTo(0.201);
  });
});
