/**
 * Phase 114 — `blocksMovement` enforcement on the token-drag commit path.
 *
 * Walls have had a `blocksMovement` flag since Phase 54 (and Phase 113's
 * door state wraps it via `wallBlocksMovementEffective`), but until now
 * the flag did nothing — token drags went straight through. Phase 114
 * makes the drag path actually respect it: when the GM drags a token
 * to a cell whose straight-line path from the start cell would cross
 * a movement-blocking wall, the move is clamped to the latest cell
 * along the line that's still reachable.
 *
 * Algorithm (kept simple to ship; a full A* pathfinder is a separate phase):
 *   1. Collect all walls where `wallBlocksMovementEffective` is true,
 *      expanding block walls to their 4 perimeter edges.
 *   2. Walk the line from start cell to end cell using Bresenham.
 *   3. For each step, test the segment from prev-cell-center to
 *      next-cell-center against every blocker. First intersection stops
 *      the walk; the prev cell becomes the clamped destination.
 *
 * This is straight-line movement (not pathfinding). A drag that would
 * route around a corner just gets clamped at the corner; the GM can
 * follow up with a second drag to continue. That matches the existing
 * "you control the path" interaction model — the renderer doesn't
 * auto-route either.
 */

import type { Wall } from './types.js';
import { wallToSegments, wallBlocksMovementEffective } from './walls.js';

export interface ClampMoveResult {
  /** Final destination cell after clamping (may equal the input end cell). */
  cellX: number;
  cellY: number;
  /** True when the move was clamped short of the requested end cell. */
  blocked: boolean;
}

/**
 * Pure helper. Returns the destination cell after clamping.
 *
 * - When `walls` has no movement-blocking entries, the end cell passes
 *   through unchanged (early-out — perf parity for the common case
 *   of a no-walls map).
 * - When `(startCellX, startCellY) === (endCellX, endCellY)`, the
 *   helper returns the start cell with `blocked: false`.
 */
export function clampMoveAgainstWalls(
  startCellX: number,
  startCellY: number,
  endCellX: number,
  endCellY: number,
  walls: readonly Wall[],
  cellSize: number,
): ClampMoveResult {
  if (startCellX === endCellX && startCellY === endCellY) {
    return { cellX: startCellX, cellY: startCellY, blocked: false };
  }
  // Collect the effective blocker segments once. Open doors return
  // false from `wallBlocksMovementEffective` (Phase 113), so they
  // drop out automatically.
  type Seg = { x1: number; y1: number; x2: number; y2: number };
  const blockers: Seg[] = [];
  for (const w of walls) {
    if (!wallBlocksMovementEffective(w)) continue;
    for (const s of wallToSegments(w, cellSize)) {
      blockers.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
    }
  }
  if (blockers.length === 0) {
    return { cellX: endCellX, cellY: endCellY, blocked: false };
  }

  // Bresenham line walk. We test the SEGMENT from prev cell center to
  // candidate next cell center against every blocker; the first
  // intersection stops the walk at prev.
  const path = bresenhamLine(startCellX, startCellY, endCellX, endCellY);
  let curX = startCellX;
  let curY = startCellY;
  for (let i = 1; i < path.length; i++) {
    const next = path[i]!;
    const x1 = (curX + 0.5) * cellSize;
    const y1 = (curY + 0.5) * cellSize;
    const x2 = (next.x + 0.5) * cellSize;
    const y2 = (next.y + 0.5) * cellSize;
    let crosses = false;
    for (const s of blockers) {
      if (segmentsIntersect(x1, y1, x2, y2, s.x1, s.y1, s.x2, s.y2)) {
        crosses = true;
        break;
      }
    }
    if (crosses) {
      return { cellX: curX, cellY: curY, blocked: true };
    }
    curX = next.x;
    curY = next.y;
  }
  return { cellX: curX, cellY: curY, blocked: false };
}

/**
 * Standard Bresenham line algorithm. Returns the list of cells along
 * the line from (x0, y0) to (x1, y1) inclusive. Used by
 * `clampMoveAgainstWalls` to step through the cells the move passes
 * through; exported for testing.
 */
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  // Bounded by the Chebyshev distance + 1 — line walks can't exceed
  // that. Belt-and-suspenders against runaway loops on malformed input.
  const maxSteps = Math.max(dx, dy) + 2;
  for (let i = 0; i < maxSteps; i++) {
    out.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

/**
 * Standard segment-vs-segment intersection (orientation tests +
 * collinear-overlap fallback). Returns `true` when (p1, p2) and
 * (p3, p4) share at least one common point.
 *
 * Note on touching endpoints: a segment that just barely touches the
 * start cell's center counts as an intersection. In practice the
 * Bresenham walker steps cell-by-cell, so a wall that runs through a
 * cell center is correctly treated as blocking.
 */
export function segmentsIntersect(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  p4x: number,
  p4y: number,
): boolean {
  const o1 = orient(p1x, p1y, p2x, p2y, p3x, p3y);
  const o2 = orient(p1x, p1y, p2x, p2y, p4x, p4y);
  const o3 = orient(p3x, p3y, p4x, p4y, p1x, p1y);
  const o4 = orient(p3x, p3y, p4x, p4y, p2x, p2y);
  if (o1 !== o2 && o3 !== o4) return true;
  // Collinear special cases — treat any shared point as an intersection.
  if (o1 === 0 && onSegment(p1x, p1y, p3x, p3y, p2x, p2y)) return true;
  if (o2 === 0 && onSegment(p1x, p1y, p4x, p4y, p2x, p2y)) return true;
  if (o3 === 0 && onSegment(p3x, p3y, p1x, p1y, p4x, p4y)) return true;
  if (o4 === 0 && onSegment(p3x, p3y, p2x, p2y, p4x, p4y)) return true;
  return false;
}

function orient(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): -1 | 0 | 1 {
  const v = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

function onSegment(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): boolean {
  return (
    bx <= Math.max(ax, cx) &&
    bx >= Math.min(ax, cx) &&
    by <= Math.max(ay, cy) &&
    by >= Math.min(ay, cy)
  );
}
