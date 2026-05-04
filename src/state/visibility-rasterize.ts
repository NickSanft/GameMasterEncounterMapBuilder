/**
 * Phase 135 — grid-shape-aware wrapper around `rasterizeVisibility`.
 *
 * `los.ts` is intentionally import-free so it bundles cleanly into the
 * fog-worker (which has no DOM lib + no hex-geometry deps). This
 * wrapper module is main-thread-only: it imports both `los.ts` (for
 * the rect-mode rasterizer + `pointInPolygon`) AND `hex-geometry.ts`
 * (for hex enumeration + per-hex rect-cell overlap), then dispatches
 * on `gridShape`.
 *
 * Behavior:
 *   - `'square'` (or undefined / pre-Phase-124 saves) — passes through
 *     to `rasterizeVisibility` unchanged.
 *   - `'hex'` — enumerates every hex in the `cols × rows` offset-coord
 *     space, tests whether the hex CENTER is inside any polygon,
 *     and marks every rect cell that overlaps the hex via
 *     `rectCellsOverlappingHex`. The resulting `Uint8Array(cols *
 *     rows)` mask preserves the existing wire-format / rect-fog-buffer
 *     contract; visible cells form hex-shaped halos that match the
 *     manual hex-fog tools (Phases 132 / 133 / 134).
 *
 * This closes the v1.7.0 deferral that "auto-reveal still paints
 * rectangular fog cells" — auto-reveal is now hex-aware too.
 */

import type { LosPoint } from './los.js';
import { rasterizeVisibility, pointInPolygon } from './los.js';
import { hexCenter, rectCellsOverlappingHex } from '../render/hex-geometry.js';
import type { GridShape } from './types.js';

export function rasterizeVisibilityForGrid(
  polygons: readonly (readonly LosPoint[])[],
  cols: number,
  rows: number,
  cellSize: number,
  gridShape: GridShape | undefined,
): Uint8Array {
  if (gridShape !== 'hex') {
    return rasterizeVisibility(polygons, cols, rows, cellSize);
  }
  const mask = new Uint8Array(cols * rows);
  if (polygons.length === 0) return mask;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const center = hexCenter(col, row, cellSize);
      let visible = false;
      for (const poly of polygons) {
        if (pointInPolygon(center.x, center.y, poly)) {
          visible = true;
          break;
        }
      }
      if (!visible) continue;
      for (const c of rectCellsOverlappingHex(
        col,
        row,
        cols,
        rows,
        cellSize,
      )) {
        mask[c.y * cols + c.x] = 1;
      }
    }
  }
  return mask;
}
