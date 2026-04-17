import type { SessionState, Token } from '../state/types.js';

/**
 * True when every cell a token's footprint touches is covered by fog.
 * Tokens at fractional positions are rounded out to the cells they can
 * overlap (floor of min, ceil of max).
 */
export function isTokenFullyHidden(token: Token, state: SessionState): boolean {
  const { cols, rows } = state.grid;
  const x0 = Math.floor(token.x);
  const y0 = Math.floor(token.y);
  const x1 = Math.max(x0 + 1, Math.ceil(token.x + token.size));
  const y1 = Math.max(y0 + 1, Math.ceil(token.y + token.size));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (state.fog[y * cols + x] === 1) return false;
    }
  }
  return true;
}
