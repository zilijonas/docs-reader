import { create } from 'zustand';

import { readAnalyticsConsent, type ConsentStatus, writeAnalyticsConsent } from '../features/consent/cookie';

interface ConsentStoreState {
  status: ConsentStatus;
  isHydrated: boolean;
  hydrateFromCookie: () => void;
  accept: () => void;
  decline: () => void;
}

export const useConsentStore = create<ConsentStoreState>((set, get) => ({
  status: 'unknown',
  isHydrated: false,
  hydrateFromCookie: () => {
    if (get().isHydrated) {
      return;
    }

    set({
      status: readAnalyticsConsent(),
      isHydrated: true,
    });
  },
  accept: () => {
    if (get().status === 'accepted' && get().isHydrated) {
      return;
    }

    writeAnalyticsConsent('accepted');
    set({
      status: 'accepted',
      isHydrated: true,
    });
  },
  decline: () => {
    if (get().status === 'declined' && get().isHydrated) {
      return;
    }

    writeAnalyticsConsent('declined');
    set({
      status: 'declined',
      isHydrated: true,
    });
  },
}));
