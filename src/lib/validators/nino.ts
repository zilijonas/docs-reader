const NINO_INVALID_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ']);

export const isNinoValid = (value: string): boolean => {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(cleaned)) return false;
  return !NINO_INVALID_PREFIXES.has(cleaned.slice(0, 2));
};
