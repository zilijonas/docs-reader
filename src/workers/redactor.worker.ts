/// <reference lib="webworker" />

import type { WorkerRequest } from '../types';
import { postMessageSafe } from './lib/state';
import { router } from './lib/router';

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    await router[message.type](message as never);
  } catch (error) {
    postMessageSafe({
      requestId: message.requestId,
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Something went wrong.',
        recoverable: message.type !== 'INIT',
      },
    });
  }
};
