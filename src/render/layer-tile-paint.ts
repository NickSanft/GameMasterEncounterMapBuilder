/**
 * Phase 142 — tile-paint render layer.
 *
 * Renders the painted tiles between the background image and the
 * grid lines (so grid lines stay visible above floor tiles, but
 * tiles obscure the background image they sit on). Solid colors per
 * `TilePaintKind` — sprite-based tiles are deferred polish.
 *
 * Pure renderer, no DOM-dependent imports beyond the canvas context.
 */

import type {
  GridConfig,
  TilePaint,
  TilePaintKind,
} from '../state/types.js';

/**
 * Color palette per tile kind. Tuned for legibility against both
 * dark + light theme backgrounds; the alpha bake-in (~0.85) lets
 * the underlying art bleed through slightly so painted tiles never
 * look completely opaque.
 */
const TILE_COLORS: Record<TilePaintKind, string> = {
  floor: 'rgba(196, 167, 122, 0.78)', // sandstone tan
  wall: 'rgba(70, 76, 82, 0.92)', // slate gray
  water: 'rgba(46, 115, 174, 0.78)', // deep blue
  rough: 'rgba(120, 90, 60, 0.78)', // dusty brown
  pit: 'rgba(20, 16, 30, 0.92)', // near-black with purple tint
};

/**
 * Render order: tiles painted later on the same cell render on top.
 * The store dedupes by (cellX, cellY, kind) so a single cell can
 * show at most one tile per kind, but different kinds can stack
 * (e.g. water on rough → water visible on top).
 */
export function drawTilePaints(
  ctx: CanvasRenderingContext2D,
  tiles: readonly TilePaint[],
  grid: GridConfig,
): void {
  if (tiles.length === 0) return;
  const { cellSize } = grid;
  for (const tile of tiles) {
    if (
      tile.cellX < 0 ||
      tile.cellY < 0 ||
      tile.cellX >= grid.cols ||
      tile.cellY >= grid.rows
    ) {
      continue;
    }
    ctx.fillStyle = TILE_COLORS[tile.kind];
    ctx.fillRect(
      tile.cellX * cellSize,
      tile.cellY * cellSize,
      cellSize,
      cellSize,
    );
  }
}

/**
 * Test-only — surface the palette so unit tests can assert "every
 * `TilePaintKind` has a registered color." Catches a future preset
 * addition that forgets the table entry.
 */
export function _tileColorsForTesting(): Readonly<Record<TilePaintKind, string>> {
  return TILE_COLORS;
}
