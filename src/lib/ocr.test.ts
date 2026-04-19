import { describe, expect, it } from 'vitest';

import { extractOcrWords } from './ocr';

describe('extractOcrWords', () => {
  it('uses flat words output when Tesseract blocks are disabled', () => {
    const words = extractOcrWords(
      {
        data: {
          words: [
            {
              text: 'alice@example.com',
              confidence: 92,
              bbox: { x0: 20, y0: 10, x1: 140, y1: 26 },
            },
            {
              text: '110051834',
              confidence: 85,
              bbox: { x0: 160, y0: 40, x1: 240, y1: 58 },
            },
          ],
          blocks: null,
        },
      },
      400,
      200,
    );

    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({
      text: 'alice@example.com',
      confidence: 0.92,
      box: { x: 0.05, y: 0.05, width: 0.3, height: 0.08 },
    });
    expect(words[1]).toMatchObject({
      text: '110051834',
      confidence: 0.85,
      box: { x: 0.4, y: 0.2, width: 0.2, height: 0.09 },
    });
  });

  it('falls back to nested block output when flat words are absent', () => {
    const words = extractOcrWords(
      {
        data: {
          words: null,
          blocks: [
            {
              paragraphs: [
                {
                  lines: [
                    {
                      words: [
                        {
                          text: '+1 202 555 0101',
                          confidence: 88,
                          bbox: { x0: 30, y0: 60, x1: 180, y1: 78 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      300,
      150,
    );

    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({
      text: '+1 202 555 0101',
      confidence: 0.88,
      box: { x: 0.1, y: 0.4, width: 0.5, height: 0.12 },
    });
  });
});
