import { DETECTION_TYPE_LABELS } from './app-config';
import { READING_ORDER_LINE_THRESHOLD } from './detection/config';
import { DETECTION_RULES, buildKeywordPattern } from './detection/rules';
import type { DetectionRule } from './detection/rule';
import type { BoundingBox, Detection, DetectionType, TextSpan } from '../types';
import { clipBoxToRange, unionBoxes } from './geometry';
import { createId, dedupeDetections, findSpansInRange, normalizeSnippet } from './utils';

// Group covered spans into visual lines so a multi-line match is emitted
// as one detection per line instead of a single rectangle that swallows
// everything in between. Each entry is a tight box for the spans that
// fall on the same y row.
const groupBoxesByLine = (
  spans: TextSpan[],
  start: number,
  end: number,
): BoundingBox[] => {
  const sorted = [...spans].sort((a, b) => {
    if (Math.abs(a.box.y - b.box.y) > READING_ORDER_LINE_THRESHOLD) return a.box.y - b.box.y;
    return a.box.x - b.box.x;
  });
  const lines: { y: number; spans: TextSpan[] }[] = [];
  for (const span of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(span.box.y - last.y) <= READING_ORDER_LINE_THRESHOLD) {
      last.spans.push(span);
    } else {
      lines.push({ y: span.box.y, spans: [span] });
    }
  }
  return lines
    .map((line) => {
      const clipped = line.spans
        .map((span) => clipBoxToRange(span, start, end))
        .filter((box) => box.width > 0 && box.height > 0);
      return clipped.length ? unionBoxes(clipped) : null;
    })
    .filter((box): box is BoundingBox => box !== null);
};

const getJoinedSpanText = (spans: TextSpan[]) =>
  normalizeSnippet(spans.map((span) => span.text.trim()).join(' '));

const refineCoveredSpans = (coveredSpans: TextSpan[], snippet: string) => {
  if (coveredSpans.length <= 1) {
    return coveredSpans;
  }

  const normalizedSnippet = normalizeSnippet(snippet);
  let bestMatch = coveredSpans;

  for (let startIndex = 0; startIndex < coveredSpans.length; startIndex += 1) {
    for (let endIndex = startIndex; endIndex < coveredSpans.length; endIndex += 1) {
      const candidate = coveredSpans.slice(startIndex, endIndex + 1);
      const candidateText = getJoinedSpanText(candidate);

      if (!candidateText) {
        continue;
      }

      // Only accept candidates that *fully contain* the matched snippet.
      // The reverse direction (snippet contains candidate) is unsafe — a
      // one-character span like "g." is trivially contained in any longer
      // snippet and would hijack the bounding box, shrinking the highlight
      // to a single letter. We want the smallest window that still covers
      // the entire match, not the smallest span that happens to be a
      // substring of it.
      const isMatch =
        candidateText === normalizedSnippet || candidateText.includes(normalizedSnippet);

      if (!isMatch) {
        continue;
      }

      if (candidate.length < bestMatch.length) {
        bestMatch = candidate;
        continue;
      }

      if (
        candidate.length === bestMatch.length &&
        candidateText.length < getJoinedSpanText(bestMatch).length
      ) {
        bestMatch = candidate;
      }
    }
  }

  return bestMatch;
};

const matchToDetections = (
  match: RegExpExecArray,
  type: DetectionType,
  confidence: number,
  pageIndex: number,
  pageText: string,
  spans: TextSpan[],
): Detection[] => {
  const start = match.index;
  const end = start + match[0].length;
  const coveredSpans = refineCoveredSpans(findSpansInRange(spans, start, end), match[0]);

  if (!coveredSpans.length) {
    return [];
  }

  // Split into per-line boxes so a match that crosses a row boundary
  // (table cell wrap, address that spans two lines) becomes one
  // detection per line — never a single rectangle that swallows the
  // whitespace gutter.
  const lineBoxes = groupBoxesByLine(coveredSpans, start, end);
  if (!lineBoxes.length) {
    return [];
  }

  const snippet = pageText.slice(start, end).trim();
  const normalized = normalizeSnippet(snippet);
  const baseLabel = DETECTION_TYPE_LABELS[type];

  return lineBoxes.map((box) => ({
    id: createId('rule'),
    type,
    label: baseLabel,
    pageIndex,
    box,
    snippet,
    normalizedSnippet: normalized,
    source: 'rule',
    confidence,
    status: 'unconfirmed',
  }));
};

const runRule = (
  rule: DetectionRule,
  pageIndex: number,
  pageText: string,
  spans: TextSpan[],
  detections: Detection[],
) => {
  rule.pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = rule.pattern.exec(pageText))) {
    if (!match[0]) {
      // Safeguard — a zero-width match would otherwise spin forever
      rule.pattern.lastIndex += 1;
      continue;
    }
    if (rule.postFilter && !rule.postFilter(match[0])) {
      continue;
    }
    detections.push(
      ...matchToDetections(match, rule.type, rule.confidence, pageIndex, pageText, spans),
    );
  }
};

export const detectSensitiveData = (
  pageIndex: number,
  pageText: string,
  spans: TextSpan[],
  keywords: string[] = [],
) => {
  const detections: Detection[] = [];
  const rules: DetectionRule[] = [...DETECTION_RULES];
  const keywordPattern = buildKeywordPattern(keywords);

  if (keywordPattern) {
    rules.push({ type: 'keyword', pattern: keywordPattern, confidence: 0.99 });
  }

  rules.forEach((rule) => runRule(rule, pageIndex, pageText, spans, detections));

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
