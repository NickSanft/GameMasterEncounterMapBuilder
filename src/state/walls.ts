/**
 * Helpers for the Wall state slice.
 *
 * Walls were originally (Phase 54) just line segments stored in
 * world-pixel coordinates. Phase 112 extended `Wall` to a discriminated
 * union over `kind: 'segment' | 'block'` so wall regions (whole-cell
 * fills) can coexist with the line-segment authoring path.
 *
 * Common helpers below operate on `Wall` regardless of kind via the
 * `wallToSegments(w, cellSize)` adapter (returns 1 segment for
 * `kind: 'segment'`, 4 perimeter edges for `kind: 'block'`).
 */

import type { Wall, WallSegment, WallBlock } from './types.js';
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

/** Phase 85 — bounds on per-wall thickness for the editor UI.
 *  Phase 111 — bumped max 12 → 48 so users can author chunky masonry
 *  walls and full-cell-width dividers without saturating the slider.
 *  At zoom = 1 with a 48px grid, a 48px-thick wall fills a full cell. */
export const WALL_MIN_THICKNESS_PX = 1;
export const WALL_MAX_THICKNESS_PX = 48;

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
export function createWall(opts: WallConstructorOptions): WallSegment {
  const w: WallSegment = {
    kind: 'segment',
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
 * Phase 112 — block-wall constructor. Drag-create UI computes the
 * grid cells covered by the drag rectangle + hands them to this
 * helper. Defaults match `createWall`: blocks both sight + movement.
 */
export interface WallBlockConstructorOptions {
  cellX: number;
  cellY: number;
  cellsWide: number;
  cellsTall: number;
  blocksSight?: boolean;
  blocksMovement?: boolean;
  visibility?: 'shared' | 'gm';
}

export function createWallBlock(opts: WallBlockConstructorOptions): WallBlock {
  const w: WallBlock = {
    kind: 'block',
    id: nid(),
    cellX: Math.max(0, Math.floor(opts.cellX)),
    cellY: Math.max(0, Math.floor(opts.cellY)),
    cellsWide: Math.max(1, Math.floor(opts.cellsWide)),
    cellsTall: Math.max(1, Math.floor(opts.cellsTall)),
    blocksSight: opts.blocksSight ?? true,
    blocksMovement: opts.blocksMovement ?? true,
  };
  if (opts.visibility !== undefined) w.visibility = opts.visibility;
  return w;
}

/** Phase 112 — kind discriminator predicates. */
export function isBlockWall(w: Wall): w is WallBlock {
  return w.kind === 'block';
}

export function isSegmentWall(w: Wall): w is WallSegment {
  return w.kind === 'segment';
}

/**
 * Phase 112 — convert a wall (any kind) to one or more line segments
 * in world-pixel coords. Segments return [self]; blocks return their
 * 4 perimeter edges (top, right, bottom, left). Used by:
 *   - LoS collectors (Phase 55 / 57) — every segment becomes an
 *     occluder for the visibility polygon.
 *   - Generic per-edge consumers that don't care about kind.
 *
 * `cellSize` is in world pixels per grid cell — required for blocks
 * since their geometry is stored in cells; ignored for segments.
 */
export interface SegmentLike {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function wallToSegments(w: Wall, cellSize: number): SegmentLike[] {
  if (w.kind === 'segment') {
    return [{ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }];
  }
  // Block: 4 perimeter edges, in world pixels.
  const x1 = w.cellX * cellSize;
  const y1 = w.cellY * cellSize;
  const x2 = (w.cellX + w.cellsWide) * cellSize;
  const y2 = (w.cellY + w.cellsTall) * cellSize;
  return [
    { x1, y1, x2, y2: y1 }, // top
    { x1: x2, y1, x2, y2 }, // right
    { x1, y1: y2, x2, y2 }, // bottom
    { x1, y1, x2: x1, y2 }, // left
  ];
}

/**
 * Phase 112 — block-wall AABB in world pixels. Used by the renderer
 * (filled rectangle) and the hit-tester (point-in-rect check).
 */
export interface BlockBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function blockWallBounds(w: WallBlock, cellSize: number): BlockBounds {
  return {
    x: w.cellX * cellSize,
    y: w.cellY * cellSize,
    w: w.cellsWide * cellSize,
    h: w.cellsTall * cellSize,
  };
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
  /**
   * Phase 112 — only segment walls have endpoints; the hit-test
   * filter below skips block walls entirely. Narrowed accordingly so
   * callers don't need to re-discriminate.
   */
  wall: WallSegment;
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
    // Phase 112 — block walls have no individual endpoints (drag-to-
    // resize is a future polish; for now blocks are edited via re-
    // draw + delete). Skip them in the endpoint hit-test entirely.
    if (w.kind !== 'segment') continue;
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
  cellSize: number,
  tolerancePx: number = WALL_HIT_TOLERANCE_PX,
): Wall | null {
  const tolSq = tolerancePx * tolerancePx;
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i]!;
    if (w.kind === 'block') {
      // Phase 112 — point-in-rect for the AABB. No tolerance band
      // since the entire region IS the wall (unlike a 1D segment that
      // benefits from a few px of grace either side).
      const b = blockWallBounds(w, cellSize);
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        return w;
      }
      continue;
    }
    const dSq = distanceSquaredToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
    if (dSq <= tolSq) return w;
  }
  return null;
}

/** Euclidean length of a segment wall in world pixels. */
export function wallLength(w: Pick<WallSegment, 'x1' | 'y1' | 'x2' | 'y2'>): number {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  return Math.hypot(dx, dy);
}
