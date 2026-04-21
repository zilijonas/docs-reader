const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export const isDniValid = (value: string): boolean => {
  const cleaned = value.replace(/[\s-]+/g, '').toUpperCase();
  const dni = cleaned.match(/^(\d{8})([A-Z])$/);
  if (dni) {
    const expected = DNI_LETTERS[Number.parseInt(dni[1], 10) % 23];
    return expected === dni[2];
  }

  const nie = cleaned.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nie) {
    const prefix = { X: '0', Y: '1', Z: '2' }[nie[1] as 'X' | 'Y' | 'Z'];
    const expected = DNI_LETTERS[Number.parseInt(prefix + nie[2], 10) % 23];
    return expected === nie[3];
  }

  return false;
};
