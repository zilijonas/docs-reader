/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeAnalyticsConsent } from '../cookie';
import { resetGoogleAnalyticsForTests } from '../googleAnalytics';
import { useConsentStore } from '../../../store/consentStore';
import { AnalyticsConsentController } from './AnalyticsConsentController';

const clearConsentCookie = () => {
  document.cookie = 'hddn_analytics_consent=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax';
};

const renderController = (props?: Partial<{ enabled: boolean; measurementId: string }>) => {
  const container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);

  act(() => {
    root.render(
      <AnalyticsConsentController
        enabled={props?.enabled ?? true}
        measurementId={props?.measurementId ?? 'G-TEST1234'}
      />,
    );
  });

  return { container, root };
};

describe('AnalyticsConsentController', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    clearConsentCookie();
    useConsentStore.setState({ status: 'unknown', isHydrated: false });
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.dataLayer = undefined;
    window.gtag = undefined;
    resetGoogleAnalyticsForTests();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container = null;
    clearConsentCookie();
    resetGoogleAnalyticsForTests();
  });

  it('renders the banner on first visit', () => {
    ({ container, root } = renderController());

    expect(container?.textContent).toContain('Analytics consent');
    expect(container?.textContent).toContain('Accept analytics');
  });

  it('accepts consent, hides the banner, and initializes analytics once', () => {
    ({ container, root } = renderController());

    const acceptButton = container?.querySelector('button:last-of-type');
    expect(acceptButton).not.toBeNull();

    act(() => {
      acceptButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(document.head.querySelector('script[data-measurement-id="G-TEST1234"]')).not.toBeNull();
    expect(window.dataLayer).toHaveLength(3);
    expect(window.dataLayer?.[2]).toEqual([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);

    act(() => {
      useConsentStore.getState().accept();
    });

    expect(document.head.querySelectorAll('script[data-measurement-id="G-TEST1234"]')).toHaveLength(1);
  });

  it('declines consent and keeps analytics storage denied', () => {
    ({ container, root } = renderController());

    const declineButton = container?.querySelector('button');
    expect(declineButton).not.toBeNull();

    act(() => {
      declineButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(document.head.querySelector('script[data-measurement-id]')).toBeNull();
    expect(window.dataLayer).toEqual([
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

  it('suppresses the banner when consent is already stored', () => {
    writeAnalyticsConsent('accepted');

    ({ container, root } = renderController());

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(document.head.querySelector('script[data-measurement-id="G-TEST1234"]')).not.toBeNull();
    expect(window.dataLayer?.at(-1)).toEqual([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
  });

  it('suppresses the banner when analytics is disabled', () => {
    ({ container, root } = renderController({ enabled: false }));

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(window.dataLayer).toBeUndefined();
  });
});

