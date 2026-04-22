export type ZoomAnchorSource = 'pinch' | 'wheel' | 'keyboard' | 'control';

export interface ZoomAnchor {
  clientX?: number;
  clientY?: number;
  source: ZoomAnchorSource;
}

export interface ZoomSnapshot {
  anchorOffsetX: number;
  anchorOffsetY: number;
  contentX: number;
  contentY: number;
  previousZoom: number;
}

export interface ScrollGeometry {
  clientHeight: number;
  clientWidth: number;
  left: number;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  top: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clampAnchorOffset = (value: number | undefined, start: number, size: number) => {
  if (!Number.isFinite(value) || size <= 0) {
    return Math.max(size / 2, 0);
  }

  return clamp((value as number) - start, 0, size);
};

export function createZoomSnapshot({
  anchor,
  geometry,
  zoom,
}: {
  anchor?: ZoomAnchor;
  geometry: ScrollGeometry;
  zoom: number;
}): ZoomSnapshot {
  const anchorOffsetX = clampAnchorOffset(anchor?.clientX, geometry.left, geometry.clientWidth);
  const anchorOffsetY = clampAnchorOffset(anchor?.clientY, geometry.top, geometry.clientHeight);

  return {
    anchorOffsetX,
    anchorOffsetY,
    contentX: geometry.scrollLeft + anchorOffsetX,
    contentY: geometry.scrollTop + anchorOffsetY,
    previousZoom: zoom,
  };
}

export function getScrollPositionForZoom({
  geometry,
  nextZoom,
  snapshot,
}: {
  geometry: Pick<ScrollGeometry, 'clientHeight' | 'clientWidth' | 'scrollHeight' | 'scrollWidth'>;
  nextZoom: number;
  snapshot: ZoomSnapshot;
}) {
  const scaleRatio = nextZoom / Math.max(snapshot.previousZoom, Number.EPSILON);
  const nextContentX = snapshot.contentX * scaleRatio;
  const nextContentY = snapshot.contentY * scaleRatio;
  const maxScrollLeft = Math.max(geometry.scrollWidth - geometry.clientWidth, 0);
  const maxScrollTop = Math.max(geometry.scrollHeight - geometry.clientHeight, 0);

  return {
    scrollLeft:
      maxScrollLeft <= 0 ? 0 : clamp(nextContentX - snapshot.anchorOffsetX, 0, maxScrollLeft),
    scrollTop: maxScrollTop <= 0 ? 0 : clamp(nextContentY - snapshot.anchorOffsetY, 0, maxScrollTop),
  };
}

export function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();

  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
