import { describe, expect, it } from 'vitest';

import { detectNames } from './names';
import type { TextSpan } from '../../types';

let spanCounter = 0;

const makeSpan = (text: string, x: number, y: number, width = 0.06, height = 0.03): TextSpan => {
  const id = `span_${spanCounter++}`;
  const start = 0;
  const end = text.length;
  return {
    id,
    pageIndex: 0,
    text,
    box: { x, y, width, height },
    source: 'native',
    confidence: 1,
    start,
    end,
  };
};

const line = (tokens: string[], y: number, startX = 0.1, gap = 0.07): TextSpan[] =>
  tokens.map((token, index) => makeSpan(token, startX + index * gap, y));

describe('detectNames', () => {
  it('detects Lithuanian label + name on same line', () => {
    const spans = line(['Vardas', 'Pavardė:', 'Jonas', 'Jonaitis'], 0.2);
    const detections = detectNames(0, spans, 'searchable');
    const labelBased = detections.find((detection) => detection.confidence >= 0.9);
    expect(labelBased?.snippet).toBe('Jonas Jonaitis');
    expect(labelBased?.source).toBe('heuristic');
  });

  it('detects English "Name:" form field', () => {
    const spans = line(['Name:', 'John', 'Doe'], 0.3);
    const detections = detectNames(0, spans, 'searchable');
    const hit = detections.find((detection) => detection.confidence >= 0.9);
    expect(hit?.snippet).toBe('John Doe');
  });

  it('detects German Vorname / Nachname labels', () => {
    const spans = [...line(['Vorname:', 'Hans'], 0.4), ...line(['Nachname:', 'Müller'], 0.45)];
    const detections = detectNames(0, spans, 'searchable');
    const snippets = detections.filter((d) => d.confidence >= 0.9).map((d) => d.snippet);
    expect(snippets).toContain('Hans');
    expect(snippets).toContain('Müller');
  });

  it('detects Spanish nombre y apellidos', () => {
    const spans = line(['Nombre', 'y', 'apellidos:', 'María', 'García', 'López'], 0.5);
    const detections = detectNames(0, spans, 'searchable');
    const hit = detections.find((d) => d.confidence >= 0.9);
    expect(hit?.snippet).toBe('María García López');
  });

  it('detects Latvian Vārds Uzvārds label phrase', () => {
    const spans = line(['Vārds', 'Uzvārds:', 'Jānis', 'Bērziņš'], 0.6);
    const detections = detectNames(0, spans, 'searchable');
    const hit = detections.find((d) => d.confidence >= 0.9);
    expect(hit?.snippet).toBe('Jānis Bērziņš');
  });

  it('falls back to capitalized pair on searchable lane', () => {
    const spans = line(['Alice', 'Johnson', 'visited', 'the', 'office'], 0.7);
    const detections = detectNames(0, spans, 'searchable');
    const capitalized = detections.find((d) => d.confidence < 0.9 && d.snippet === 'Alice Johnson');
    expect(capitalized).toBeTruthy();
  });

  it('does not run capitalized fallback on OCR lane', () => {
    const spans = line(['Alice', 'Johnson', 'visited', 'the', 'office'], 0.8);
    const detections = detectNames(0, spans, 'ocr');
    const capitalized = detections.find((d) => d.confidence < 0.9);
    expect(capitalized).toBeUndefined();
  });

  it('rejects legal-entity tokens as names', () => {
    const spans = line(['UAB', 'Google', 'Services'], 0.9);
    const detections = detectNames(0, spans, 'searchable');
    expect(detections.find((d) => d.snippet.includes('Google'))).toBeUndefined();
  });

  it('rejects month names as capitalized candidates', () => {
    const spans = line(['January', 'February'], 0.1);
    const detections = detectNames(0, spans, 'searchable');
    expect(detections).toHaveLength(0);
  });

  it('extracts name from next line when label has no trailing value', () => {
    const labelLine = line(['Vardas', 'Pavardė:'], 0.2);
    const valueLine = line(['Petras', 'Petraitis'], 0.23);
    const detections = detectNames(0, [...labelLine, ...valueLine], 'searchable');
    const hit = detections.find((d) => d.confidence >= 0.9);
    expect(hit?.snippet).toBe('Petras Petraitis');
  });
});
