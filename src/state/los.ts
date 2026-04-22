/**
 * Pure ray-cast visibility polygons.
 *
 * Given a viewer point, a sight radius, and a list of sight-blocking
 * wall segments, produce the visibility polygon — the set of world
 * points the viewer can actually see, sorted CCW around the viewer so
 * callers can feed it straight into `Path2D` / `ctx.clip()`.
 *
 * Algorithm (the standard "angular sweep" approach):
 *
 *  1. Collect *interesting* angles — directions from viewer toward
 *     every wall endpoint, plus ε offsets on either side so rays can
 *     slip past corners. When there are no walls in range we fall
 *     back to a uniform angular sampling so the polygon still
 *     approximates a circle.
 *  2. For each angle cast a ray from viewer out to `radius` pixels.
 *     Clip the ray against every wall segment and keep the closest
 *     intersection (or `radius` if the ray hits nothing).
 *  3. Sort the hit points by angle. They already are (we constructed
 *     the angle list in sorted order), so no extra sort is needed.
 *  4. The ordered points form the visibility polygon.
 *
 * Complexity: O(walls × angles). angles ≈ 3 × #wallEndpoints (bounded
 * by 6 × #walls since each wall has 2 endpoints). For a map with 200
 * walls that's ~240 000 ray-segment tests per viewer per frame — fast
 * enough to run every viewer in the fog worker without breaking
 * interactivity.
 */

export interface LosPoint {
  x: number;
  y: number;
}

export interface LosSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Angular ε (radians) used to slip rays past corner endpoints. */
const ANGLE_EPSILON = 1e-4;

/**
 * When no walls are in range, sample this many angles uniformly so the
 * output polygon approximates the viewer's circular horizon.
 */
const NO_WALL_SAMPLES = 48;

/**
 * Walls further than `radius + 2×the longest wall length` can never
 * occlude *anything* visible to the viewer — this cheap guard lets
 * callers pass the whole wall list without paying for distant geometry.
 */
export function filterWallsInRange(
  viewer: LosPoint,
  radius: number,
  walls: readonly LosSegment[],
): LosSegment[] {
  const r2 = radius * radius;
  const result: LosSegment[] = [];
  for (const w of walls) {
    // Quick AABB reject first.
    const minX = Math.min(w.x1, w.x2) - radius;
    const maxX = Math.max(w.x1, w.x2) + radius;
    const minY = Math.min(w.y1, w.y2) - radius;
    const maxY = Math.max(w.y1, w.y2) + radius;
    if (viewer.x < minX || viewer.x > maxX || viewer.y < minY || viewer.y > maxY) {
      continue;
    }
    // Then the proper point-to-segment test, reusing the segment math
    // from `state/walls.ts` wouldn't save much — inlined here to keep
    // this module free of cross-imports.
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ex = viewer.x - w.x1;
      const ey = viewer.y - w.y1;
      if (ex * ex + ey * ey <= r2) result.push(w);
      continue;
    }
    const t = Math.max(
      0,
      Math.min(1, ((viewer.x - w.x1) * dx + (viewer.y - w.y1) * dy) / lenSq),
    );
    const cx = w.x1 + t * dx;
    const cy = w.y1 + t * dy;
    const ex = viewer.x - cx;
    const ey = viewer.y - cy;
    if (ex * ex + ey * ey <= r2) result.push(w);
  }
  return result;
}

/**
 * Intersection of an infinite ray with a line segment, or `null` if no
 * forward hit exists. Returns the distance from `origin` along the ray
 * so the caller can keep the closest among many.
 *
 * The ray direction `(dx, dy)` is NOT required to be unit-length — any
 * nonzero vector works; the returned distance is measured in the same
 * units as `(dx, dy)`.
 */
