const NIR_CORSICA_REPLACEMENT: Record<string, string> = { A: '19', B: '18' };

const normalizeNir = (raw: string) => {
  const trimmed = raw.replace(/[\s-]+/g, '').toUpperCase();
  const deptSecondChar = trimmed[6];
  const replacement = NIR_CORSICA_REPLACEMENT[deptSecondChar];
  if (!replacement) return trimmed;
  return trimmed.slice(0, 5) + replacement + trimmed.slice(7);
};

export const isNirValid = (value: string): boolean => {
  const raw = value.replace(/[\s-]+/g, '').toUpperCase();
  if (!/^[12]\d{4}(?:\d{2}|2[AB])\d{6}\d{2}$/.test(raw)) return false;

  const normalized = normalizeNir(raw);
  if (!/^[12]\d{14}$/.test(normalized)) return false;

  const base = normalized.slice(0, 13);
  const key = Number.parseInt(normalized.slice(13), 10);
  const expected = 97 - (Number.parseInt(base, 10) % 97);
  return expected === key;
};
