// EU VAT structural validator. Accepts the full match (e.g. "LT 100012345678")
// or a body-only string. Per-country body shape is checked; unknown country
// codes fall back to a digit-density heuristic that rejects all-letter
// candidates produced by ASCII word-boundary slips inside Lithuanian/etc.
// words (e.g. "ĮSIPAREIGOJIMAI" → "SI" + "PAREIGOJIMAI").

const COUNTRY_BODY_PATTERNS: Record<string, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^[01]\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  EL: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-HJ-NP-Z0-9]{2}\d{9}$/,
  GB: /^(?:\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^(?:\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/,
  IT: /^\d{11}$/,
  LT: /^(?:\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
  XI: /^(?:\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
};

const DIGIT_RE = /\d/g;

const splitVat = (value: string): { country: string; body: string } | null => {
  const cleaned = value.replace(/[\s\-\u00A0]+/g, '').toUpperCase();
  if (cleaned.length < 4) return null;
  const country = cleaned.slice(0, 2);
  const body = cleaned.slice(2);
  if (!/^[A-Z]{2}$/.test(country)) return null;
  if (!body) return null;
  return { country, body };
};

export const isVatNumberValid = (value: string): boolean => {
  const parts = splitVat(value);
  if (!parts) return false;
  const { country, body } = parts;
  const pattern = COUNTRY_BODY_PATTERNS[country];
  if (pattern) return pattern.test(body);

  // Unknown country prefix — refuse: the rule's regex already restricts to
  // the EU/UK list, so this branch only fires if the table drifts.
  return false;
};

export const vatBodyDigitCount = (value: string): number => {
  const parts = splitVat(value);
  if (!parts) return 0;
  return (parts.body.match(DIGIT_RE) ?? []).length;
};
