/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeAnalyticsConsent } from '../../lib/analyticsConsent';
import { resetGoogleAnalyticsForTests } from '../../lib/googleAnalytics';
import { useConsentStore } from '../../store/consentStore';
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
      <AnalyticsConsentController enabled={props?.enabled ?? true} measurementId={props?.measurementId ?? 'G-TEST'} />,
    );
  });

  return { container, root };
};

describe('AnalyticsConsentController', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    clearConsentCookie();
    resetGoogleAnalyticsForTests();
    useConsentStore.setState({ status: 'unknown', isHydrated: false });
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container = null;
    clearConsentCookie();
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
    expect(document.querySelector('script[data-ga-measurement-id="G-TEST"]')).not.toBeNull();
    expect(window.dataLayer).toHaveLength(2);

    act(() => {
      useConsentStore.getState().accept();
    });

    expect(document.querySelectorAll('script[data-ga-measurement-id="G-TEST"]')).toHaveLength(1);
  });

  it('declines consent without loading analytics', () => {
    ({ container, root } = renderController());

    const declineButton = container?.querySelector('button');
    expect(declineButton).not.toBeNull();

    act(() => {
      declineButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(document.querySelector('script[data-ga-measurement-id="G-TEST"]')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('suppresses the banner when consent is already stored', () => {
    writeAnalyticsConsent('accepted');

    ({ container, root } = renderController());

    expect(container?.textContent ?? '').not.toContain('Analytics consent');
    expect(document.querySelector('script[data-ga-measurement-id="G-TEST"]')).not.toBeNull();
  });
});
