import type { ConsentStatus } from './cookie';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

type PersistedConsentStatus = Exclude<ConsentStatus, 'unknown'>;

const injectedMeasurementIds = new Set<string>();

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

export const loadGoogleAnalytics = (measurementId: string) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  ensureGoogleAnalyticsStub();

  if (injectedMeasurementIds.has(measurementId)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.measurementId = measurementId;
  document.head.append(script);

  window.gtag?.('js', new Date());
  window.gtag?.('config', measurementId);
  injectedMeasurementIds.add(measurementId);
};

export const updateGoogleAnalyticsConsent = (status: PersistedConsentStatus) => {
  if (typeof window === 'undefined') {
    return;
  }

  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'update', getConsentState(status));
};

export const resetGoogleAnalyticsForTests = () => {
  injectedMeasurementIds.clear();
};
