import type { Annotation, ID, Token } from '../state/types.js';

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
