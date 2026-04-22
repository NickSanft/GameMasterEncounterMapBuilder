/**
 * Composition helpers for line-of-sight.
 *
 * The GM view always sees the GM-painted fog as-is (so they can paint
 * freely). The Spectator view, when LoS is on, only shows cells that
 * are BOTH manually revealed AND covered by at least one viewer's
 * visibility polygon — `spectatorEffectiveFog` builds that combined
 * mask. With LoS off, the function short-circuits and returns the
 * input fog unchanged so there's zero allocation overhead.
 *
 * `collectViewers` filters a token list down to just the ones with a
 * non-null `losRadius`, returning the shape the fog worker expects.
 */

import type { SessionState, Token, Wall } from './types.js';
import type { LosViewer } from '../render/fog-worker-client.js';
import type { LosPoint, LosSegment } from './los.js';
import { rasterizeVisibility } from './los.js';

export function collectViewers(tokens: readonly Token[], grid: { cellSize: number }): LosViewer[] {
  const viewers: LosViewer[] = [];
  for (const t of tokens) {
    if (t.losRadius === null) continue;
    // Tokens are 1-indexed grid cells; viewer origin is the token's
    // center (grid-cell center in world pixels).
    const cx = (t.x + t.size / 2) * grid.cellSize;
    const cy = (t.y + t.size / 2) * grid.cellSize;
    viewers.push({ x: cx, y: cy, radius: t.losRadius });
  }
  return viewers;
}

export function collectSightWalls(walls: readonly Wall[]): LosSegment[] {
  return walls
    .filter((w) => w.blocksSight)
    .map((w) => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));
}

/**
 * Produce the Uint8Array the Spectator fog renderer should paint. When
 * `losOn` is false OR polygons are absent we return the input buffer
 * reference unchanged. When on with polygons, we AND each revealed
 * cell with the rasterized visibility mask so "revealed but can't
 * currently see it" cells go back to fog.
 */
export function spectatorEffectiveFog(
  state: SessionState,
  polygons: readonly (readonly LosPoint[])[] | null,
  losOn: boolean,
): Uint8Array {
  if (!losOn || !polygons || polygons.length === 0) return state.fog;
  const { cols, rows, cellSize } = state.grid;
  const visMask = rasterizeVisibility(polygons, cols, rows, cellSize);
  const out = new Uint8Array(state.fog.length);
  for (let i = 0; i < state.fog.length; i++) {
    // Bitwise AND: cell is displayed-revealed iff both the manual GM
    // fog AND the viewer mask say "yes".
    out[i] = state.fog[i]! & visMask[i]!;
  }
  return out;
}
