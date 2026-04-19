import { DETECTION_TYPE_LABELS } from './constants';
import type { Detection, DetectionType, TextSpan } from './types';
import { createId, dedupeDetections, escapeRegex, findSpansInRange, normalizeSnippet, unionBoxes } from './utils';

const RULES: Array<{ type: DetectionType; pattern: RegExp; confidence: number }> = [
  {
    type: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence: 0.98,
  },
  {
    type: 'phone',
    pattern: /(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/g,
    confidence: 0.93,
  },
  {
    type: 'url',
    pattern: /\bhttps?:\/\/[^\s<>()]+|(?:www\.)[^\s<>()]+\.[a-z]{2,}\S*/gi,
    confidence: 0.95,
  },
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
    confidence: 0.96,
  },
  {
    type: 'card',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    confidence: 0.9,
  },
  {
    type: 'date',
    pattern:
      /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})\b/gi,
    confidence: 0.86,
  },
  {
    type: 'id',
    pattern: /\b(?:\d{3}[- ]?\d{2}[- ]?\d{4}|[A-Z]{1,3}\d{5,10}|\d{2}[A-Z]{2}\d{6,})\b/gi,
    confidence: 0.9,
  },
  {
    type: 'number',
    pattern: /\b\d{8,}\b/g,
    confidence: 0.78,
  },
];

const buildKeywordPattern = (keywords: string[]) => {
  const filtered = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (!filtered.length) {
    return null;
  }

  return new RegExp(`\\b(?:${filtered.map(escapeRegex).join('|')})\\b`, 'gi');
};

const matchToDetection = (
  match: RegExpExecArray,
  type: DetectionType,
  confidence: number,
  pageIndex: number,
  pageText: string,
  spans: TextSpan[],
): Detection | null => {
  const start = match.index;
  const end = start + match[0].length;
  const coveredSpans = findSpansInRange(spans, start, end);

  if (!coveredSpans.length) {
    return null;
  }

  const snippet = pageText.slice(start, end).trim();
  return {
    id: createId('rule'),
    type,
    label: DETECTION_TYPE_LABELS[type],
    pageIndex,
    box: unionBoxes(coveredSpans.map((span) => span.box)),
    snippet,
    normalizedSnippet: normalizeSnippet(snippet),
    source: 'rule',
    confidence,
    status: 'suggested',
  };
};

export const detectSensitiveData = (pageIndex: number, pageText: string, spans: TextSpan[], keywords: string[] = []) => {
  const detections: Detection[] = [];
  const patterns = [...RULES];
  const keywordPattern = buildKeywordPattern(keywords);

  if (keywordPattern) {
    patterns.push({ type: 'keyword', pattern: keywordPattern, confidence: 0.99 });
  }

  patterns.forEach(({ type, pattern, confidence }) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(pageText))) {
      const detection = matchToDetection(match, type, confidence, pageIndex, pageText, spans);
      if (detection) {
        detections.push(detection);
      }
    }
  });

  return dedupeDetections(detections);
};

export const groupDetections = (detections: Detection[]) => {
  const grouped = new Map<string, Detection[]>();

  detections.forEach((detection) => {
    const groupId = `${detection.type}:${detection.normalizedSnippet}`;
    const bucket = grouped.get(groupId);
    if (bucket) {
      bucket.push(detection);
    } else {
      grouped.set(groupId, [detection]);
    }
  });

  return detections.map((detection) => {
    const groupId = `${detection.type}:${detection.normalizedSnippet}`;
    const matchCount = grouped.get(groupId)?.length ?? 1;
    return {
      ...detection,
      groupId,
      matchCount,
    };
  });
};
