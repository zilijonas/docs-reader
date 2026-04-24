import { DETECTION_TYPE_LABELS } from '../../lib/app-config';
import {
  SIGNATURE_LABELS,
  stripTrailingPunctuation,
} from '../../lib/detection/locales/name-labels';
import { createId, normalizeSnippet } from '../../lib/utils';
import type { BoundingBox, Detection, PageAsset, TextSpan } from '../../types';
import { runPythonJson } from './pyodide';

interface SignatureRegionResult {
  box: BoundingBox;
  density: number;
  width_px: number;
  height_px: number;
}

const isSignatureLabelToken = (text: string) => {
  const token = stripTrailingPunctuation(text.trim().toLowerCase());
  if (!token) return false;
  return SIGNATURE_LABELS.has(token);
};

const hasSignatureLabel = (spans: TextSpan[]) =>
  spans.some((span) => isSignatureLabelToken(span.text));

const confidenceForDensity = (density: number) => {
  // Peak confidence around 0.08-0.18 ink density (typical handwritten sig).
  const sweet = Math.max(0, 1 - Math.abs(density - 0.13) / 0.2);
  return 0.7 + sweet * 0.15;
};

export const detectSignatures = async (
  page: PageAsset,
  spans: TextSpan[],
): Promise<Detection[]> => {
  const labelPresent = hasSignatureLabel(spans);

  // Searchable lane without any signature label: skip — avoids render cost
  // when the page is rich text with no handwritten signal.
  if (page.lane === 'searchable' && !labelPresent) {
    return [];
  }

  const textBoxes = spans.map((span) => ({
    x: span.box.x,
    y: span.box.y,
    width: span.box.width,
    height: span.box.height,
  }));

  let regions: SignatureRegionResult[] = [];
  try {
    regions = await runPythonJson<SignatureRegionResult[]>(
      'detect_signature_regions(page_index_js, text_boxes_json_js, min_y_ratio_js)',
      {
        page_index_js: page.pageIndex,
        text_boxes_json_js: JSON.stringify(textBoxes),
        min_y_ratio_js: labelPresent ? 0 : 0.4,
      },
    );
  } catch {
    return [];
  }

  if (!Array.isArray(regions)) return [];

  return regions.map<Detection>((region) => ({
    id: createId('sig'),
    type: 'signature',
    label: DETECTION_TYPE_LABELS.signature,
    pageIndex: page.pageIndex,
    box: region.box,
    snippet: 'Signature region',
    normalizedSnippet: normalizeSnippet('signature region'),
    source: 'heuristic',
    confidence: confidenceForDensity(region.density),
    status: 'unconfirmed',
  }));
};
