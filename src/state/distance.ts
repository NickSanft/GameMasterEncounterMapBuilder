/**
 * Grid-distance helpers for the movement-remaining indicator.
 *
 * Two diagonal rules are supported:
 *   - `chebyshev`   — D&D 5e default: a diagonal step costs 1. Distance
 *                     in cells = max(|Δx|, |Δy|).
 *   - `alternating` — PHB optional rule (aka "5/10"): every *other*
 *                     diagonal step costs 2. Every orthogonal step and
 *                     odd-numbered diagonal step costs 1.
 */

export type DiagonalRule = 'chebyshev' | 'alternating';
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

/** Dispatch based on the diagonal rule. */
export function gridDistance(
  dx: number,
  dy: number,
  rule: DiagonalRule = 'chebyshev',
): number {
  return rule === 'alternating'
    ? alternatingDistance(dx, dy)
    : chebyshevDistance(dx, dy);
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
