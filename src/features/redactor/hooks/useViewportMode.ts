import { useEffect } from 'react';

export function useViewportMode(onChange: (isMobileViewport: boolean) => void) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncViewportMode = () => {
      onChange(mediaQuery.matches);
    };

    syncViewportMode();
    mediaQuery.addEventListener('change', syncViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', syncViewportMode);
    };
  }, [onChange]);
}
