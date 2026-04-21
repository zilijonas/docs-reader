export type ConsentStatus = 'unknown' | 'accepted' | 'declined';

export const ANALYTICS_CONSENT_COOKIE_NAME = 'hddn_analytics_consent';
export const ANALYTICS_CONSENT_COOKIE_VERSION = 'v1';
export const ANALYTICS_CONSENT_MAX_AGE_DAYS = 180;

type PersistedConsentStatus = Exclude<ConsentStatus, 'unknown'>;

const isPersistedConsentStatus = (value: string): value is PersistedConsentStatus =>
  value === 'accepted' || value === 'declined';

const readCookieValue = (name: string) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieEntry = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedName));

  if (!cookieEntry) {
    return null;
  }

  return decodeURIComponent(cookieEntry.slice(encodedName.length));
};

export const readAnalyticsConsent = (): ConsentStatus => {
  const cookieValue = readCookieValue(ANALYTICS_CONSENT_COOKIE_NAME);

  if (!cookieValue) {
    return 'unknown';
  }

  const [version, storedStatus] = cookieValue.split(':');
  const normalizedStatus = storedStatus ?? '';

  if (version !== ANALYTICS_CONSENT_COOKIE_VERSION || !isPersistedConsentStatus(normalizedStatus)) {
    return 'unknown';
  }

  return normalizedStatus;
};

export const writeAnalyticsConsent = (status: PersistedConsentStatus) => {
  if (typeof document === 'undefined') {
    return;
  }

  const expiresAt = new Date(Date.now() + ANALYTICS_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const secureAttribute = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
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
