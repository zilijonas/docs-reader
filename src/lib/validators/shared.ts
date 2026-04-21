export const digitsOnly = (value: string) => value.replace(/\D+/g, '');

export const toCodePoint = (char: string) => char.charCodeAt(0);
