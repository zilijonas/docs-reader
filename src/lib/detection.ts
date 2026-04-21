import { DETECTION_TYPE_LABELS } from './constants';
import { DETECTION_RULES, buildKeywordPattern, type DetectionRule } from './detection-rules';
import type { BoundingBox, Detection, DetectionType, TextSpan } from './types';
import { createId, dedupeDetections, findSpansInRange, normalizeSnippet, unionBoxes } from './utils';

// When a span extends beyond the matched range (common for native PDF
// extraction, which can emit a whole sentence as a single text-run), we
// clip its bounding box to the portion actually inside [rangeStart, rangeEnd].
// The approximation is linear over the character count, which is good enough
// for proportional-width fonts at typical reading sizes.
const clipBoxToRange = (span: TextSpan, rangeStart: number, rangeEnd: number): BoundingBox => {
  const spanLen = Math.max(1, span.end - span.start);
  const clippedStart = Math.max(rangeStart, span.start);
  const clippedEnd = Math.min(rangeEnd, span.end);
  if (clippedEnd <= clippedStart) {
    return span.box;
  }
  const leftFrac = Math.max(0, Math.min(1, (clippedStart - span.start) / spanLen));
  const rightFrac = Math.max(0, Math.min(1, (clippedEnd - span.start) / spanLen));
  const width = Math.max(0, rightFrac - leftFrac) * span.box.width;
  return {
    x: span.box.x + leftFrac * span.box.width,
    y: span.box.y,
    width,
    height: span.box.height,
  };
};

const getJoinedSpanText = (spans: TextSpan[]) => normalizeSnippet(spans.map((span) => span.text.trim()).join(' '));

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

      if (candidate.length === bestMatch.length && candidateText.length < getJoinedSpanText(bestMatch).length) {
        bestMatch = candidate;
      }
    }
  }

  return bestMatch;
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
  const coveredSpans = refineCoveredSpans(findSpansInRange(spans, start, end), match[0]);

  if (!coveredSpans.length) {
    return null;
  }

  // Clip every covered span to the actual match range — otherwise a single
  // wide span that happens to contain the match (plus unrelated leading or
  // trailing text) would push the bounding box out to the whole span.
  const clippedBoxes = coveredSpans
    .map((span) => clipBoxToRange(span, start, end))
    .filter((box) => box.width > 0 && box.height > 0);

  if (!clippedBoxes.length) {
    return null;
  }

  const snippet = pageText.slice(start, end).trim();
  return {
    id: createId('rule'),
    type,
    label: DETECTION_TYPE_LABELS[type],
    pageIndex,
    box: unionBoxes(clippedBoxes),
    snippet,
    normalizedSnippet: normalizeSnippet(snippet),
    source: 'rule',
    confidence,
    status: 'unconfirmed',
  };
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
    const detection = matchToDetection(match, rule.type, rule.confidence, pageIndex, pageText, spans);
    if (detection) {
      detections.push(detection);
    }
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
