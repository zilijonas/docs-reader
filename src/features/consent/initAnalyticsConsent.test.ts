/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';

import { writeAnalyticsConsent } from './cookie';
import { initAnalyticsConsent, resetAnalyticsConsentForTests } from './analytics-consent.client';

const clearConsentCookie = () => {
  document.cookie =
    'hddn_analytics_consent=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax';
};

const renderBanner = (measurementId = 'G-TEST1234') => {
  document.body.innerHTML = `
    <div data-analytics-consent data-measurement-id="${measurementId}" hidden>
      <button data-consent-decline type="button">Decline</button>
      <button data-consent-accept type="button">Accept</button>
    </div>
  `;

  const banner = document.querySelector('[data-analytics-consent]');
  if (!(banner instanceof HTMLElement)) {
    throw new Error('Expected consent banner');
  }

  return banner;
};

describe('initAnalyticsConsent', () => {
  beforeEach(() => {
    clearConsentCookie();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.dataLayer = undefined;
    window.gtag = undefined;
    resetAnalyticsConsentForTests();
  });

  it('shows the banner when consent is unknown', () => {
    const banner = renderBanner();

    initAnalyticsConsent(banner);

    expect(banner.hidden).toBe(false);
    expect(document.head.querySelector('script[data-measurement-id]')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('loads analytics only after accepted consent and updates consent before config', () => {
    const banner = renderBanner();

    initAnalyticsConsent(banner);

    const acceptButton = banner.querySelector('[data-consent-accept]');
    if (!(acceptButton instanceof HTMLButtonElement)) {
      throw new Error('Expected accept button');
    }

    acceptButton.click();

    expect(banner.hidden).toBe(true);
    expect(document.head.querySelector('script[data-measurement-id="G-TEST1234"]')).not.toBeNull();
    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'granted',
        },
      ],
      ['js', expect.any(Date)],
      ['config', 'G-TEST1234'],
    ]);
    expect(document.cookie).toContain('hddn_analytics_consent=');
  });

  it('keeps analytics denied when the user declines', () => {
    const banner = renderBanner();

    initAnalyticsConsent(banner);

    const declineButton = banner.querySelector('[data-consent-decline]');
    if (!(declineButton instanceof HTMLButtonElement)) {
      throw new Error('Expected decline button');
    }

    declineButton.click();

    expect(banner.hidden).toBe(true);
    expect(document.head.querySelector('script[data-measurement-id]')).toBeNull();
    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ]);
  });

  it('replays stored accepted consent before configuring Google Analytics', () => {
    writeAnalyticsConsent('accepted');
    const banner = renderBanner();

    initAnalyticsConsent(banner);

    expect(banner.hidden).toBe(true);
    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'granted',
        },
      ],
      ['js', expect.any(Date)],
      ['config', 'G-TEST1234'],
    ]);
    expect(document.head.querySelectorAll('script[data-measurement-id="G-TEST1234"]')).toHaveLength(
      1,
    );
  });
});
