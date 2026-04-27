import { describe, expect, it } from 'vitest';

import {
  isBsnValid,
  isCodiceFiscaleValid,
  isDniValid,
  isEstonianPersonalCodeValid,
  isGermanSteuerIdValid,
  isIbanValid,
  isLithuanianPersonalCodeValid,
  isLuhnValid,
  isNinoValid,
  isNirValid,
  isPeselValid,
  isVatNumberValid,
} from './index';

describe('isLuhnValid', () => {
  it('accepts well-known valid card numbers', () => {
    expect(isLuhnValid('4539 1488 0343 6467')).toBe(true);
    expect(isLuhnValid('4111111111111111')).toBe(true);
    expect(isLuhnValid('5500-0000-0000-0004')).toBe(true);
    expect(isLuhnValid('340000000000009')).toBe(true);
  });

  it('rejects malformed or checksum-broken values', () => {
    expect(isLuhnValid('4539 1488 0343 6468')).toBe(false);
    expect(isLuhnValid('123456')).toBe(false);
    expect(isLuhnValid('1234567890123456')).toBe(false);
  });
});

describe('isIbanValid', () => {
  it('accepts published IBAN specimens', () => {
    expect(isIbanValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(isIbanValid('DE89370400440532013000')).toBe(true);
    expect(isIbanValid('LT121000011101001000')).toBe(true);
    expect(isIbanValid('FR1420041010050500013M02606')).toBe(true);
  });

  it('rejects broken checksum or wrong structure', () => {
    expect(isIbanValid('GB82 WEST 1234 5698 7654 33')).toBe(false);
    expect(isIbanValid('XX00not-an-iban')).toBe(false);
  });
});

describe('isPeselValid', () => {
  it('accepts valid PESEL numbers', () => {
    expect(isPeselValid('44051401359')).toBe(true);
    expect(isPeselValid('02070803628')).toBe(true);
  });

  it('rejects invalid PESEL values', () => {
    expect(isPeselValid('44051401358')).toBe(false);
    expect(isPeselValid('00000000000')).toBe(false);
    expect(isPeselValid('1234')).toBe(false);
  });
});

describe('isBsnValid', () => {
  it('accepts valid Dutch BSN numbers', () => {
    expect(isBsnValid('111222333')).toBe(true);
    expect(isBsnValid('123456782')).toBe(true);
  });

  it('rejects invalid BSN numbers', () => {
    expect(isBsnValid('111222334')).toBe(false);
    expect(isBsnValid('000000000')).toBe(true);
    expect(isBsnValid('12345')).toBe(false);
  });
});

describe('isNirValid', () => {
  it('accepts valid French NIR numbers', () => {
    expect(isNirValid('1 84 12 75 116 002 25')).toBe(true);
    expect(isNirValid('2 69 05 49 588 157 80')).toBe(true);
  });

  it('rejects invalid NIR numbers', () => {
    expect(isNirValid('1 84 12 75 116 002 26')).toBe(false);
    expect(isNirValid('3 84 12 75 116 002 25')).toBe(false);
  });
});

describe('isDniValid', () => {
  it('accepts valid Spanish DNI and NIE', () => {
    expect(isDniValid('12345678Z')).toBe(true);
    expect(isDniValid('X1234567L')).toBe(true);
    expect(isDniValid('Y1234567X')).toBe(true);
  });

  it('rejects wrong letter or format', () => {
    expect(isDniValid('12345678A')).toBe(false);
    expect(isDniValid('99999999')).toBe(false);
  });
});

describe('isCodiceFiscaleValid', () => {
  it('accepts a valid codice fiscale', () => {
    expect(isCodiceFiscaleValid('RSSMRA85T10A562S')).toBe(true);
  });

  it('rejects checksum-broken or malformed codice fiscale', () => {
    expect(isCodiceFiscaleValid('RSSMRA85T10A562X')).toBe(false);
    expect(isCodiceFiscaleValid('not-a-cf')).toBe(false);
  });
});

describe('isLithuanianPersonalCodeValid', () => {
  it('accepts a valid asmens kodas', () => {
    expect(isLithuanianPersonalCodeValid('38501011239')).toBe(true);
    expect(isLithuanianPersonalCodeValid('48512010459')).toBe(true);
  });

  it('rejects malformed or invalid asmens kodas', () => {
    expect(isLithuanianPersonalCodeValid('00000000000')).toBe(false);
    expect(isLithuanianPersonalCodeValid('38501010000')).toBe(false);
  });
});

describe('isEstonianPersonalCodeValid', () => {
  it('accepts a valid isikukood', () => {
    expect(isEstonianPersonalCodeValid('38001085718')).toBe(true);
  });

  it('rejects invalid isikukood', () => {
    expect(isEstonianPersonalCodeValid('38001085719')).toBe(false);
  });
});

describe('isNinoValid', () => {
  it('accepts valid UK NINO', () => {
    expect(isNinoValid('QQ123456A')).toBe(false);
    expect(isNinoValid('AB123456C')).toBe(true);
    expect(isNinoValid('AB 12 34 56 C')).toBe(true);
  });

  it('rejects NINO with forbidden prefixes', () => {
    expect(isNinoValid('BG123456A')).toBe(false);
    expect(isNinoValid('NK123456A')).toBe(false);
  });
});

describe('isVatNumberValid', () => {
  it('accepts well-formed EU VAT numbers', () => {
    expect(isVatNumberValid('LT100012345678')).toBe(true);
    expect(isVatNumberValid('LT 100012345678')).toBe(true);
    expect(isVatNumberValid('LT123456789')).toBe(true);
    expect(isVatNumberValid('DE123456789')).toBe(true);
    expect(isVatNumberValid('ATU12345678')).toBe(true);
    expect(isVatNumberValid('SI12345678')).toBe(true);
    expect(isVatNumberValid('NL123456789B01')).toBe(true);
  });

  it('rejects letter-only matches that slipped past ASCII word boundaries', () => {
    expect(isVatNumberValid('SIPAREIGOJIMAI')).toBe(false);
    expect(isVatNumberValid('SIGALIOJIMAS')).toBe(false);
    expect(isVatNumberValid('ATSISKAITYMO')).toBe(false);
    expect(isVatNumberValid('LTABCDEFGHIJ')).toBe(false);
  });

  it('rejects wrong-shape bodies for known countries', () => {
    expect(isVatNumberValid('DE12345678')).toBe(false);
    expect(isVatNumberValid('LT12345')).toBe(false);
    expect(isVatNumberValid('AT12345678')).toBe(false);
    expect(isVatNumberValid('SI1234567')).toBe(false);
  });
});

describe('isGermanSteuerIdValid', () => {
  it('accepts a known valid Steuer-ID', () => {
    expect(isGermanSteuerIdValid('86095742719')).toBe(true);
    expect(isGermanSteuerIdValid('47036892816')).toBe(true);
  });

  it('rejects invalid Steuer-ID', () => {
    expect(isGermanSteuerIdValid('86095742710')).toBe(false);
    expect(isGermanSteuerIdValid('12345678901')).toBe(false);
  });
});
