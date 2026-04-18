import type { ID, Token } from '../state/types.js';

export interface LassoRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
  const minX = Math.min(lasso.x1, lasso.x2);
  const maxX = Math.max(lasso.x1, lasso.x2);
  const minY = Math.min(lasso.y1, lasso.y2);
  const maxY = Math.max(lasso.y1, lasso.y2);
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
