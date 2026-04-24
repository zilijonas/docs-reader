import type { Detection, PageLane, TextSpan } from '../../types';
import { DETECTION_TYPE_LABELS } from '../app-config';
import { clamp, unionBoxes } from '../geometry';
import { createId, normalizeSnippet } from '../utils';
import { READING_ORDER_LINE_THRESHOLD } from './config';
import { MONTHS } from './locales/months';
import {
  NAME_CONNECTORS,
  NAME_LABEL_PHRASES,
  NAME_LABEL_SINGLE,
  NAME_STOPWORDS,
  stripTrailingPunctuation,
} from './locales/name-labels';
import { WEEKDAYS } from './locales/weekdays';
import {
  isLikelyLithuanianFirstName,
  isLikelyLithuanianSurname,
  type LithuanianNameDataset,
} from './lt-morphology';

const NAME_WORD_RE = /^\p{Lu}[\p{L}\-'’]{1,40}$/u;
const ALL_CAPS_NAME_RE = /^\p{Lu}{2,}[\p{L}\-'’]{0,40}$/u;
const LOWER_CONNECTOR_RE = /^[\p{Ll}]{1,4}$/u;
const HAS_DIGIT_RE = /\d/u;
const PUNCT_STOP_RE = /[.!?;]$/u;

const CAPITALIZED_LANE_STOPWORDS = new Set<string>([
  ...NAME_STOPWORDS,
  ...MONTHS.map((value) => value.toLowerCase()),
  ...WEEKDAYS.map((value) => value.toLowerCase()),
]);

const LABEL_NAME_CONFIDENCE = 0.9;
const CAPITALIZED_NAME_CONFIDENCE = 0.55;
const LT_NAME_CONFIDENCE_EXACT = 0.85;
const LT_NAME_CONFIDENCE_INFLECTED = 0.8;
const MAX_NAME_TOKENS = 4;
const LT_MAX_WINDOW = 4;
const LT_MAX_MIDDLE_TOKENS = 2;

interface LineGroup {
  y: number;
  height: number;
  spans: TextSpan[];
}

const tokenize = (span: TextSpan) => stripTrailingPunctuation(span.text.trim().toLowerCase());

const groupSpansIntoLines = (spans: TextSpan[]): LineGroup[] => {
  const sorted = [...spans].sort((a, b) => {
    if (Math.abs(a.box.y - b.box.y) > READING_ORDER_LINE_THRESHOLD) {
      return a.box.y - b.box.y;
    }
    return a.box.x - b.box.x;
  });

  const lines: LineGroup[] = [];
  sorted.forEach((span) => {
    const currentLine = lines[lines.length - 1];
    if (
      currentLine &&
      Math.abs(currentLine.y - span.box.y) <= READING_ORDER_LINE_THRESHOLD
    ) {
      currentLine.spans.push(span);
      currentLine.height = Math.max(currentLine.height, span.box.height);
      return;
    }
    lines.push({ y: span.box.y, height: span.box.height, spans: [span] });
  });

  return lines;
};

const isNameToken = (raw: string) => {
  const token = stripTrailingPunctuation(raw.trim());
  if (!token || HAS_DIGIT_RE.test(token)) return false;
  if (NAME_WORD_RE.test(token)) return true;
  if (ALL_CAPS_NAME_RE.test(token) && token.length >= 2) return true;
  return false;
};

const isConnectorToken = (raw: string) => {
  const token = stripTrailingPunctuation(raw.trim().toLowerCase());
  if (!token) return false;
  return NAME_CONNECTORS.has(token) && LOWER_CONNECTOR_RE.test(token);
};

const hasSentenceStop = (raw: string) => PUNCT_STOP_RE.test(raw.trim());

const matchesLabelAtIndex = (lineSpans: TextSpan[], index: number): number => {
  const head = tokenize(lineSpans[index]);
  if (!head) return 0;

  for (const phrase of NAME_LABEL_PHRASES) {
    if (phrase.length === 0 || index + phrase.length > lineSpans.length) continue;
    const matches = phrase.every((part, offset) => tokenize(lineSpans[index + offset]) === part);
    if (matches) return phrase.length;
  }

  if (NAME_LABEL_SINGLE.has(head)) return 1;
  return 0;
};

const stripColonSuffix = (token: string) => token.replace(/[:;\-–—]+$/u, '').trim();

const collectNameSpans = (candidates: TextSpan[]): TextSpan[] => {
  const collected: TextSpan[] = [];
  for (let i = 0; i < candidates.length && collected.length < MAX_NAME_TOKENS; i += 1) {
    const span = candidates[i];
    const raw = span.text.trim();
    const cleaned = stripColonSuffix(raw);

    if (!cleaned) break;
    if (HAS_DIGIT_RE.test(cleaned)) break;

    if (isNameToken(cleaned)) {
      collected.push(span);
      if (hasSentenceStop(raw)) break;
      continue;
    }

    // Allow a single lowercase connector between name tokens.
    if (collected.length > 0 && isConnectorToken(cleaned)) {
      const next = candidates[i + 1];
      if (next && isNameToken(stripColonSuffix(next.text.trim()))) {
        collected.push(span);
        continue;
      }
    }

    break;
  }
  return collected;
};

const buildDetection = (
  pageIndex: number,
  nameSpans: TextSpan[],
  confidence: number,
): Detection | null => {
  if (nameSpans.length === 0) return null;
  const text = nameSpans.map((span) => span.text.trim()).join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const box = unionBoxes(nameSpans.map((span) => span.box));
  if (box.width <= 0 || box.height <= 0) return null;

  return {
    id: createId('name'),
    type: 'name',
    label: DETECTION_TYPE_LABELS.name,
    pageIndex,
    box,
    snippet: text,
    normalizedSnippet: normalizeSnippet(text),
    source: 'heuristic',
    confidence: clamp(confidence, 0, 1),
    status: 'unconfirmed',
  };
};

const detectLabelBased = (pageIndex: number, lines: LineGroup[]): Detection[] => {
  const detections: Detection[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (let spanIndex = 0; spanIndex < line.spans.length; spanIndex += 1) {
      const labelWidth = matchesLabelAtIndex(line.spans, spanIndex);
      if (labelWidth === 0) continue;

      const afterLabelSameLine = line.spans.slice(spanIndex + labelWidth);
      let nameSpans = collectNameSpans(afterLabelSameLine);

      // Fallback: name appears on the next line close below.
      if (nameSpans.length === 0) {
        const nextLine = lines[lineIndex + 1];
        if (nextLine) {
          const verticalGap = nextLine.y - (line.y + line.height);
          if (verticalGap >= -line.height && verticalGap < 2 * line.height) {
            nameSpans = collectNameSpans(nextLine.spans);
          }
        }
      }

      const detection = buildDetection(pageIndex, nameSpans, LABEL_NAME_CONFIDENCE);
      if (detection) {
        detections.push(detection);
      }

      // Skip past the label to avoid re-triggering on the same tokens.
      spanIndex += labelWidth - 1;
    }
  }

  return detections;
};

const detectLithuanian = (
  pageIndex: number,
  lines: LineGroup[],
  dataset: LithuanianNameDataset,
  covered: Set<TextSpan>,
): Detection[] => {
  const detections: Detection[] = [];

  for (const line of lines) {
    const spans = line.spans;
    let i = 0;
    while (i < spans.length) {
      const anchorSpan = spans[i];
      const anchorCleaned = stripColonSuffix(anchorSpan.text.trim());
      if (!isNameToken(anchorCleaned)) {
        i += 1;
        continue;
      }
      const anchor = isLikelyLithuanianFirstName(anchorCleaned, dataset);
      if (!anchor.match) {
        i += 1;
        continue;
      }

      const window: TextSpan[] = [anchorSpan];
      let allExact = anchor.exact;
      let j = i + 1;

      while (j < spans.length && window.length < LT_MAX_WINDOW) {
        const nextSpan = spans[j];
        const nextCleaned = stripColonSuffix(nextSpan.text.trim());
        if (!isNameToken(nextCleaned)) break;
        const middlesUsed = window.length - 1;
        if (middlesUsed >= LT_MAX_MIDDLE_TOKENS) break;
        const middle = isLikelyLithuanianFirstName(nextCleaned, dataset);
        if (!middle.match) break;
        window.push(nextSpan);
        if (!middle.exact) allExact = false;
        j += 1;
      }

      if (j >= spans.length) {
        i = Math.max(i + 1, j);
        continue;
      }

      const surnameSpan = spans[j];
      const surnameCleaned = stripColonSuffix(surnameSpan.text.trim());
      if (!isNameToken(surnameCleaned)) {
        i = Math.max(i + 1, j);
        continue;
      }

      const surname = isLikelyLithuanianSurname(surnameCleaned);
      if (!surname.strong && !surname.medium) {
        i = Math.max(i + 1, j);
        continue;
      }

      window.push(surnameSpan);
      const endIdx = j;

      const confidence =
        surname.strong && allExact ? LT_NAME_CONFIDENCE_EXACT : LT_NAME_CONFIDENCE_INFLECTED;
      const detection = buildDetection(pageIndex, window, confidence);
      if (detection) {
        detections.push(detection);
        for (const span of window) covered.add(span);
      }

      i = endIdx + 1;
    }
  }

  return detections;
};

const detectCapitalizedFallback = (
  pageIndex: number,
  lines: LineGroup[],
  covered: Set<TextSpan>,
): Detection[] => {
  const detections: Detection[] = [];

  for (const line of lines) {
    const spans = line.spans;
    let i = 0;
    while (i < spans.length) {
      const span = spans[i];
      if (covered.has(span)) {
        i += 1;
        continue;
      }
      const cleaned = stripColonSuffix(span.text.trim());
      if (!isNameToken(cleaned)) {
        i += 1;
        continue;
      }

      const lowered = cleaned.toLowerCase();
      if (CAPITALIZED_LANE_STOPWORDS.has(lowered)) {
        i += 1;
        continue;
      }

      const window: TextSpan[] = [span];
      let j = i + 1;
      let stoppedByHit = false;
      while (j < spans.length && window.length < 3) {
        const nextCleaned = stripColonSuffix(spans[j].text.trim());
        if (isNameToken(nextCleaned)) {
          const nextLower = nextCleaned.toLowerCase();
          if (CAPITALIZED_LANE_STOPWORDS.has(nextLower)) {
            stoppedByHit = true;
            break;
          }
          window.push(spans[j]);
          if (hasSentenceStop(spans[j].text.trim())) {
            j += 1;
            break;
          }
          j += 1;
          continue;
        }
        if (window.length > 1 && isConnectorToken(nextCleaned)) {
          const lookahead = spans[j + 1];
          if (lookahead && isNameToken(stripColonSuffix(lookahead.text.trim()))) {
            window.push(spans[j]);
            j += 1;
            continue;
          }
        }
        break;
      }

      if (window.length >= 2 && !stoppedByHit) {
        // Avoid overlap with legal-entity prefix: skip window preceded by stopword on same line.
        const prev = spans[i - 1];
        const prevLower = prev ? stripColonSuffix(prev.text.trim()).toLowerCase() : '';
        if (!prevLower || !CAPITALIZED_LANE_STOPWORDS.has(prevLower)) {
          const detection = buildDetection(pageIndex, window, CAPITALIZED_NAME_CONFIDENCE);
          if (detection) detections.push(detection);
        }
      }

      i = Math.max(i + 1, j);
    }
  }

  return detections;
};

export const detectNames = (
  pageIndex: number,
  spans: TextSpan[],
  lane: PageLane,
  ltDataset: LithuanianNameDataset | null = null,
): Detection[] => {
  if (spans.length === 0) return [];
  const lines = groupSpansIntoLines(spans);
  const covered = new Set<TextSpan>();

  const detections: Detection[] = [];
  detections.push(...detectLabelBased(pageIndex, lines));

  if (ltDataset && ltDataset.firstNames.size > 0) {
    detections.push(...detectLithuanian(pageIndex, lines, ltDataset, covered));
  }

  // Capitalized fallback is too noisy on OCR output — restrict to native text.
  if (lane === 'searchable') {
    detections.push(...detectCapitalizedFallback(pageIndex, lines, covered));
  }

  return detections;
};
