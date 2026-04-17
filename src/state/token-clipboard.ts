import type { Token } from './types.js';
import { nid } from '../util/id.js';

/**
 * Produces a list of fresh tokens derived from the originals:
 * every token gets a new id and its position is offset by `offsetX` / `offsetY`.
 * All other fields (label, color, size, imageId, borderColor) are preserved.
 */
export function duplicateTokens(
  tokens: readonly Token[],
  offsetX = 1,
  offsetY = 1,
): Token[] {
  return tokens.map((t) => ({
    ...t,
    id: nid(),
    x: t.x + offsetX,
    y: t.y + offsetY,
  }));
}
