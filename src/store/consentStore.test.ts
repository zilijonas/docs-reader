/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { writeAnalyticsConsent } from '../lib/analyticsConsent';
import { useConsentStore } from './consentStore';

const clearConsentCookie = () => {
  document.cookie = 'hddn_analytics_consent=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax';
};

describe('consentStore', () => {
  beforeEach(() => {
    clearConsentCookie();
    useConsentStore.setState({ status: 'unknown', isHydrated: false });
  });

  it('hydrates from the cookie and marks the store as ready', () => {
    writeAnalyticsConsent('accepted');

    useConsentStore.getState().hydrateFromCookie();

    expect(useConsentStore.getState().status).toBe('accepted');
    expect(useConsentStore.getState().isHydrated).toBe(true);
  });

  it('accepts consent and persists it', () => {
    useConsentStore.getState().accept();

    expect(useConsentStore.getState().status).toBe('accepted');
    expect(document.cookie).toContain('hddn_analytics_consent=');
  });

  it('declines consent and persists it', () => {
    useConsentStore.getState().decline();

    expect(useConsentStore.getState().status).toBe('declined');
    expect(document.cookie).toContain('hddn_analytics_consent=');
  });

  it('does not write the cookie again for repeated accept calls', () => {
    const cookieSetter = vi.spyOn(document, 'cookie', 'set');

    useConsentStore.getState().accept();
    useConsentStore.getState().accept();

    expect(cookieSetter).toHaveBeenCalledTimes(1);
  });
});
