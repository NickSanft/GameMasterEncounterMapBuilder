/**
 * Follow-the-fog auto-reveal (Phase 58).
 *
 * Given a set of viewer visibility polygons (already wall-clipped by
 * the LoS pipeline) plus the current GM-painted fog buffer, return the
 * list of cells that should be flipped from "hidden" to "revealed."
 *
 * One-way semantics: only `value: 1` cells come out — auto-reveal
 * never paints `value: 0`. The GM remains the authority for hiding
 * cells (via the Hide tool); auto-reveal just spares them from having
 * to chase moving viewers around with the Reveal tool.
 *
 * Empty inputs short-circuit:
 *   - polygons is empty / null  →  no cells
 *   - all polygon-covered cells are already revealed  →  no cells
 * The caller can use the empty result to skip the `fog-set` patch
 * entirely (which avoids spurious patches over the BroadcastChannel
 * and idle entries in the undo history).
 */

import type { LosPoint } from './los.js';
import { rasterizeVisibilityForGrid } from './visibility-rasterize.js';
import type { GridShape } from './types.js';

export interface FogCell {
  x: number;
  y: number;
  value: 0 | 1;
}

export interface AutoRevealGrid {
  cols: number;
  rows: number;
  cellSize: number;
  /**
   * Phase 135 — `'hex'` switches the rasterizer to hex-aware mode
   * (visible cells form hex-shaped halos matching the manual fog
   * tools). Optional + back-compat — pre-124 callers that don't set
   * `gridShape` get the legacy rect-cell rasterization.
   */
  gridShape?: GridShape;
}

/**
 * Compute the cells that need to be flipped to revealed. Returns an
 * empty array when there are no viewer polygons, when every covered
 * cell is already revealed, or when the polygons are degenerate.
 *
 * Algorithm: rasterize the union of polygons into a per-cell mask
 * (Phase 55's `rasterizeVisibility`), then walk the mask + the current
 * fog in lockstep — emit a cell whenever the mask says "visible" but
 * the fog says "hidden."
 */
export function cellsToReveal(
  polygons: readonly (readonly LosPoint[])[] | null,
  fog: Uint8Array,
  grid: AutoRevealGrid,
): FogCell[] {
  if (!polygons || polygons.length === 0) return [];
  const { cols, rows, cellSize, gridShape } = grid;
  if (fog.length !== cols * rows) return [];

  const mask = rasterizeVisibilityForGrid(
    polygons,
    cols,
    rows,
    cellSize,
    gridShape,
  );
  const out: FogCell[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1 && fog[i] === 0) {
      out.push({ x: i % cols, y: Math.floor(i / cols), value: 1 });
    }
  }
  return out;
}
