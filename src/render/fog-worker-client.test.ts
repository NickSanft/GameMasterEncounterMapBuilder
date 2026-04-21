import { describe, it, expect, vi } from 'vitest';
import { createFogWorkerClient } from './fog-worker-client.js';

describe('createFogWorkerClient — fallback (no worker)', () => {
  it('compacts inline when forceFallback is true and returns rects synchronously', () => {
    const client = createFogWorkerClient({ forceFallback: true });
    // Row 0: [0,1,0] → rects {0,0,1} and {2,0,1}.  Row 1: [0,1,1] → {0,1,1}.
    const fog = new Uint8Array([0, 1, 0, 0, 1, 1]);
    const rects = client.request(fog, 3, 2);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 1 },
      { x: 2, y: 0, w: 1 },
      { x: 0, y: 1, w: 1 },
    ]);
    expect(client.isUsingWorker()).toBe(false);
  });

  it('caches rects across identical-fog requests (no recomputation)', () => {
    const client = createFogWorkerClient({ forceFallback: true });
    const fog = new Uint8Array([0, 0, 1, 1]);
    const first = client.request(fog, 2, 2);
    // Send the same buffer again — second call should return the same
    // reference because the cached state matches.
    const second = client.request(new Uint8Array([0, 0, 1, 1]), 2, 2);
    expect(second).toBe(first);
  });

  it('returns fresh rects when the fog actually changes', () => {
    const client = createFogWorkerClient({ forceFallback: true });
    const a = client.request(new Uint8Array([0, 0, 1, 1]), 2, 2);
    const b = client.request(new Uint8Array([1, 1, 0, 0]), 2, 2);
    expect(a).not.toBe(b);
    expect(b).toEqual([{ x: 0, y: 1, w: 2 }]);
  });

  it('uses inline fallback for grids below the worker threshold', () => {
    const client = createFogWorkerClient({
      useWorkerThreshold: 10_000,
      // Throw on factory invocation — proves we never tried to spawn one.
      workerFactory: () => {
        throw new Error('worker should not be requested for small grids');
      },
    });
    const fog = new Uint8Array([0]);
    const rects = client.request(fog, 1, 1);
    expect(rects).toEqual([{ x: 0, y: 0, w: 1 }]);
    expect(client.isUsingWorker()).toBe(false);
  });

  it('getLatest() returns the cached rects after request', () => {
    const client = createFogWorkerClient({ forceFallback: true });
    expect(client.getLatest()).toBeNull();
    client.request(new Uint8Array([0, 1]), 2, 1);
    expect(client.getLatest()).toEqual([{ x: 0, y: 0, w: 1 }]);
  });

  it('destroy() is safe even when no worker was ever spawned', () => {
    const client = createFogWorkerClient({ forceFallback: true });
    client.request(new Uint8Array([0]), 1, 1);
    expect(() => client.destroy()).not.toThrow();
  });
});

describe('createFogWorkerClient — worker path (mocked)', () => {
  /**
   * Build a tiny stand-in Worker that lets the test drive the message
   * exchange manually. The client receives messages via the
   * `addEventListener('message', ...)` path, so our fake just needs to
   * dispatch a real `MessageEvent` from a sub-EventTarget.
   */
  interface FakeWorker {
    worker: Worker;
    posted: Array<{ message: unknown; transfer?: Transferable[] }>;
    deliver(message: unknown): void;
    isTerminated(): boolean;
  }

  function makeFakeWorker(): FakeWorker {
    const target = new EventTarget();
    const posted: Array<{ message: unknown; transfer?: Transferable[] }> = [];
    let terminated = false;
    const worker = {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      postMessage: vi.fn((message: unknown, transfer?: Transferable[]) => {
        posted.push({ message, transfer });
      }),
      terminate: vi.fn(() => {
        terminated = true;
      }),
      onmessage: null,
      onerror: null,
      onmessageerror: null,
    } as unknown as Worker;
    return {
      worker,
      posted,
      deliver(message) {
        target.dispatchEvent(new MessageEvent('message', { data: message }));
      },
      isTerminated() {
        return terminated;
      },
    };
  }

  it('posts a compact request to the worker with a fresh requestId', () => {
    const fake = makeFakeWorker();
    const client = createFogWorkerClient({
      useWorkerThreshold: 1,
      workerFactory: () => fake.worker,
    });
    const fog = new Uint8Array(40_000); // big enough to trigger the worker path
    fog[0] = 0;
    client.request(fog, 200, 200);

    expect(fake.posted).toHaveLength(1);
    const sent = fake.posted[0]!.message as { type: string; requestId: number };
    expect(sent.type).toBe('compact');
    expect(typeof sent.requestId).toBe('number');
    // Transferable list contains the fog buffer copy.
    expect(fake.posted[0]!.transfer).toBeDefined();
    expect(fake.posted[0]!.transfer![0]).toBeInstanceOf(ArrayBuffer);
  });

  it('updates getLatest() and notifies subscribers when the worker responds', () => {
    const fake = makeFakeWorker();
    const client = createFogWorkerClient({
      useWorkerThreshold: 1,
      workerFactory: () => fake.worker,
    });
    const updates: number[] = [];
    client.onUpdate((rects) => updates.push(rects.length));

    const fog = new Uint8Array([0, 1, 0]);
    client.request(fog, 3, 1);
    const sent = fake.posted[0]!.message as { requestId: number };

    fake.deliver({
      type: 'compacted',
      requestId: sent.requestId,
      rects: [{ x: 0, y: 0, w: 1 }, { x: 2, y: 0, w: 1 }],
    });

    expect(client.getLatest()).toEqual([
      { x: 0, y: 0, w: 1 },
      { x: 2, y: 0, w: 1 },
    ]);
    expect(updates).toEqual([2]);
  });

  it('ignores stale responses whose requestId does not match the latest pending one', () => {
    const fake = makeFakeWorker();
    const client = createFogWorkerClient({
      useWorkerThreshold: 1,
      workerFactory: () => fake.worker,
    });

    client.request(new Uint8Array([0, 0]), 2, 1);
    const firstId = (fake.posted[0]!.message as { requestId: number }).requestId;
    client.request(new Uint8Array([0, 1]), 2, 1);
    // First (older) response arrives after the second was already
    // requested — must be discarded.
    fake.deliver({
      type: 'compacted',
      requestId: firstId,
      rects: [{ x: 0, y: 0, w: 2 }],
    });
    expect(client.getLatest()).toBeNull();
  });

  it('destroy() terminates the worker', () => {
    const fake = makeFakeWorker();
    const client = createFogWorkerClient({
      useWorkerThreshold: 1,
      workerFactory: () => fake.worker,
    });
    client.request(new Uint8Array(5_000), 100, 50);
    client.destroy();
    expect(fake.isTerminated()).toBe(true);
  });
});
