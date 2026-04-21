/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';

import { readAnalyticsConsent, writeAnalyticsConsent } from './analyticsConsent';

const clearConsentCookie = () => {
  document.cookie = 'hddn_analytics_consent=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax';
};

describe('analytics consent cookies', () => {
  beforeEach(() => {
    clearConsentCookie();
  });

  it('returns unknown when the cookie is missing', () => {
    expect(readAnalyticsConsent()).toBe('unknown');
  });

  it('reads accepted consent from the cookie', () => {
    writeAnalyticsConsent('accepted');

    expect(readAnalyticsConsent()).toBe('accepted');
  });

  it('reads declined consent from the cookie', () => {
    writeAnalyticsConsent('declined');

    expect(readAnalyticsConsent()).toBe('declined');
  });

  it('returns unknown for invalid or old cookie values', () => {
    document.cookie = 'hddn_analytics_consent=v0%3Aaccepted; Path=/; SameSite=Lax';
    expect(readAnalyticsConsent()).toBe('unknown');

    clearConsentCookie();
    document.cookie = 'hddn_analytics_consent=v1%3Amaybe; Path=/; SameSite=Lax';
    expect(readAnalyticsConsent()).toBe('unknown');
  });
});
