/**
 * Phase 130 — unified cell ↔ world coord helpers.
 *
 * Pre-130 every input + render path had inline conversion math like
 * `Math.floor(world.x / cellSize)` (drop a token) and
 * `(t.x + t.size/2) * cellSize` (token center). Those work for the
 * square grid but break for hex — hex(0, 0)'s center isn't at
 * `(0.5 * cellSize, 0.5 * cellSize)`, it's at `(hexWidth/2, size)`.
 *
 * v1.5 introduces `tokenCenterWorld(t, grid)` and `worldToCell(x, y,
 * grid)` as the single source of truth. Every input layer + the
 * token render layer goes through them so flipping `grid.gridShape`
 * automatically flips the geometry.
 *
 * Token.x and Token.y stay (col, row) integer offset coords in BOTH
 * shapes — the wire format / IDB schema doesn't change. Only the
 * world-pixel projection differs.
 */

import type { GridConfig, Token } from './types.js';
import {
  hexCenter,
  worldToHexCell,
} from '../render/hex-geometry.js';

/**
 * World-space center of `token`'s render position. Square cells
 * place the center at the token's footprint center; hex cells place
 * it at the offset-coord hex's center (size > 1 hex tokens render
 * at the hex(x, y) center too — the v1.5 cosmetic compromise; true
 * multi-hex tokens would need a separate tessellation pass).
 */
export function tokenCenterWorld(
  token: Pick<Token, 'x' | 'y' | 'size'>,
  grid: GridConfig,
): { x: number; y: number } {
  const cellSize = grid.cellSize;
  if (grid.gridShape === 'hex') {
    return hexCenter(Math.round(token.x), Math.round(token.y), cellSize);
  }
  return {
    x: (token.x + token.size / 2) * cellSize,
    y: (token.y + token.size / 2) * cellSize,
  };
}

/**
 * Snap a world point (x, y) to the (col, row) of the cell that
 * contains it. Square cells use floor / cellSize; hex cells use the
 * cube-rounded `worldToHexCell` so points near a hex boundary land
 * on the geometrically-nearest hex.
 *
 * For a token DROP, `worldToCell` gives the destination cell; for a
 * drag COMMIT, the host typically computes the new center via
 * `tokenCenterWorld(token, grid)` plus the world-delta, then calls
 * this to land on the new cell.
 */
export function worldToCell(
  x: number,
  y: number,
  grid: GridConfig,
): { col: number; row: number } {
  if (grid.gridShape === 'hex') {
    return worldToHexCell(x, y, grid.cellSize);
  }
  return {
    col: Math.floor(x / grid.cellSize),
    row: Math.floor(y / grid.cellSize),
  };
}

/**
 * Phase 130 — given a token's CURRENT (x, y) plus a world-pixel
 * drag delta, return the (col, row) the token should land on after
 * the commit. Computes via `tokenCenterWorld` + delta + `worldToCell`,
 * so it picks the right cell whether the grid is square or hex.
 *
 * Returns the same (col, row) when the delta is too small to cross
 * a cell boundary — caller can compare against `(token.x, token.y)`
 * to detect a no-op commit.
 */
export function commitDragToCell(
  token: Pick<Token, 'x' | 'y' | 'size'>,
  grid: GridConfig,
  worldDeltaX: number,
  worldDeltaY: number,
): { col: number; row: number } {
  const center = tokenCenterWorld(token, grid);
  return worldToCell(center.x + worldDeltaX, center.y + worldDeltaY, grid);
}
