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
import {
  computeVisibilityPolygon,
  type LosPoint,
  type LosSegment,
} from '../state/los.js';

export interface LosViewer {
  x: number;
  y: number;
  radius: number;
}

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
  /**
   * Hand the latest viewers + lights + walls to the worker for
   * line-of-sight + lighting polygon computation. Returns the cached
   * viewer polygons if all three lists are unchanged since the last
   * call, otherwise kicks off a new request and returns the previous
   * cache (may be null on first call). Light polygons are retrieved
   * separately via `getLatestLightPolygons()` — the listener fires
   * once per fresh response and callers should re-read both arrays.
   *
   * `lights` defaults to `[]` so callers that don't yet wire lighting
   * keep their Phase 55 behavior.
   */
  requestLos(
    viewers: readonly LosViewer[],
    walls: readonly LosSegment[],
    lights?: readonly LosViewer[],
  ): LosPoint[][] | null;
  /** Latest LoS polygons (one per viewer, same order as the last request). */
  getLatestPolygons(): LosPoint[][] | null;
  /** Latest light polygons (Phase 57; one per light, same order as request). */
  getLatestLightPolygons(): LosPoint[][] | null;
  /**
   * Subscribe to fresh-polygons-available events. Receives BOTH viewer
   * polygons and light polygons so the listener can compose them in
   * one tick (e.g. recompute spectator fog mask).
   */
  onLosUpdate(
    listener: (polygons: LosPoint[][], lightPolygons: LosPoint[][]) => void,
  ): () => void;
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

interface PendingLosRequest {
  requestId: number;
  signature: string;
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

  let pendingLos: PendingLosRequest | null = null;
  let latestPolygons: LosPoint[][] | null = null;
  let latestLightPolygons: LosPoint[][] | null = null;
  let latestLosSignature: string | null = null;
  const losListeners = new Set<
    (polys: LosPoint[][], lightPolys: LosPoint[][]) => void
  >();

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
    const data = event.data as {
      type?: string;
      requestId?: number;
      rects?: FogRect[];
      polygons?: LosPoint[][];
      lightPolygons?: LosPoint[][];
    };
    if (!data) return;
    if (data.type === 'compacted') {
      if (!pending || data.requestId !== pending.requestId) return;
      if (!data.rects) return;
      latestRects = data.rects;
      latestFog = pending.fog;
      latestCols = pending.cols;
      latestRows = pending.rows;
      pending = null;
      notify();
      return;
    }
    if (data.type === 'los-ready') {
      if (!pendingLos || data.requestId !== pendingLos.requestId) return;
      if (!data.polygons) return;
      latestPolygons = data.polygons;
      latestLightPolygons = data.lightPolygons ?? [];
      latestLosSignature = pendingLos.signature;
      pendingLos = null;
      notifyLos();
      return;
    }
  }

  function notify(): void {
    if (!latestRects) return;
    for (const l of listeners) l(latestRects);
  }

  function notifyLos(): void {
    if (!latestPolygons) return;
    const lights = latestLightPolygons ?? [];
    for (const l of losListeners) l(latestPolygons, lights);
  }

  function losSignatureOf(
    viewers: readonly LosViewer[],
    walls: readonly LosSegment[],
    lights: readonly LosViewer[],
  ): string {
    // A cheap stable hash — sort-independent by construction since the
    // renderer calls requestLos with stable ordering. Kept short so
    // equality checks don't dominate frame budget on big maps.
    const vs = viewers
      .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.radius.toFixed(2)}`)
      .join('|');
    const ls = lights
      .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.radius.toFixed(2)}`)
      .join('|');
    const ws = walls
      .map(
        (w) =>
          `${w.x1.toFixed(2)},${w.y1.toFixed(2)},${w.x2.toFixed(2)},${w.y2.toFixed(2)}`,
      )
      .join('|');
    return `${vs}#${ls}#${ws}`;
  }

  function losInline(
    viewers: readonly LosViewer[],
    walls: readonly LosSegment[],
    lights: readonly LosViewer[],
  ): LosPoint[][] {
    const polys = viewers.map((v) =>
      computeVisibilityPolygon({ x: v.x, y: v.y }, v.radius, walls),
    );
    const lightPolys = lights.map((v) =>
      computeVisibilityPolygon({ x: v.x, y: v.y }, v.radius, walls),
    );
    latestPolygons = polys;
    latestLightPolygons = lightPolys;
    latestLosSignature = losSignatureOf(viewers, walls, lights);
    return polys;
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

  function requestLos(
    viewers: readonly LosViewer[],
    walls: readonly LosSegment[],
    lights: readonly LosViewer[] = [],
  ): LosPoint[][] | null {
    // Fast path: no viewers → nothing to compute.
    if (viewers.length === 0) {
      latestPolygons = [];
      latestLightPolygons = [];
      latestLosSignature = losSignatureOf(viewers, walls, lights);
      return latestPolygons;
    }
    const sig = losSignatureOf(viewers, walls, lights);
    if (latestPolygons && latestLosSignature === sig) return latestPolygons;
    // Use the worker when it's already warm from fog compaction;
    // otherwise run inline. Unlike fog compaction there's no
    // useWorkerThreshold cutoff because tiny LoS is also tiny inline.
    const useWorker = !forceFallback && worker !== null;
    if (!useWorker) {
      return losInline(viewers, walls, lights);
    }
    const w = worker!;
    const requestId = nextRequestId++;
    pendingLos = { requestId, signature: sig };
    w.postMessage({
      type: 'compute-los',
      requestId,
      viewers: viewers.map((v) => ({ x: v.x, y: v.y, radius: v.radius })),
      lights: lights.map((v) => ({ x: v.x, y: v.y, radius: v.radius })),
      walls: walls.map((seg) => ({ x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 })),
    });
    // Return the previous cache so the renderer has SOMETHING to clip
    // against until the worker responds.
    return latestPolygons;
  }

  return {
    request,
    getLatest: () => latestRects,
    onUpdate(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    requestLos,
    getLatestPolygons: () => latestPolygons,
    getLatestLightPolygons: () => latestLightPolygons,
    onLosUpdate(listener) {
      losListeners.add(listener);
      return () => losListeners.delete(listener);
    },
    isUsingWorker: () => worker !== null,
    destroy() {
      if (worker) {
        worker.removeEventListener('message', onWorkerMessage);
        worker.terminate();
        worker = null;
      }
      pending = null;
      pendingLos = null;
      listeners.clear();
      losListeners.clear();
    },
  };
}
