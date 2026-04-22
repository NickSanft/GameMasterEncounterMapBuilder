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

import type { ID, SessionState, Token, Wall } from './types.js';
import type { LosViewer } from '../render/fog-worker-client.js';
import type { LosPoint, LosSegment } from './los.js';
import { rasterizeVisibility } from './los.js';

/**
 * Drag-overlay shape that `collectViewers` understands. We mirror the
 * shape of `DragOverlay` from `input/context.ts` rather than importing
 * it so this module stays free of the input-layer dependency. The
 * deltas are in WORLD pixels (matches `DragOverlay`'s contract).
 */
export interface ViewerDragOverlay {
  ids: readonly ID[];
  deltaX: number;
  deltaY: number;
}

/**
 * Filter a token list down to the viewers (`losRadius !== null`) and
 * project each into the worker-facing `LosViewer` shape.
 *
 * When a `dragOverlay` is supplied AND a viewer's id is in
 * `dragOverlay.ids`, that viewer's center is offset by the world-space
 * delta so the LoS recompute follows the dragged token live, instead
 * of staying frozen at the pre-drag position until the user releases.
 * (Drag overlays mutate every pointer-move; the store doesn't change
 * until the drag finishes.)
 */
export function collectViewers(
  tokens: readonly Token[],
  grid: { cellSize: number },
  dragOverlay?: ViewerDragOverlay | null,
): LosViewer[] {
  const dragSet = dragOverlay && dragOverlay.ids.length > 0
    ? new Set(dragOverlay.ids)
    : null;
  const dx = dragOverlay?.deltaX ?? 0;
  const dy = dragOverlay?.deltaY ?? 0;

  const viewers: LosViewer[] = [];
  for (const t of tokens) {
    if (t.losRadius === null) continue;
    // Tokens are 1-indexed grid cells; viewer origin is the token's
    // center (grid-cell center in world pixels).
    const baseX = (t.x + t.size / 2) * grid.cellSize;
    const baseY = (t.y + t.size / 2) * grid.cellSize;
    const isDragging = !!dragSet && dragSet.has(t.id);
    viewers.push({
      x: isDragging ? baseX + dx : baseX,
      y: isDragging ? baseY + dy : baseY,
      radius: t.losRadius,
    });
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
