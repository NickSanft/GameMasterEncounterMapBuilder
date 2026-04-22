/// <reference lib="webworker" />
/**
 * Off-main-thread fog + line-of-sight compute.
 *
 * The main thread posts two kinds of request:
 *
 *   • `compact` — given the current fog Uint8Array + dimensions, return
 *     run-length-compacted rectangles for cheap per-frame fog painting.
 *     Phase 49 work; unchanged since.
 *   • `compute-los` (Phase 55) — given viewer positions / radii + the
 *     list of sight-blocking wall segments, cast rays and return one
 *     visibility polygon per viewer. The renderer then uses the
 *     polygons as canvas clip paths to mask Spectator fog.
 *
 * Responses carry a `requestId` so newer requests can safely supersede
 * older ones that are still in-flight. Transferable-typed-array args
 * keep the round-trip zero-copy even for big grids.
 */
import { compactFogRects, type FogRect } from './fog-rects.js';
import {
  computeVisibilityPolygon,
  type LosPoint,
  type LosSegment,
} from '../state/los.js';

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

export interface LosRequest {
  type: 'compute-los';
  requestId: number;
  viewers: Array<{ x: number; y: number; radius: number }>;
  /**
   * Phase 57 — light sources (each token's `dim` radius). Optional for
   * back-compat with messages crafted before the lighting feature; an
   * absent or empty array returns `lightPolygons: []` and the renderer
   * skips the lighting mask.
   */
  lights?: Array<{ x: number; y: number; radius: number }>;
  walls: LosSegment[];
}

export interface LosResponse {
  type: 'los-ready';
  requestId: number;
  polygons: LosPoint[][];
  /** Phase 57 — one polygon per light source (parallel to `lights[]`). */
  lightPolygons: LosPoint[][];
}

export type FogWorkerRequest = CompactRequest | LosRequest;
export type FogWorkerResponse = CompactResponse | LosResponse;

// `self` inside a worker is a DedicatedWorkerGlobalScope.
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<FogWorkerRequest>) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'compact') {
    const rects = compactFogRects(data.fog, data.cols, data.rows);
    const response: CompactResponse = {
      type: 'compacted',
      requestId: data.requestId,
      rects,
    };
    ctx.postMessage(response);
    return;
  }
  if (data.type === 'compute-los') {
    const polygons: LosPoint[][] = data.viewers.map((v) =>
      computeVisibilityPolygon({ x: v.x, y: v.y }, v.radius, data.walls),
    );
    // Phase 57 — light sources reuse the same wall list (sight-blocking
    // walls also block light by design). `data.lights` is optional so
    // legacy messages still work; absent → empty light polygons.
    const lights = data.lights ?? [];
    const lightPolygons: LosPoint[][] = lights.map((l) =>
      computeVisibilityPolygon({ x: l.x, y: l.y }, l.radius, data.walls),
    );
    const response: LosResponse = {
      type: 'los-ready',
      requestId: data.requestId,
      polygons,
      lightPolygons,
    };
    ctx.postMessage(response);
    return;
  }
});
