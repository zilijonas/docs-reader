type ConsentStatus = 'unknown' | 'accepted' | 'declined';

const ANALYTICS_CONSENT_COOKIE_NAME = 'hddn_analytics_consent';
const ANALYTICS_CONSENT_COOKIE_VERSION = 'v1';
const ANALYTICS_CONSENT_MAX_AGE_DAYS = 180;

type PersistedConsentStatus = Exclude<ConsentStatus, 'unknown'>;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

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

const isPersistedConsentStatus = (value: string): value is PersistedConsentStatus =>
  value === 'accepted' || value === 'declined';

const getConsentState = (status: PersistedConsentStatus) =>
  status === 'accepted' ? grantedConsentState : deniedConsentState;

const readAnalyticsConsent = (): ConsentStatus => {
  const encodedName = `${encodeURIComponent(ANALYTICS_CONSENT_COOKIE_NAME)}=`;
  const cookieEntry = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedName));

  if (!cookieEntry) {
    return 'unknown';
  }

  const cookieValue = decodeURIComponent(cookieEntry.slice(encodedName.length));
  const [version, storedStatus] = cookieValue.split(':');
  const normalizedStatus = storedStatus ?? '';

  if (version !== ANALYTICS_CONSENT_COOKIE_VERSION || !isPersistedConsentStatus(normalizedStatus)) {
    return 'unknown';
  }

  return normalizedStatus;
};

const writeAnalyticsConsent = (status: PersistedConsentStatus) => {
  const expiresAt = new Date(Date.now() + ANALYTICS_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const secureAttribute = location.protocol === 'https:' ? '; Secure' : '';
  const cookieValue = `${ANALYTICS_CONSENT_COOKIE_VERSION}:${status}`;

  document.cookie = [
    `${encodeURIComponent(ANALYTICS_CONSENT_COOKIE_NAME)}=${encodeURIComponent(cookieValue)}`,
    `Expires=${expiresAt.toUTCString()}`,
    'Path=/',
    'SameSite=Lax',
    secureAttribute ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
};

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

const banner = document.querySelector('[data-analytics-consent]');

if (banner instanceof HTMLElement) {
  initAnalyticsConsent(banner);
}
