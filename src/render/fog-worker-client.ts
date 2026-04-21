/**
 * Main-thread façade in front of the fog worker.
 *
 * The client owns:
 *  - A single Worker instance (constructed lazily on first request).
 *  - A monotonically-increasing `requestId` so we can ignore stale
 *    responses when the user paints faster than the worker can reply.
 *  - A latest-rects cache the renderer can poll synchronously.
 *
 * Falls back to a synchronous in-process implementation when:
 *  - `window.Worker` is missing (jsdom, very old browsers).
 *  - Worker construction throws (e.g. file:// origins, blocked CSP).
 *  - The grid is small enough that worker round-trip cost would exceed
 *    inline compaction (`useWorkerThreshold`, default 4 000 cells).
 *
 * Tests pass `forceFallback: true` so they don't have to spin up a real
 * Worker; the production renderer constructs the client once at boot.
 */
import {
  compactFogRects,
  fogEquals,
  type FogRect,
} from './fog-rects.js';

export interface FogWorkerClient {
  /**
   * Hand the latest fog state to the worker. Returns the rects either
   * synchronously (when running in fallback mode or when the cache
   * already matches) or asynchronously via `onUpdate` once the worker
   * responds.
   */
  request(fog: Uint8Array, cols: number, rows: number): FogRect[] | null;
  /** Latest rects produced for the most recent successful request. */
  getLatest(): FogRect[] | null;
  /** Subscribe to fresh-rects-available events. Returns an unsubscribe fn. */
  onUpdate(listener: (rects: FogRect[]) => void): () => void;
  /** True when the underlying real Worker is in use. */
  isUsingWorker(): boolean;
  destroy(): void;
}

export interface FogWorkerClientOptions {
  /** Skip the worker entirely (handy for tests and small grids). */
  forceFallback?: boolean;
  /**
   * Grid sizes (cols * rows) below this threshold compact synchronously
   * on the main thread; above it, the worker is preferred. Defaults to
   * 4 000 cells (i.e. ~63×63), the point at which the per-frame
   * compaction reliably exceeds 0.5ms in our profiling.
   */
  useWorkerThreshold?: number;
  /**
   * Custom Worker factory. Production passes a Vite `?worker` import
   * default-export; tests can pass a stub.
   */
  workerFactory?: () => Worker;
}

interface PendingRequest {
  requestId: number;
  fog: Uint8Array;
  cols: number;
  rows: number;
}

export function createFogWorkerClient(
  options: FogWorkerClientOptions = {},
): FogWorkerClient {
  const { forceFallback = false, useWorkerThreshold = 4000, workerFactory } = options;

  let worker: Worker | null = null;
  let workerInitFailed = false;
  let nextRequestId = 1;
  let pending: PendingRequest | null = null;
  let latestRects: FogRect[] | null = null;
  let latestFog: Uint8Array | null = null;
  let latestCols = 0;
  let latestRows = 0;
  const listeners = new Set<(rects: FogRect[]) => void>();

  function tryEnsureWorker(): Worker | null {
    if (worker) return worker;
    if (workerInitFailed || forceFallback) return null;
    if (typeof Worker === 'undefined' && !workerFactory) {
      workerInitFailed = true;
      return null;
    }
    try {
      worker = workerFactory ? workerFactory() : null;
      if (!worker) {
        workerInitFailed = true;
        return null;
      }
      worker.addEventListener('message', onWorkerMessage);
      worker.addEventListener('error', () => {
        // If the worker crashes mid-request we silently fall back —
        // the renderer keeps working on the main thread.
        workerInitFailed = true;
        worker?.terminate();
        worker = null;
      });
      return worker;
    } catch {
      workerInitFailed = true;
      worker = null;
      return null;
    }
  }

  function onWorkerMessage(event: MessageEvent) {
    const data = event.data as { type?: string; requestId?: number; rects?: FogRect[] };
    if (!data || data.type !== 'compacted') return;
    if (!pending || data.requestId !== pending.requestId) return;
    if (!data.rects) return;
    latestRects = data.rects;
    latestFog = pending.fog;
    latestCols = pending.cols;
    latestRows = pending.rows;
    pending = null;
    notify();
  }

  function notify(): void {
    if (!latestRects) return;
    for (const l of listeners) l(latestRects);
  }

  function compactInline(fog: Uint8Array, cols: number, rows: number): FogRect[] {
    const rects = compactFogRects(fog, cols, rows);
    latestRects = rects;
    latestFog = fog;
    latestCols = cols;
    latestRows = rows;
    return rects;
  }

  function request(fog: Uint8Array, cols: number, rows: number): FogRect[] | null {
    // Cache hit: same fog → reuse rects immediately, no worker round-trip.
    if (
      latestRects &&
      latestFog &&
      latestCols === cols &&
      latestRows === rows &&
      fogEquals(fog, latestFog)
    ) {
      return latestRects;
    }

    const cellCount = cols * rows;
    const useWorker =
      !forceFallback && cellCount >= useWorkerThreshold && !!tryEnsureWorker();

    if (!useWorker) {
      return compactInline(fog, cols, rows);
    }

    const w = worker!;
    const requestId = nextRequestId++;
    // Copy the fog so the consumer can keep mutating their own buffer
    // — we own the bytes we ship to the worker.
    const fogCopy = new Uint8Array(fog);
    pending = { requestId, fog: fogCopy, cols, rows };
    w.postMessage(
      { type: 'compact', requestId, fog: fogCopy, cols, rows },
      [fogCopy.buffer],
    );
    // Always return SOMETHING the renderer can paint right now. If the
    // worker responds before next frame, the cache updates and the
    // listener triggers a re-render.
    return latestRects;
  }

  return {
    request,
    getLatest: () => latestRects,
    onUpdate(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isUsingWorker: () => worker !== null,
    destroy() {
      if (worker) {
        worker.removeEventListener('message', onWorkerMessage);
        worker.terminate();
        worker = null;
      }
      pending = null;
      listeners.clear();
    },
  };
}
