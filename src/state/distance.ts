/**
 * Grid-distance helpers for the movement-remaining indicator + ruler.
 *
 * Three diagonal rules are supported:
 *   - `chebyshev`   — D&D 5e default: a diagonal step costs 1. Distance
 *                     in cells = max(|Δx|, |Δy|).
 *   - `alternating` — PHB optional rule (aka "5/10"): every *other*
 *                     diagonal step costs 2. Every orthogonal step and
 *                     odd-numbered diagonal step costs 1.
 *   - `euclidean`   — Phase 115 — straight-line Pythagorean distance,
 *                     rounded to the nearest whole cell. Useful for
 *                     simulationist play (Pathfinder 2e ranges, Star
 *                     Frontiers, any system that uses honest distance).
 *                     Diagonal of a 3×4 box = 5 cells, not 4 (Chebyshev)
 *                     or 5 (alternating).
 */

export type DiagonalRule = 'chebyshev' | 'alternating' | 'euclidean';
export type DistanceUnit = 'squares' | 'feet';

/** D&D 5e default: diagonals are free. */
export function chebyshevDistance(dx: number, dy: number): number {
  return Math.max(Math.abs(Math.round(dx)), Math.abs(Math.round(dy)));
}

/**
 * PHB "alternating" diagonal rule. Every *second* diagonal step costs 2
 * instead of 1. Orthogonal movement costs `|Δx| + |Δy| - min(|Δx|, |Δy|)`
 * cells (the straight leg after taking all possible diagonals).
 *
 * Example: moving 3 right + 2 up uses 2 diagonals (costs 1 + 2 = 3) and 1
 * straight (cost 1) → total 4 cells.
 */
export function alternatingDistance(dx: number, dy: number): number {
  const ax = Math.abs(Math.round(dx));
  const ay = Math.abs(Math.round(dy));
  const diagonals = Math.min(ax, ay);
  const straight = Math.max(ax, ay) - diagonals;
  // First diagonal = 1, second = 2, third = 1, fourth = 2, ...
  const diagonalCost = Math.floor(diagonals / 2) * 3 + (diagonals % 2);
  return straight + diagonalCost;
}

/**
 * Phase 115 — straight-line Pythagorean distance, rounded to the
 * nearest whole cell. Symmetric (no Δx/Δy bias) + matches naive
 * "distance is distance" expectations. Diagonal of a 3×4 right
 * triangle = 5 (Chebyshev would say 4, alternating would say 5).
 */
export function euclideanDistance(dx: number, dy: number): number {
  return Math.round(Math.hypot(dx, dy));
}

/** Dispatch based on the diagonal rule. */
export function gridDistance(
  dx: number,
  dy: number,
  rule: DiagonalRule = 'chebyshev',
): number {
  switch (rule) {
    case 'alternating':
      return alternatingDistance(dx, dy);
    case 'euclidean':
      return euclideanDistance(dx, dy);
    case 'chebyshev':
    default:
      return chebyshevDistance(dx, dy);
  }
}

/**
 * Format a distance in cells for display. Returns something like "4 sq"
 * or "20 ft". `feetPerSquare` is ignored when `unit === 'squares'`.
 *
 * `feetPerSquare` is floored to an integer ≥ 1; non-finite input falls
 * back to 5 (the D&D 5e default).
 */
export function formatDistance(
  cells: number,
  unit: DistanceUnit,
  feetPerSquare: number,
): string {
  const rounded = Math.max(0, Math.round(cells));
  if (unit === 'squares') {
    return `${rounded} sq`;
  }
  const fps = Number.isFinite(feetPerSquare) && feetPerSquare > 0
    ? Math.max(1, Math.floor(feetPerSquare))
    : 5;
  return `${rounded * fps} ft`;
}
