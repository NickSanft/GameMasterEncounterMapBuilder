/**
 * Composition helpers for line-of-sight + lighting (Phase 57).
 *
 * The GM view always sees the GM-painted fog as-is (so they can paint
 * freely). The Spectator view, when LoS is on, only shows cells that
 * are:
 *   - manually revealed (GM fog), AND
 *   - covered by at least one viewer's sight polygon, AND
 *   - lit by at least one light source's dim polygon — IF any lights
 *     exist on the map. With no lights present we skip the lighting
 *     mask so legacy maps keep their Phase 55 behavior (viewer polygon
 *     is enough on its own).
 *
 * `collectViewers` filters a token list down to viewers (`losRadius
 * !== null`); `collectLights` filters down to lights (`light !== null`).
 * Both produce the same `LosViewer` shape the fog worker consumes —
 * lights use the `dim` radius for visibility math (the `bright` radius
 * is render-only on the GM canvas).
 */

import type { ID, SessionState, Token, Wall } from './types.js';
import type { LosViewer } from '../render/fog-worker-client.js';
import type { LosPoint, LosSegment } from './los.js';
import { rasterizeVisibility } from './los.js';
import { wallToSegments, wallBlocksSightEffective } from './walls.js';

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

export function collectSightWalls(
  walls: readonly Wall[],
  cellSize: number,
): LosSegment[] {
  // Phase 112 — block walls expand to 4 perimeter segments via
  // `wallToSegments`. Segment walls return [self] from the helper,
  // so the per-wall result is uniformly a list of LosSegment.
  // Phase 113 — `wallBlocksSightEffective` returns false for an OPEN
  // door even when the underlying wall has `blocksSight: true`, so
  // open doorways stop occluding LoS without a separate state mutation.
  const out: LosSegment[] = [];
  for (const w of walls) {
    if (!wallBlocksSightEffective(w)) continue;
    for (const s of wallToSegments(w, cellSize)) {
      out.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
    }
  }
  return out;
}

/**
 * Filter a token list down to the lights (`light !== null`) and project
 * each into the worker-facing `LosViewer` shape using the `dim` radius
 * — which is the outer extent of the light source. `bright` is purely
 * a render hint on the GM canvas, never a visibility input.
 *
 * Drag overlay handling mirrors `collectViewers`: a token being dragged
 * carries its light along with it, so torchbearers don't leave a
 * stationary halo behind while you reposition them.
 */
export function collectLights(
  tokens: readonly Token[],
  grid: { cellSize: number },
  dragOverlay?: ViewerDragOverlay | null,
): LosViewer[] {
  const dragSet = dragOverlay && dragOverlay.ids.length > 0
    ? new Set(dragOverlay.ids)
    : null;
  const dx = dragOverlay?.deltaX ?? 0;
  const dy = dragOverlay?.deltaY ?? 0;

  const lights: LosViewer[] = [];
  for (const t of tokens) {
    if (!t.light) continue;
    if (!(t.light.dim > 0)) continue;
    const baseX = (t.x + t.size / 2) * grid.cellSize;
    const baseY = (t.y + t.size / 2) * grid.cellSize;
    const isDragging = !!dragSet && dragSet.has(t.id);
    lights.push({
      x: isDragging ? baseX + dx : baseX,
      y: isDragging ? baseY + dy : baseY,
      radius: t.light.dim,
    });
  }
  return lights;
}

/**
 * Produce the Uint8Array the Spectator fog renderer should paint.
 *
 * Composition rules (when `losOn` is true):
 *   - viewerPolygons absent / empty → return state.fog unchanged
 *     (legacy Phase 54 behavior — fog driven by GM reveal alone).
 *   - viewerPolygons present, lightPolygons null (caller didn't provide,
 *     i.e. lighting feature disabled) → AND fog with viewer mask only
 *     (Phase 55 behavior).
 *   - viewerPolygons present, lightPolygons empty array (lighting
 *     enabled but no lights placed) → same as above; we don't want a
 *     completely dark map for users who haven't set up lights yet.
 *   - viewerPolygons present AND lightPolygons non-empty → AND fog with
 *     (viewer mask AND light mask), so a cell only shows if it's
 *     reached by SOME viewer AND lit by SOME light.
 *
 * When `losOn` is false we return state.fog unchanged regardless.
 */
export function spectatorEffectiveFog(
  state: SessionState,
  polygons: readonly (readonly LosPoint[])[] | null,
  losOn: boolean,
  lightPolygons: readonly (readonly LosPoint[])[] | null = null,
): Uint8Array {
  if (!losOn || !polygons || polygons.length === 0) return state.fog;
  const { cols, rows, cellSize } = state.grid;
  const visMask = rasterizeVisibility(polygons, cols, rows, cellSize);
  const lightMask =
    lightPolygons && lightPolygons.length > 0
      ? rasterizeVisibility(lightPolygons, cols, rows, cellSize)
      : null;
  const out = new Uint8Array(state.fog.length);
  for (let i = 0; i < state.fog.length; i++) {
    // Bitwise AND: cell is displayed-revealed iff manual GM fog AND
    // viewer mask AND (light mask, when present) all say "yes".
    const lit = lightMask ? lightMask[i]! : 1;
    out[i] = state.fog[i]! & visMask[i]! & lit;
  }
  return out;
}
