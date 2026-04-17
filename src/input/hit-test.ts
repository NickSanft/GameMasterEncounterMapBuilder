import type { GridConfig, Token } from '../state/types.js';

export function hitTestToken(
  tokens: readonly Token[],
  grid: GridConfig,
  wx: number,
  wy: number,
): Token | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    const cx = (t.x + t.size / 2) * grid.cellSize;
    const cy = (t.y + t.size / 2) * grid.cellSize;
    const r = (t.size * grid.cellSize) / 2;
    const dx = wx - cx;
    const dy = wy - cy;
    if (dx * dx + dy * dy <= r * r) return t;
  }
  return null;
}
