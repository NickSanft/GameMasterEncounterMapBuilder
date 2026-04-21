/**
 * Pure helpers for compacting a fog-of-war grid into a list of
 * single-row run-length rectangles, plus a renderer that paints those
 * rects with a given fillStyle.
 *
 * These are the same operations `drawFog` has always done inline; the
 * separation lets the same logic run inside a Web Worker (see
 * `fog-worker.ts`) without dragging in any DOM dependency.
 */

export interface FogRect {
  /** Column index of the leftmost cell in the run. */
  x: number;
  /** Row index. */
  y: number;
  /** Run length in cells (always >= 1). */
  w: number;
}

/**
 * Walk the fog grid row-by-row and emit a `{x, y, w}` rectangle for
 * every contiguous run of hidden cells (`fog[i] === 0`). Cells with any
 * other value are treated as revealed. Out-of-range dimensions return
 * an empty list.
 */
export function compactFogRects(
  fog: ArrayLike<number>,
  cols: number,
  rows: number,
): FogRect[] {
  const rects: FogRect[] = [];
  if (cols <= 0 || rows <= 0) return rects;
  for (let y = 0; y < rows; y++) {
    let runStart = -1;
    for (let x = 0; x < cols; x++) {
      const hidden = fog[y * cols + x] === 0;
      if (hidden && runStart === -1) {
        runStart = x;
      } else if (!hidden && runStart !== -1) {
        rects.push({ x: runStart, y, w: x - runStart });
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      rects.push({ x: runStart, y, w: cols - runStart });
    }
  }
  return rects;
}

/**
 * Paint a list of compacted fog rectangles, scaling each by `cellSize`.
 * The caller is responsible for setting `ctx.fillStyle`.
 */
export function drawCompactedFogRects(
  ctx: CanvasRenderingContext2D,
  rects: readonly FogRect[],
  cellSize: number,
): void {
  for (const r of rects) {
    ctx.fillRect(r.x * cellSize, r.y * cellSize, r.w * cellSize, cellSize);
  }
}

/**
 * Cheap content-equality check between two fog grids of the same
 * dimensions — used by the fog-worker client to dedupe identical-state
 * requests. Returns false on length mismatch.
 */
export function fogEquals(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
