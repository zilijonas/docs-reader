import { useEffect, useMemo, useRef, useState } from 'react';

import { copy } from '@/lib/copy';
import type { ProcessingProgress } from '../../../types';
import {
  DROPZONE_REASSURANCE_INTERVAL_MS,
  getDropzoneReassuranceMessages,
} from './dropzoneMessaging';

function useSmoothProgress(progress: ProcessingProgress | null) {
  const [smoothed, setSmoothed] = useState(0);
  const realRef = useRef(0);

  useEffect(() => {
    if (!progress) {
      realRef.current = 0;
      setSmoothed(0);
      return;
    }

    realRef.current = progress.progress;

    if (progress.phase === 'complete') {
      setSmoothed(1);
      return;
    }

    setSmoothed((prev) => Math.max(prev, progress.progress));
  }, [progress]);

  useEffect(() => {
    if (!progress || progress.phase === 'complete' || progress.phase === 'error') {
      return;
    }

    let raf = 0;
    const tick = () => {
      setSmoothed((prev) => {
        const real = realRef.current;
        const cap = Math.min(0.95, real + 0.12);
        if (prev >= cap) {
          return prev;
        }
        return Math.min(cap, prev + 0.0025);
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return smoothed;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function useRotatingMessage(messages: string[], disabled: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [messages]);

  useEffect(() => {
    if (disabled || messages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, DROPZONE_REASSURANCE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [disabled, messages]);

  return messages[index] ?? messages[0] ?? '';
}

export function useDropzoneState(progress: ProcessingProgress | null) {
  const [isHovering, setIsHovering] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const progressValue = useSmoothProgress(progress);
  const reassuranceMessages = useMemo(() => getDropzoneReassuranceMessages(progress), [progress]);
  const activeReassurance = useRotatingMessage(reassuranceMessages, prefersReducedMotion);
  const progressMessage = progress?.message ?? copy.dropzone.preparing;
  const progressPercent = `${Math.round(progressValue * 100)}%`;

  return {
    activeReassurance,
    isHovering,
    prefersReducedMotion,
    progressMessage,
    progressPercent,
    progressValue,
    setIsHovering,
  };
}
