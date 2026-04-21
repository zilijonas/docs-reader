import { startTransition, useEffect, useRef } from 'react';

import type { ProcessingProgress, WorkerResponse } from '../../../types';
import { getRedactorWorkerClient, type RedactorWorkerClient } from '../../../lib/worker-client';

export function useWorkerClient({
  onInitError,
  onProgress,
  onWarning,
}: {
  onInitError: (message: string) => void;
  onProgress: (progress: ProcessingProgress | null | ((current: ProcessingProgress | null) => ProcessingProgress | null)) => void;
  onWarning: (message: string) => void;
}) {
  const clientRef = useRef<RedactorWorkerClient>(getRedactorWorkerClient());

  useEffect(() => {
    const client = clientRef.current;
    const unsubscribe = client.subscribe((message: WorkerResponse) => {
      if (message.type === 'PROGRESS') {
        startTransition(() => onProgress(message.payload));
      }

      if (message.type === 'WARNING') {
        onWarning(message.payload.message);
      }
    });

    client
      .init({ baseUrl: import.meta.env.BASE_URL })
      .then(() => {
        startTransition(() =>
          onProgress((currentProgress) => (currentProgress?.phase === 'booting' ? null : currentProgress)),
        );
      })
      .catch((caughtError) => {
        onInitError(caughtError instanceof Error ? caughtError.message : 'Could not initialize the worker runtime.');
      });

    return unsubscribe;
  }, [onInitError, onProgress, onWarning]);

  return clientRef;
}
