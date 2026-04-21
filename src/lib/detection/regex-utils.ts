const escapeToken = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const caseInsensitivePattern = (value: string) =>
  value
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const upper = char.toUpperCase();
      if (lower === upper) {
        return escapeToken(char);
      }
      return `[${escapeToken(lower)}${escapeToken(upper)}]`;
    })
    .join('');

export const makeAlternation = (tokens: string[]) =>
  Array.from(new Set(tokens.map((token) => token.toLowerCase())))
    .sort((a, b) => b.length - a.length)
    .map(escapeToken)
    .join('|');

export const makeCaseInsensitiveAlternation = (tokens: string[]) =>
  Array.from(new Set(tokens.map((token) => token.toLowerCase())))
    .sort((a, b) => b.length - a.length)
    .map(caseInsensitivePattern)
    .join('|');

export { escapeToken, caseInsensitivePattern };
