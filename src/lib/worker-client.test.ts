import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RedactorWorkerClient, extractTransferables } from './worker-client';
import type { WorkerRequest, WorkerResponse } from './types';

class FakeWorker {
  static instances: FakeWorker[] = [];

  private listeners: Record<string, Array<(event: MessageEvent<WorkerResponse>) => void>> = {
    message: [],
    error: [],
  };

  lastPosted?: { message: WorkerRequest; transferables: Transferable[] };

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: 'message' | 'error', listener: (event: MessageEvent<WorkerResponse>) => void) {
    this.listeners[type].push(listener);
  }

  postMessage(message: WorkerRequest, transferables: Transferable[]) {
    this.lastPosted = { message, transferables };

    const response: WorkerResponse =
      message.type === 'LOAD_PDF'
        ? {
            requestId: message.requestId,
            type: 'PDF_LOADED',
            payload: {
              source: {
                name: message.payload.name,
                size: message.payload.size,
                pageCount: 1,
                mimeType: message.payload.mimeType,
                fingerprint: 'fixture',
              },
              pages: [],
              spans: [],
              warnings: [],
              ocrLanguages: ['eng'],
              needsOcrLanguageSelection: false,
              ocrCompleted: true,
            },
          }
        : {
            requestId: message.requestId,
            type: 'READY',
          };

    queueMicrotask(() => {
      this.listeners.message.forEach((listener) => listener({ data: response } as MessageEvent<WorkerResponse>));
    });
  }
}

describe('extractTransferables', () => {
  it('collects ArrayBuffers recursively', () => {
    const buffer = new ArrayBuffer(12);
    const nested = { payload: { file: buffer, view: new Uint8Array(buffer) } };
    const transferables = extractTransferables(nested);

    expect(transferables).toHaveLength(1);
    expect(transferables[0]).toBe(buffer);
  });
});

describe('RedactorWorkerClient', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.Worker = originalWorker;
  });

  it('posts fixture bytes as transferable payloads for LOAD_PDF', async () => {
    const fixturePath = path.join(process.cwd(), 'testing', 'searchable-text.pdf');
    const fixture = fs.readFileSync(fixturePath);
    const client = new RedactorWorkerClient();

    await client.loadPdf({
      file: fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength),
      name: 'searchable-text.pdf',
      size: fixture.byteLength,
      mimeType: 'application/pdf',
    });

    const worker = FakeWorker.instances[0];
    expect(worker.lastPosted?.message.type).toBe('LOAD_PDF');
    expect(worker.lastPosted?.transferables).toHaveLength(1);
    expect(worker.lastPosted?.message.type === 'LOAD_PDF' && worker.lastPosted.message.payload.file.byteLength).toBe(
      fixture.byteLength,
    );
  });
});
