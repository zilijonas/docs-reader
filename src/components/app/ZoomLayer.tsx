import { useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/cn';

type Size = {
  height: number;
  width: number;
};

const INITIAL_SIZE: Size = {
  height: 0,
  width: 0,
};

export function ZoomLayer({
  children,
  innerProps,
  zoom,
}: PropsWithChildren<{
  innerProps?: HTMLAttributes<HTMLDivElement>;
  zoom: number;
}>) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [baseSize, setBaseSize] = useState<Size>(INITIAL_SIZE);

  useLayoutEffect(() => {
    const innerElement = innerRef.current;

    if (!innerElement) {
      return;
    }

    const syncSize = () => {
      const nextWidth = innerElement.offsetWidth;
      const nextHeight = innerElement.offsetHeight;

      setBaseSize((currentSize) => {
        if (currentSize.width === nextWidth && currentSize.height === nextHeight) {
          return currentSize;
        }

        return {
          height: nextHeight,
          width: nextWidth,
        };
      });
    };

    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(innerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const outerWidth = baseSize.width > 0 ? `${baseSize.width * zoom}px` : undefined;
  const outerHeight = baseSize.height > 0 ? `${baseSize.height * zoom}px` : undefined;

  return (
    <div
      className="zoom-outer"
      style={{
        height: outerHeight,
        width: outerWidth,
      }}
    >
      <div
        {...innerProps}
        className={cn('zoom-inner', innerProps?.className)}
        ref={innerRef}
        style={{
          ...innerProps?.style,
          transform: `scale(${zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
