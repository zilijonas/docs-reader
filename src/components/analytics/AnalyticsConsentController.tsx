import { useEffect } from 'react';

import { loadGoogleAnalytics } from '../../lib/googleAnalytics';
import { useConsentStore } from '../../store/consentStore';
import { CookieConsentBanner } from './CookieConsentBanner';

export function AnalyticsConsentController({
  enabled,
  measurementId,
}: {
  enabled: boolean;
  measurementId: string;
}) {
  const status = useConsentStore((state) => state.status);
  const isHydrated = useConsentStore((state) => state.isHydrated);
  const hydrateFromCookie = useConsentStore((state) => state.hydrateFromCookie);
  const accept = useConsentStore((state) => state.accept);
  const decline = useConsentStore((state) => state.decline);

  useEffect(() => {
    hydrateFromCookie();
  }, [hydrateFromCookie]);

  useEffect(() => {
    if (!enabled || !isHydrated || status !== 'accepted') {
      return;
    }

    loadGoogleAnalytics(measurementId);
  }, [enabled, isHydrated, measurementId, status]);

  if (!isHydrated || status !== 'unknown') {
    return null;
  }

  return (
    <div className="cookie-consent-shell" role="region" aria-label="Cookie consent">
      <CookieConsentBanner onAccept={accept} onDecline={decline} />
    </div>
  );
}
