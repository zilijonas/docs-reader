const ANALYTICS_CONSENT_COOKIE_NAME = 'hddn_analytics_consent';
const ANALYTICS_CONSENT_COOKIE_VERSION = 'v1';
const ANALYTICS_CONSENT_MAX_AGE_DAYS = 180;

const injectedMeasurementIds = new Set();

const deniedConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

const grantedConsentState = {
  ...deniedConsentState,
  analytics_storage: 'granted',
};

const isPersistedConsentStatus = (value) => value === 'accepted' || value === 'declined';

const getConsentState = (status) =>
  status === 'accepted' ? grantedConsentState : deniedConsentState;

const readAnalyticsConsent = () => {
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

const writeAnalyticsConsent = (status) => {
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
    ((...args) => {
      window.dataLayer?.push(args);
    });
};

const setDefaultConsentState = () => {
  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'default', deniedConsentState);
};

const updateConsentState = (status) => {
  ensureGoogleAnalyticsStub();
  window.gtag?.('consent', 'update', getConsentState(status));
};

const loadGoogleAnalytics = (measurementId) => {
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

const applyPersistedConsent = (status, measurementId) => {
  setDefaultConsentState();
  updateConsentState(status);

  if (status === 'accepted') {
    loadGoogleAnalytics(measurementId);
  }
};

export const initAnalyticsConsent = (banner) => {
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

  const handleChoice = (status) => {
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
