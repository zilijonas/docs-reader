import { useEffect } from 'react';

import { copy } from '../../../lib/copy';
import { loadGoogleAnalytics, updateGoogleAnalyticsConsent } from '../googleAnalytics';
import { useConsentStore } from '../../../store/consentStore';

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
    if (!isHydrated || status === 'unknown' || !enabled) {
      return;
    }

    if (status === 'accepted') {
      loadGoogleAnalytics(measurementId);
    }

    updateGoogleAnalyticsConsent(status);
  }, [enabled, isHydrated, measurementId, status]);

  if (!isHydrated || status !== 'unknown') {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      role="region"
      aria-label={copy.consent.regionLabel}
    >
      <CookieConsentBanner onAccept={accept} onDecline={decline} />
    </div>
  );
}
