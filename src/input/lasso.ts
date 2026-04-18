import type { Annotation, AoeTemplate, ID, Token } from '../state/types.js';

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
