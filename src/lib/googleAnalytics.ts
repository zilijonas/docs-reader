declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const injectedMeasurementIds = new Set<string>();

const getScriptSelector = (measurementId: string) => `script[data-ga-measurement-id="${measurementId}"]`;

export const loadGoogleAnalytics = (measurementId: string) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  if (!document.querySelector(getScriptSelector(measurementId))) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.gaMeasurementId = measurementId;
    document.head.append(script);
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  if (injectedMeasurementIds.has(measurementId)) {
    return;
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  injectedMeasurementIds.add(measurementId);
};

export const resetGoogleAnalyticsForTests = () => {
  injectedMeasurementIds.clear();
};
