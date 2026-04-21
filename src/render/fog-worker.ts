/// <reference lib="webworker" />
/**
 * Off-main-thread fog compaction.
 *
 * The main thread posts the current fog buffer + dimensions; the worker
 * runs `compactFogRects` and posts the result back. The fog buffer is
 * passed by reference through the Transferable interface (zero-copy),
 * so even very large grids cost ~constant time to ship across.
 *
 * Protocol (kept tiny on purpose):
 *   in  : { type: 'compact', requestId, fog, cols, rows }
 *   out : { type: 'compacted', requestId, rects }
 *
 * The `requestId` lets the client correlate responses with the request
 * that produced them — newer requests can supersede older ones safely.
 *
 * Imports from `./fog-rects.js` because the helper is dependency-free
 * (no DOM, no state). Vite bundles the worker as its own module so the
 * helper is duplicated into the worker bundle without dragging the rest
 * of the renderer along.
 */
import { compactFogRects, type FogRect } from './fog-rects.js';

export interface CompactRequest {
  type: 'compact';
  requestId: number;
  fog: Uint8Array;
  cols: number;
  rows: number;
}

export interface CompactResponse {
  type: 'compacted';
  requestId: number;
  rects: FogRect[];
}

// `self` inside a worker is a DedicatedWorkerGlobalScope.
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<CompactRequest>) => {
  const data = event.data;
  if (!data || data.type !== 'compact') return;
  const rects = compactFogRects(data.fog, data.cols, data.rows);
  const response: CompactResponse = {
    type: 'compacted',
    requestId: data.requestId,
    rects,
  };
  ctx.postMessage(response);
});
