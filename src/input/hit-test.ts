import type { GridConfig, Token } from '../state/types.js';
import { tokenCenterWorld } from '../state/grid-coords.js';

export function hitTestToken(
  tokens: readonly Token[],
  grid: GridConfig,
  wx: number,
  wy: number,
): Token | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    // Phase 130 — hex grids place the rendered center at
    // `hexCenter(t.x, t.y)`, not at the square-grid footprint center.
    // `tokenCenterWorld` dispatches on `grid.gridShape` to pick the
    // right center.
    const center = tokenCenterWorld(t, grid);
    const cx = center.x;
    const cy = center.y;
    const r = (t.size * grid.cellSize) / 2;
    const dx = wx - cx;
    const dy = wy - cy;
    if (dx * dx + dy * dy <= r * r) return t;
  }
  return null;
}
