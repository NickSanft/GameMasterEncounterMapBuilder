/**
 * Phase 158 — travel-route helpers.
 *
 * Pure functions for measuring total length, formatting distance
 * labels with the active distance unit, and similar route math. No
 * DOM, no I/O. Same pattern as `state/aura.ts`.
 */

import type { TravelRoute } from './types.js';
import type { DistanceUnit } from './distance.js';

/**
 * Phase 158 — total polyline length in WORLD pixels. Sum of
 * Euclidean distances between consecutive points. Returns `0` for
 * routes with fewer than 2 points (the tool should never commit
 * one, but a defensive 0 prevents the renderer from showing NaN).
 */
export function routeTotalWorldPx(route: Pick<TravelRoute, 'points'>): number {
  let total = 0;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]!;
    const b = route.points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

/**
 * Phase 158 — convert a world-pixel distance to feet using the
 * active grid + feet-per-square preference, OR to "squares" when
 * the user prefers that unit.
 *
 * Output is rounded to a whole number — the route label is a
 * display readout, not a precise measurement.
 */
export function formatRouteDistance(
  worldPx: number,
  cellSize: number,
  feetPerSquare: number,
  unit: DistanceUnit,
): string {
  if (cellSize <= 0) return '';
  const squares = worldPx / cellSize;
  if (unit === 'squares') {
    return `${Math.round(squares)} sq`;
  }
  return `${Math.round(squares * feetPerSquare)} ft`;
}
