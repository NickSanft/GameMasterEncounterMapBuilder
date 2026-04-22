import type { Annotation, AoeTemplate, ID, Token, Wall } from '../state/types.js';

export interface LassoRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function normalize(lasso: LassoRect) {
  return {
    minX: Math.min(lasso.x1, lasso.x2),
    maxX: Math.max(lasso.x1, lasso.x2),
    minY: Math.min(lasso.y1, lasso.y2),
    maxY: Math.max(lasso.y1, lasso.y2),
  };
}

/**
 * Returns the ids of every token whose visual center falls inside the given
 * lasso rectangle. Coordinates are in world space (pixels at zoom=1).
 */
export function collectLassoHits(
  tokens: readonly Token[],
  cellSize: number,
  lasso: LassoRect,
): ID[] {
  const { minX, maxX, minY, maxY } = normalize(lasso);
  const hits: ID[] = [];
  for (const t of tokens) {
    const cx = (t.x + t.size / 2) * cellSize;
    const cy = (t.y + t.size / 2) * cellSize;
    if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
      hits.push(t.id);
    }
  }
  return hits;
}

/**
 * Returns the ids of every annotation whose anchor point falls inside the
 * lasso rectangle. Annotation coordinates are already in world space.
 */
export function collectAnnotationLassoHits(
  annotations: readonly Annotation[],
  lasso: LassoRect,
): ID[] {
  const { minX, maxX, minY, maxY } = normalize(lasso);
  const hits: ID[] = [];
  for (const a of annotations) {
    if (a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY) {
      hits.push(a.id);
    }
  }
  return hits;
}

/**
 * Returns the ids of every wall whose segment touches the lasso
 * rectangle in any way. A wall is "in" the lasso when:
 *
 *   1. Either endpoint lies inside the rect, OR
 *   2. The segment crosses any of the rect's four edges.
 *
 * That gives the natural "I dragged over part of this wall, pick it
 * up" behaviour even for long walls whose endpoints are far outside
 * the lasso. Walls fully outside the rect (no endpoint in, no edge
 * crossed) are skipped.
 */
export function collectWallLassoHits(
  walls: readonly Wall[],
  lasso: LassoRect,
): ID[] {
  const { minX, maxX, minY, maxY } = normalize(lasso);
  const hits: ID[] = [];
  for (const w of walls) {
    if (segmentIntersectsRect(w.x1, w.y1, w.x2, w.y2, minX, minY, maxX, maxY)) {
      hits.push(w.id);
    }
  }
  return hits;
}

/**
 * True when the segment p1→p2 touches the axis-aligned rect at all
 * (endpoint inside OR edge crossed). Pure helper, exported only for
 * unit-testability — production code goes through `collectWallLassoHits`.
 */
export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  // Cheap: either endpoint inside.
  const inside1 = x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY;
  const inside2 = x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY;
  if (inside1 || inside2) return true;
  // Otherwise check segment-vs-edge intersection against all four
  // rect edges. If any return true, we're done.
  return (
    segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) || // top
    segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY) || // right
    segmentsIntersect(x1, y1, x2, y2, minX, maxY, maxX, maxY) || // bottom
    segmentsIntersect(x1, y1, x2, y2, minX, minY, minX, maxY)    // left
  );
}

/** Standard parametric segment-segment intersection in 2D. */
function segmentsIntersect(
  ax1: number, ay1: number, ax2: number, ay2: number,
  bx1: number, by1: number, bx2: number, by2: number,
): boolean {
  const dx1 = ax2 - ax1;
  const dy1 = ay2 - ay1;
  const dx2 = bx2 - bx1;
  const dy2 = by2 - by1;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (denom === 0) return false; // parallel (we accept the pinhole case)
  const ox = bx1 - ax1;
  const oy = by1 - ay1;
  const t = (ox * dy2 - oy * dx2) / denom;
  const u = (ox * dy1 - oy * dx1) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Returns the ids of every AoE template whose origin point falls inside
 * the lasso rectangle. AoE coordinates are already in world space.
 * For the `cube` kind, the rectangle's center is used instead of the
 * top-left corner so the lasso feels consistent with the visual extent.
 */
export function collectAoeLassoHits(
  templates: readonly AoeTemplate[],
  lasso: LassoRect,
): ID[] {
  const { minX, maxX, minY, maxY } = normalize(lasso);
  const hits: ID[] = [];
  for (const t of templates) {
    let px = t.x;
    let py = t.y;
    if (t.kind === 'cube') {
      px = t.x + t.length / 2;
      py = t.y + t.width / 2;
    }
    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      hits.push(t.id);
    }
  }
  return hits;
}
