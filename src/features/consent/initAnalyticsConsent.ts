import { readAnalyticsConsent, writeAnalyticsConsent, type ConsentStatus } from './cookie';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

type PersistedConsentStatus = Exclude<ConsentStatus, 'unknown'>;

const injectedMeasurementIds = new Set<string>();

const deniedConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
} as const;

const grantedConsentState = {
  ...deniedConsentState,
  analytics_storage: 'granted',
} as const;

const getConsentState = (status: PersistedConsentStatus) =>
  status === 'accepted' ? grantedConsentState : deniedConsentState;

const ensureGoogleAnalyticsStub = () => {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
};

const setDefaultConsentState = () => {
  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'default', deniedConsentState);
};

const updateConsentState = (status: PersistedConsentStatus) => {
  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'update', getConsentState(status));
};

const loadGoogleAnalytics = (measurementId: string) => {
  if (injectedMeasurementIds.has(measurementId)) {
    return;
  }

  ensureGoogleAnalyticsStub();

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.measurementId = measurementId;
  document.head.append(script);

  window.gtag?.('js', new Date());
  window.gtag?.('config', measurementId);
  injectedMeasurementIds.add(measurementId);
};

const applyPersistedConsent = (status: PersistedConsentStatus, measurementId: string) => {
  setDefaultConsentState();
  updateConsentState(status);

  if (status === 'accepted') {
    loadGoogleAnalytics(measurementId);
  }
};

export const initAnalyticsConsent = (banner: HTMLElement) => {
  if (banner.dataset.analyticsConsentInitialized === 'true') {
    return;
  }

  const measurementId = banner.dataset.measurementId ?? '';
  if (!measurementId) {
    return;
  }

  const acceptButton = banner.querySelector('[data-consent-accept]');
  const declineButton = banner.querySelector('[data-consent-decline]');

  if (
    !(acceptButton instanceof HTMLButtonElement) ||
    !(declineButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  banner.dataset.analyticsConsentInitialized = 'true';

  const hideBanner = () => {
    banner.hidden = true;
  };

  const showBanner = () => {
    banner.hidden = false;
  };

  const handleChoice = (status: PersistedConsentStatus) => {
    writeAnalyticsConsent(status);
    applyPersistedConsent(status, measurementId);
    hideBanner();
  };

  const currentStatus = readAnalyticsConsent();
  if (currentStatus === 'unknown') {
    showBanner();
  } else {
    applyPersistedConsent(currentStatus, measurementId);
    hideBanner();
  }

  acceptButton.addEventListener('click', () => handleChoice('accepted'));
  declineButton.addEventListener('click', () => handleChoice('declined'));
};

export const resetAnalyticsConsentForTests = () => {
  injectedMeasurementIds.clear();
};
