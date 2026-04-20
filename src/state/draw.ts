import type { DrawStroke } from './types.js';

/**
 * Drop-point threshold for incremental stroke input: only append a new
 * point to an in-progress stroke if it's at least this many world pixels
 * from the last appended point. Prevents the rAF pointermove stream from
 * ballooning the stroke into thousands of near-duplicate points.
 */
export const STROKE_MIN_POINT_DISTANCE = 2;

/**
 * Append a point to a stroke if it's far enough from the last point.
 * Non-mutating — returns a new `points[]` when it grows, or the
 * original array reference when it doesn't (so callers can cheap-compare).
 */
export function appendStrokePoint(
  points: ReadonlyArray<{ x: number; y: number }>,
  x: number,
  y: number,
  minDistance = STROKE_MIN_POINT_DISTANCE,
): Array<{ x: number; y: number }> {
  if (points.length === 0) return [{ x, y }];
  const last = points[points.length - 1]!;
  const dx = x - last.x;
  const dy = y - last.y;
  if (dx * dx + dy * dy < minDistance * minDistance) {
    return points.slice();
  }
  return [...points, { x, y }];
}

/**
 * Signed distance from a point to a segment, squared (for cheap
 * comparison). Returns infinity for degenerate (zero-length) segments.
 */
function segmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  const ex = px - qx;
  const ey = py - qy;
  return ex * ex + ey * ey;
}

/**
 * Hit-test a stroke by a world-space point. Returns true when the point
 * is within `stroke.width/2 + slop` of any segment of the stroke.
 * `slop` is a small extra tolerance so thin strokes remain clickable.
 */
export function hitTestStroke(
  stroke: DrawStroke,
  wx: number,
  wy: number,
  slop = 4,
): boolean {
  if (stroke.points.length === 0) return false;
  const threshold = stroke.width / 2 + slop;
  const thresholdSq = threshold * threshold;
  if (stroke.points.length === 1) {
    const p = stroke.points[0]!;
    const dx = wx - p.x;
    const dy = wy - p.y;
    return dx * dx + dy * dy <= thresholdSq;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const a = stroke.points[i]!;
    const b = stroke.points[i + 1]!;
    if (segmentDistSq(wx, wy, a.x, a.y, b.x, b.y) <= thresholdSq) return true;
  }
  return false;
}

/**
 * Iterate strokes top-to-bottom and return the first one whose ink
 * passes the hit-test. Returns null on miss.
 */
export function hitTestStrokes(
  strokes: readonly DrawStroke[],
  wx: number,
  wy: number,
  slop = 4,
): DrawStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]!;
    if (hitTestStroke(s, wx, wy, slop)) return s;
  }
  return null;
}

/** Default appearance for new strokes. */
export const DEFAULT_STROKE_COLOR = '#ffd966';
export const DEFAULT_STROKE_WIDTH = 4;
