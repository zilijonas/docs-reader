import type { BoundingBox } from '../types';

type OcrWordLike = {
  text?: string | null;
  confidence?: number | null;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null;
};

type OcrLineLike = {
  words?: OcrWordLike[] | null;
};

type OcrParagraphLike = {
  lines?: OcrLineLike[] | null;
};

type OcrBlockLike = {
  paragraphs?: OcrParagraphLike[] | null;
  lines?: OcrLineLike[] | null;
  words?: OcrWordLike[] | null;
};

type OcrResultLike = {
  data?: {
    words?: OcrWordLike[] | null;
    blocks?: OcrBlockLike[] | null;
  } | null;
};

export type OcrWord = {
  text: string;
  confidence: number;
  box: BoundingBox;
};

const toNormalizedWord = (word: OcrWordLike, imageWidth: number, imageHeight: number): OcrWord | null => {
  const text = word.text?.trim();
  const bbox = word.bbox;

  if (!text || !bbox || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }

  return {
    text,
    confidence: (word.confidence ?? 70) / 100,
    box: {
      x: bbox.x0 / imageWidth,
      y: bbox.y0 / imageHeight,
      width: (bbox.x1 - bbox.x0) / imageWidth,
      height: (bbox.y1 - bbox.y0) / imageHeight,
    },
  };
};

export const extractOcrWords = (result: OcrResultLike, imageWidth: number, imageHeight: number): OcrWord[] => {
  const flatWords = result.data?.words;
  if (flatWords?.length) {
    return flatWords
      .map((word) => toNormalizedWord(word, imageWidth, imageHeight))
      .filter((word): word is OcrWord => Boolean(word));
  }

  const nestedWords =
    result.data?.blocks?.flatMap((block) => {
      if (block.paragraphs?.length) {
        return block.paragraphs.flatMap((paragraph) => paragraph.lines?.flatMap((line) => line.words ?? []) ?? []);
      }

      if (block.lines?.length) {
        return block.lines.flatMap((line) => line.words ?? []);
      }

      return block.words ?? [];
    }) ?? [];

  return nestedWords
    .map((word) => toNormalizedWord(word, imageWidth, imageHeight))
    .filter((word): word is OcrWord => Boolean(word));
};
