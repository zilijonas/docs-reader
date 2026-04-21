import type { ConsentStatus } from './analyticsConsent';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

type PersistedConsentStatus = Exclude<ConsentStatus, 'unknown'>;

const getConsentState = (status: PersistedConsentStatus) => ({
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: status === 'accepted' ? 'granted' : 'denied',
});

const ensureGoogleAnalyticsStub = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

};

export const updateGoogleAnalyticsConsent = (status: PersistedConsentStatus) => {
  if (typeof window === 'undefined') {
    return;
  }

  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'update', getConsentState(status));
};
