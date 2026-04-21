/**
 * Helpers for the Wall state slice.
 *
 * Walls are line segments stored in world-pixel coordinates. Phase 54
 * introduces the state model + tool + GM-only rendering; Phase 55 will
 * consume them for dynamic line-of-sight.
 */

import type { Wall } from './types.js';
import { nid } from '../util/id.js';

/** Pixel thickness of the hit-test band around a wall segment. */
export const WALL_HIT_TOLERANCE_PX = 6;

export interface WallConstructorOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blocksSight?: boolean;
  blocksMovement?: boolean;
}

/**
 * Build a new `Wall` with a generated id. Defaults both `blocksSight`
 * and `blocksMovement` to `true` — the most common case for drawn walls.
 */
export function createWall(opts: WallConstructorOptions): Wall {
  return {
    id: nid(),
    x1: opts.x1,
    y1: opts.y1,
    x2: opts.x2,
    y2: opts.y2,
    blocksSight: opts.blocksSight ?? true,
    blocksMovement: opts.blocksMovement ?? true,
  };
}

/**
 * Squared-distance from a point to a line segment, in the same units
 * the segment was defined in (world pixels for our usage). We return
 * the squared value so hit-test callers can compare against a squared
 * tolerance without a `Math.sqrt` each time.
 */
export function distanceSquaredToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Degenerate (p1 === p2) — just point-to-point distance.
    const ex = px - x1;
    const ey = py - y1;
    return ex * ex + ey * ey;
  }
  // Project (px, py) onto the segment, clamped to [0, 1].
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

/**
 * Return the closest wall to a world-space point within the hit
 * tolerance, or `null` if none is close enough. Used by the GM
 * context-menu to let the user right-click a wall and pick
 * "Delete wall".
 *
 * Walls are iterated in reverse so the most-recently-drawn wall wins
 * when two overlap (matching the user's mental "top layer" model).
 */
export function hitTestWalls(
  walls: readonly Wall[],
  px: number,
  py: number,
  tolerancePx: number = WALL_HIT_TOLERANCE_PX,
): Wall | null {
  const tolSq = tolerancePx * tolerancePx;
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i]!;
    const dSq = distanceSquaredToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
    if (dSq <= tolSq) return w;
  }
  return null;
}

/** Euclidean length of a wall in world pixels. */
export function wallLength(w: Pick<Wall, 'x1' | 'y1' | 'x2' | 'y2'>): number {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  return Math.hypot(dx, dy);
}
