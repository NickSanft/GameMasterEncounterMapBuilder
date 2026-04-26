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

/**
 * Phase 85 — default wall thickness in screen pixels at zoom = 1.
 * The renderer divides by camera zoom so lines stay visually consistent
 * across zoom levels. Pre-85 the renderer used a hard-coded 2.5 for all
 * walls; storing it per-wall (with this default) lets the GM author
 * thicker exterior walls / thinner interior dividers without affecting
 * existing walls.
 */
export const WALL_DEFAULT_THICKNESS_PX = 2.5;

/** Phase 85 — bounds on per-wall thickness for the editor UI. */
export const WALL_MIN_THICKNESS_PX = 1;
export const WALL_MAX_THICKNESS_PX = 12;

/**
 * Phase 85 — pixel size (at zoom = 1) of the endpoint drag handles
 * shown on selected walls. Hit-tested before the wall body so a click
 * near an endpoint targets the handle, not the segment itself.
 */
export const WALL_HANDLE_SCREEN_PX = 9;

export interface WallConstructorOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blocksSight?: boolean;
  blocksMovement?: boolean;
  thickness?: number;
  visibility?: 'shared' | 'gm';
}

/**
 * Build a new `Wall` with a generated id. Defaults both `blocksSight`
 * and `blocksMovement` to `true` — the most common case for drawn walls.
 *
 * Phase 85 — accepts optional `thickness` + `visibility`. Both default
 * to "the same as before Phase 85": no thickness (renderer falls back
 * to the per-canvas default) and `'shared'` visibility (wall renders on
 * both GM and Spectator).
 */
export function createWall(opts: WallConstructorOptions): Wall {
  const w: Wall = {
    id: nid(),
    x1: opts.x1,
    y1: opts.y1,
    x2: opts.x2,
    y2: opts.y2,
    blocksSight: opts.blocksSight ?? true,
    blocksMovement: opts.blocksMovement ?? true,
  };
  if (opts.thickness !== undefined) w.thickness = opts.thickness;
  if (opts.visibility !== undefined) w.visibility = opts.visibility;
  return w;
}

/**
 * Phase 85 — clamp a (possibly-untrusted) thickness value to the
 * editor's allowed range. Used by the wall editor and the wire-format
 * deserializer so a malformed peer can't make a wall render at width
 * 0 or 1e308.
 */
export function clampThickness(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return WALL_DEFAULT_THICKNESS_PX;
  return Math.max(WALL_MIN_THICKNESS_PX, Math.min(WALL_MAX_THICKNESS_PX, raw));
}

/**
 * Phase 85 — endpoint hit-test for the in-place wall editor. Returns
 * `{ wall, endpoint: 1 | 2 }` for the closest endpoint of a wall in
 * `selectedIds` whose distance from `(px, py)` is within `tolerancePx`,
 * or `null` if no endpoint is in range.
 *
 * Walls are iterated in reverse so the most-recently-drawn wins on a
 * tie, matching `hitTestWalls`'s mental model.
 */
export interface WallEndpointHit {
  wall: Wall;
  endpoint: 1 | 2;
}

export function hitTestWallEndpoint(
  walls: readonly Wall[],
  selectedIds: ReadonlySet<string>,
  px: number,
  py: number,
  tolerancePx: number,
): WallEndpointHit | null {
  if (selectedIds.size === 0) return null;
  const tolSq = tolerancePx * tolerancePx;
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i]!;
    if (!selectedIds.has(w.id)) continue;
    const d1x = px - w.x1;
    const d1y = py - w.y1;
    const d1Sq = d1x * d1x + d1y * d1y;
    const d2x = px - w.x2;
    const d2y = py - w.y2;
    const d2Sq = d2x * d2x + d2y * d2y;
    if (d1Sq <= tolSq && d1Sq <= d2Sq) return { wall: w, endpoint: 1 };
    if (d2Sq <= tolSq) return { wall: w, endpoint: 2 };
  }
  return null;
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
