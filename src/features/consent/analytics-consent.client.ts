import { initAnalyticsConsent } from './initAnalyticsConsent';

const banner = document.querySelector('[data-analytics-consent]');

if (banner instanceof HTMLElement) {
  initAnalyticsConsent(banner);
}
