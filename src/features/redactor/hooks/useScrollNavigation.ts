import { useEffect, useRef } from 'react';

import { REDACTOR_UI, getPageAnchorId, getReviewItemAnchorId } from '../config';

const REVIEW_ITEM_PULSE_DELAY_MS = 520;

export function useScrollNavigation({
  appHeaderHeight,
  hasViewer,
  isMobileViewport,
  isSidebarOpen,
  setActivePage,
  setAppHeaderHeight,
  setReviewPanelOpen,
  setViewerContentWidth,
  setZoom,
  zoom,
}: {
  appHeaderHeight: number;
  hasViewer: boolean;
  isMobileViewport: boolean;
  isSidebarOpen: boolean;
  setActivePage: (pageIndex: number) => void;
  setAppHeaderHeight: (value: number) => void;
  setReviewPanelOpen: (value: boolean) => void;
  setViewerContentWidth: (value: number) => void;
  setZoom: (value: number) => void;
  zoom: number;
}) {
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appHeaderRef = useRef<HTMLElement | null>(null);
  const viewerColumnRef = useRef<HTMLDivElement | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReviewPanelOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, setReviewPanelOpen]);

  useEffect(() => {
    const appShellElement = appShellRef.current;
    const appHeaderElement = appHeaderRef.current;

    if (!appShellElement || !appHeaderElement) {
      return;
    }

    const syncHeights = () => {
      const nextHeaderHeight = Math.round(appHeaderElement.getBoundingClientRect().height);

      setAppHeaderHeight(nextHeaderHeight);
      appShellElement.style.setProperty('--app-header-height', `${nextHeaderHeight}px`);
      appShellElement.style.setProperty('--review-toolbar-height', '0px');
      appShellElement.style.setProperty('--layout-app-header-offset', `${nextHeaderHeight}px`);
    };

    syncHeights();

    const resizeObserver = new ResizeObserver(syncHeights);
    resizeObserver.observe(appHeaderElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasViewer, setAppHeaderHeight]);

  useEffect(() => {
    const viewerColumn = viewerColumnRef.current;

    if (!viewerColumn) {
      return;
    }

    const syncViewerContentWidth = () => {
      const styles = window.getComputedStyle(viewerColumn);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const nextWidth = Math.round(viewerColumn.clientWidth - paddingLeft - paddingRight);

      if (nextWidth > 0) {
        setViewerContentWidth(nextWidth);
      }
    };

    syncViewerContentWidth();

    const resizeObserver = new ResizeObserver(syncViewerContentWidth);
    resizeObserver.observe(viewerColumn);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasViewer, setViewerContentWidth]);

  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');

    if (!viewportMeta || !hasViewer || !isMobileViewport) {
      return;
    }

    const previousContent = viewportMeta.getAttribute('content');
    viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );

    return () => {
      if (previousContent) {
        viewportMeta.setAttribute('content', previousContent);
      } else {
        viewportMeta.removeAttribute('content');
      }
    };
  }, [hasViewer, isMobileViewport]);

  useEffect(() => {
    const viewerColumn = viewerColumnRef.current;

    if (!viewerColumn || !hasViewer || !isMobileViewport) {
      return;
    }

    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let pinching = false;

    const getDistance = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinching = true;
        pinchStartDistance = getDistance(event.touches[0], event.touches[1]);
        pinchStartZoom = zoomRef.current;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (pinching && event.touches.length === 2) {
        event.preventDefault();
        const distance = getDistance(event.touches[0], event.touches[1]);
        if (pinchStartDistance <= 0) {
          return;
        }
        const ratio = distance / pinchStartDistance;
        const next = Math.min(REDACTOR_UI.maxZoom, Math.max(REDACTOR_UI.minZoom, pinchStartZoom * ratio));
        setZoom(next);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinching = false;
      }
    };

    viewerColumn.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewerColumn.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewerColumn.addEventListener('touchend', handleTouchEnd, { passive: true });
    viewerColumn.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      viewerColumn.removeEventListener('touchstart', handleTouchStart);
      viewerColumn.removeEventListener('touchmove', handleTouchMove);
      viewerColumn.removeEventListener('touchend', handleTouchEnd);
      viewerColumn.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [hasViewer, isMobileViewport, setZoom]);

  useEffect(
    () => () => {
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    },
    [],
  );

  const scrollToPage = (pageIndex: number) => {
    setActivePage(pageIndex);

    requestAnimationFrame(() => {
      const pageElement = document.getElementById(getPageAnchorId(pageIndex));

      if (!pageElement) {
        return;
      }

      const stickyOffset = appHeaderHeight;
      const pageRect = pageElement.getBoundingClientRect();
      const viewerColumn = viewerColumnRef.current;
      const scrollTarget =
        viewerColumn && viewerColumn.scrollHeight > viewerColumn.clientHeight ? viewerColumn : window;

      if (scrollTarget === window) {
        window.scrollTo({
          top: window.scrollY + pageRect.top - stickyOffset - 12,
          behavior: 'smooth',
        });
      } else {
        const viewerRect = (scrollTarget as HTMLDivElement).getBoundingClientRect();
        (scrollTarget as HTMLDivElement).scrollTo({
          top: (scrollTarget as HTMLDivElement).scrollTop + (pageRect.top - viewerRect.top),
          behavior: 'smooth',
        });
      }
    });
  };

  const pulseReviewItem = (itemId: string) => {
    const reviewItem = document.getElementById(getReviewItemAnchorId(itemId));

    if (!reviewItem) {
      return;
    }

    reviewItem.classList.remove('pdf-review-target-pulse');
    void reviewItem.getBoundingClientRect();
    reviewItem.classList.add('pdf-review-target-pulse');

    const handleAnimationEnd = () => {
      reviewItem.classList.remove('pdf-review-target-pulse');
      reviewItem.removeEventListener('animationend', handleAnimationEnd);
    };

    reviewItem.addEventListener('animationend', handleAnimationEnd);
  };

  const scrollToReviewItem = (itemId: string, pageIndex: number) => {
    setActivePage(pageIndex);

    if (isMobileViewport) {
      setReviewPanelOpen(false);
    }

    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }

    requestAnimationFrame(() => {
      const reviewItem = document.getElementById(getReviewItemAnchorId(itemId));

      if (reviewItem) {
        reviewItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        pulseTimeoutRef.current = window.setTimeout(() => {
          pulseReviewItem(itemId);
          pulseTimeoutRef.current = null;
        }, REVIEW_ITEM_PULSE_DELAY_MS);
        return;
      }

      scrollToPage(pageIndex);
      pulseTimeoutRef.current = window.setTimeout(() => {
        pulseReviewItem(itemId);
        pulseTimeoutRef.current = null;
      }, REVIEW_ITEM_PULSE_DELAY_MS + 80);
    });
  };

  return {
    appHeaderRef,
    appShellRef,
    scrollToPage,
    scrollToReviewItem,
    viewerColumnRef,
  };
}