export function rayHitSegment(
  origin: LosPoint,
  dx: number,
  dy: number,
  seg: LosSegment,
): number | null {
  // Ray:     P = origin + t * (dx, dy),  t ∈ [0, ∞)
  // Segment: Q = seg.p1 + u * (seg.p2 - seg.p1),  u ∈ [0, 1]
  const sx = seg.x2 - seg.x1;
  const sy = seg.y2 - seg.y1;
  const denom = dx * sy - dy * sx;
  if (denom === 0) return null; // parallel (or colinear — ignore)
  const ox = seg.x1 - origin.x;
  const oy = seg.y1 - origin.y;
  const t = (ox * sy - oy * sx) / denom;
  const u = (ox * dy - oy * dx) / denom;
  if (t < 0) return null;
  if (u < 0 || u > 1) return null;
  return t;
}

/**
 * Compute the visibility polygon. The returned array is empty if the
 * viewer has zero or negative radius (nothing visible). Otherwise it
 * contains at least `NO_WALL_SAMPLES` points ordered CCW around the
 * viewer so callers can feed straight into a canvas path.
 */
export function computeVisibilityPolygon(
  viewer: LosPoint,
  radius: number,
  walls: readonly LosSegment[],
): LosPoint[] {
  if (!(radius > 0)) return [];
  const relevantWalls = filterWallsInRange(viewer, radius, walls);

  // Build the sorted list of angles to cast rays at.
  const angles: number[] = [];
  if (relevantWalls.length === 0) {
    for (let i = 0; i < NO_WALL_SAMPLES; i++) {
      angles.push(((i / NO_WALL_SAMPLES) * 2 - 1) * Math.PI);
    }
  } else {
    for (const w of relevantWalls) {
      const a1 = Math.atan2(w.y1 - viewer.y, w.x1 - viewer.x);
      const a2 = Math.atan2(w.y2 - viewer.y, w.x2 - viewer.x);
      angles.push(a1 - ANGLE_EPSILON, a1, a1 + ANGLE_EPSILON);
      angles.push(a2 - ANGLE_EPSILON, a2, a2 + ANGLE_EPSILON);
    }
    // Sample the circle too so we never end up with huge angular gaps
    // on sparsely-walled maps — without this a viewer in the middle of
    // a big room with only one distant wall would get a weird polygon.
    for (let i = 0; i < NO_WALL_SAMPLES; i++) {
      angles.push(((i / NO_WALL_SAMPLES) * 2 - 1) * Math.PI);
    }
    angles.sort((a, b) => a - b);
  }

  const points: LosPoint[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let bestT = radius;
    for (const w of relevantWalls) {
      const t = rayHitSegment(viewer, dx, dy, w);
      if (t !== null && t < bestT) bestT = t;
    }
    points.push({ x: viewer.x + dx * bestT, y: viewer.y + dy * bestT });
  }
  return points;
}

/**
 * Rasterize one or more visibility polygons onto a grid-of-cells
 * bitmap — a `Uint8Array` where `1` means "at least one polygon covers
 * this cell's center." Used by the fog renderer to cheaply mask fog
 * without running a per-pixel polygon test every frame.
 *
 * Cell i,j (0-indexed) is visible iff any polygon contains the point
 * `((i + 0.5) * cellSize, (j + 0.5) * cellSize)`.
 */
export function rasterizeVisibility(
  polygons: readonly (readonly LosPoint[])[],
  cols: number,
  rows: number,
  cellSize: number,
): Uint8Array {
  const mask = new Uint8Array(cols * rows);
  if (polygons.length === 0) return mask;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = (x + 0.5) * cellSize;
      const py = (y + 0.5) * cellSize;
      for (const poly of polygons) {
        if (pointInPolygon(px, py, poly)) {
          mask[y * cols + x] = 1;
          break;
        }
      }
    }
  }
  return mask;
}

/** Standard ray-casting point-in-polygon (even-odd rule). */
export function pointInPolygon(px: number, py: number, poly: readonly LosPoint[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const yi = a.y;
    const yj = b.y;
    if (yi > py !== yj > py) {
      const crossX = ((b.x - a.x) * (py - yi)) / (yj - yi) + a.x;
      if (px < crossX) inside = !inside;
    }
  }
  return inside;
}
