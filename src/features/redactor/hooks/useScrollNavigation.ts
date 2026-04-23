import { usePinch, useWheel } from '@use-gesture/react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { REDACTOR_UI, getPageAnchorId, getReviewItemAnchorId } from '../config';
import {
  createZoomSnapshot,
  getScrollPositionForZoom,
  isEditableElement,
  type ZoomAnchor,
} from './zoom-utils';

const REVIEW_ITEM_PULSE_DELAY_MS = 520;

const getZoomContentOffset = (viewerColumn: HTMLDivElement, viewerRect: DOMRect) => {
  const zoomOuter = viewerColumn.querySelector<HTMLElement>('[data-zoom-outer="true"]');

  if (!zoomOuter) {
    return {
      x: 0,
      y: 0,
    };
  }

  const zoomOuterRect = zoomOuter.getBoundingClientRect();

  return {
    x: viewerColumn.scrollLeft + (zoomOuterRect.left - viewerRect.left),
    y: viewerColumn.scrollTop + (zoomOuterRect.top - viewerRect.top),
  };
};

export function useScrollNavigation({
  appHeaderHeight,
  hasViewer,
  isMobileViewport,
  isSidebarOpen,
  setActivePage,
  setAppHeaderHeight,
  setReviewPanelOpen,
  setViewerContentWidth,
  setZoomState,
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
  setZoomState: (value: number) => void;
  zoom: number;
}) {
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appHeaderRef = useRef<HTMLElement | null>(null);
  const viewerColumnRef = useRef<HTMLDivElement | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const pendingZoomSnapshotRef = useRef<ReturnType<typeof createZoomSnapshot> | null>(null);
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

  const setZoom = (value: number, anchor?: ZoomAnchor) => {
    const nextZoom = Math.min(REDACTOR_UI.maxZoom, Math.max(REDACTOR_UI.minZoom, value));

    if (nextZoom === zoomRef.current) {
      return;
    }

    const viewerColumn = viewerColumnRef.current;

    if (viewerColumn) {
      const viewerRect = viewerColumn.getBoundingClientRect();
      const contentOffset = getZoomContentOffset(viewerColumn, viewerRect);
      pendingZoomSnapshotRef.current = createZoomSnapshot({
        anchor,
        contentOffsetX: contentOffset.x,
        contentOffsetY: contentOffset.y,
        geometry: {
          clientHeight: viewerColumn.clientHeight,
          clientWidth: viewerColumn.clientWidth,
          left: viewerRect.left,
          scrollHeight: viewerColumn.scrollHeight,
          scrollLeft: viewerColumn.scrollLeft,
          scrollTop: viewerColumn.scrollTop,
          scrollWidth: viewerColumn.scrollWidth,
          top: viewerRect.top,
        },
        zoom: zoomRef.current,
      });
    } else {
      pendingZoomSnapshotRef.current = null;
    }

    setZoomState(nextZoom);
  };

  useLayoutEffect(() => {
    const viewerColumn = viewerColumnRef.current;
    const snapshot = pendingZoomSnapshotRef.current;

    if (!viewerColumn || !snapshot || snapshot.previousZoom === zoom) {
      return;
    }

    const nextScroll = getScrollPositionForZoom({
      contentOffsetX: getZoomContentOffset(viewerColumn, viewerColumn.getBoundingClientRect()).x,
      contentOffsetY: getZoomContentOffset(viewerColumn, viewerColumn.getBoundingClientRect()).y,
      geometry: {
        clientHeight: viewerColumn.clientHeight,
        clientWidth: viewerColumn.clientWidth,
        scrollHeight: viewerColumn.scrollHeight,
        scrollWidth: viewerColumn.scrollWidth,
      },
      nextZoom: zoom,
      snapshot,
    });

    viewerColumn.scrollLeft = nextScroll.scrollLeft;
    viewerColumn.scrollTop = nextScroll.scrollTop;
    pendingZoomSnapshotRef.current = null;
  }, [zoom]);

  usePinch(
    ({ event, first, offset: [scale], origin: [clientX, clientY], memo }) => {
      if (!hasViewer) {
        return memo;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const pinchStartZoom = first ? zoomRef.current : (memo ?? zoomRef.current);

      setZoom(pinchStartZoom * scale, {
        clientX,
        clientY,
        source: 'pinch',
      });

      return pinchStartZoom;
    },
    {
      eventOptions: { passive: false },
      pinchOnWheel: false,
      pointer: { touch: true },
      target: viewerColumnRef,
    },
  );

  useWheel(
    ({ event }) => {
      if (!hasViewer || (!event.ctrlKey && !event.metaKey) || !event.cancelable) {
        return;
      }

      event.preventDefault();

      setZoom(zoomRef.current * Math.exp(-event.deltaY * 0.0025), {
        clientX: event.clientX,
        clientY: event.clientY,
        source: 'wheel',
      });
    },
    {
      eventOptions: { passive: false },
      target: viewerColumnRef,
    },
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey || isEditableElement(event.target)) {
        return;
      }

      const normalizedKey = event.key.toLowerCase();

      if (normalizedKey === '0') {
        event.preventDefault();
        setZoom(REDACTOR_UI.defaultZoom, { source: 'keyboard' });
        return;
      }

      if (normalizedKey === '+' || normalizedKey === '=' || normalizedKey === 'add') {
        event.preventDefault();
        setZoom(zoomRef.current + REDACTOR_UI.zoomStep, { source: 'keyboard' });
        return;
      }

      if (normalizedKey === '-' || normalizedKey === '_' || normalizedKey === 'subtract') {
        event.preventDefault();
        setZoom(zoomRef.current - REDACTOR_UI.zoomStep, { source: 'keyboard' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        viewerColumn && viewerColumn.scrollHeight > viewerColumn.clientHeight
          ? viewerColumn
          : window;

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
    setZoom,
    viewerColumnRef,
  };
}
