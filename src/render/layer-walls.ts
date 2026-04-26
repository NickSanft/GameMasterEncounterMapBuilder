/**
 * Render layer for walls.
 *
 * 0.72.3 — walls now render on the Spectator canvas too. Pre-0.72.3
 * the layer early-returned for `mode !== 'gm'` on the rationale that
 * a hidden floor plan stops players from devtools-peeking the dungeon
 * layout. In practice that's an over-correction: walls represent
 * physical features (dungeon walls, stalagmites, partitions) the
 * players naturally expect to see at the table. The Spectator-side
 * render uses the same visuals as the GM, minus selection / drag /
 * in-progress-chain affordances which only make sense on the GM
 * (the spectator can't edit walls).
 *
 * Phase 85 — three new pieces:
 *   - Per-wall thickness (`w.thickness ?? WALL_DEFAULT_THICKNESS_PX`)
 *     so a stout exterior wall and a thin interior divider can
 *     coexist on the same map.
 *   - Per-wall visibility (`'shared' | 'gm'`). GM-only walls render
 *     on the GM canvas with a dashed style (so the GM sees at a
 *     glance which walls are secret) and DO NOT render on the
 *     Spectator canvas at all. They still occlude the spectator's
 *     LoS, since LoS reads `state.walls` directly + walls are physical
 *     occluders regardless of whether the player can see the outline.
 *   - Bigger endpoint handles on selected walls so the GM can grab
 *     them with a drag (the existing 5px dots were dragnostic enough
 *     for "where does this wall end" but too small to use as a click
 *     target). Pre-85 the dots were 5px; selected-wall handles are
 *     now 9px to match the new `WALL_HANDLE_SCREEN_PX` constant.
 *
 * 0.84.1 — the renderer splits the wall pass by mode: Spectator walls
 * draw BEFORE the canvas-fog overlay (so fog properly masks them);
 * GM walls draw AFTER fog (so authoring affordances stay crisp on top
 * of the semi-transparent fog tint).
 *
 * Active walls render as solid teal lines with small square endpoint
 * dots. Selected walls (Phase 56) get a brighter highlight color +
 * thicker stroke + a soft glow + LARGER handles (Phase 85).
 *
 * While the user is mid-drag with one or more selected walls in the
 * overlay, those walls render at `(x, y) + (deltaX, deltaY)` so the
 * user sees a live preview of where they'll land on release.
 *
 * While the Walls tool itself is mid-chain, a rubber-band preview
 * segment follows the cursor from the last committed vertex.
 */

import type { ID, ViewMode, Wall } from '../state/types.js';
import type { DragOverlay, WallsOverlay } from '../input/context.js';
import {
  WALL_DEFAULT_THICKNESS_PX,
  WALL_HANDLE_SCREEN_PX,
} from '../state/walls.js';

export interface WallsRenderOptions {
  mode: ViewMode;
  /** In-progress chain while the Walls tool is active. */
  overlay?: WallsOverlay | null;
  /** Walls in this set render with a selection highlight. */
  highlightIds?: ReadonlySet<ID>;
  /** Active drag overlay so selected walls preview their move. */
  dragOverlay?: DragOverlay | null;
  /** Current camera zoom so line widths stay visually consistent. */
  zoom: number;
  /**
   * Phase 85 — endpoint drag overlay for the in-place editor. When a
   * GM is mid-drag of a single endpoint, the corresponding endpoint
   * renders at the dragged position so the line previews live. Other
   * endpoints render at their committed position. The drag commits
   * via a `wall-update` patch on pointerup; the renderer just shows
   * the in-flight position so the GM gets visual feedback at 60fps.
   */
  endpointDrag?: { wallId: ID; endpoint: 1 | 2; x: number; y: number } | null;
}

const WALL_COLOR = '#63b3ed';
const WALL_GM_ONLY_COLOR = '#a684ff';
const WALL_HIGHLIGHT_COLOR = '#ffd54a';
const WALL_HIGHLIGHT_GLOW = 'rgba(255, 213, 74, 0.35)';
const HIGHLIGHT_WIDTH_BUMP_PX = 1.5;
const HIGHLIGHT_GLOW_WIDTH_PX = 9;
const VERTEX_DOT_SCREEN_PX = 5;
const PREVIEW_DASH_SCREEN_PX = 5;
const GM_ONLY_DASH_SCREEN_PX = 7;

const EMPTY_HIGHLIGHTS: ReadonlySet<ID> = new Set();

export function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: readonly Wall[],
  options: WallsRenderOptions,
): void {
  if (walls.length === 0) return;

  const safeZoom = Math.max(options.zoom, 0.05);
  const glowWidth = HIGHLIGHT_GLOW_WIDTH_PX / safeZoom;
  const dotSize = VERTEX_DOT_SCREEN_PX / safeZoom;
  const handleSize = WALL_HANDLE_SCREEN_PX / safeZoom;
  const dashLen = PREVIEW_DASH_SCREEN_PX / safeZoom;
  const gmOnlyDashLen = GM_ONLY_DASH_SCREEN_PX / safeZoom;

  // 0.72.3 — Spectator never has selected walls / drag overlays / in-
  // progress chains (those are GM-only authoring affordances), so we
  // collapse the relevant inputs to empty / null on the Spectator side.
  // The base teal-line render path runs identically on both views.
  const isGm = options.mode === 'gm';
  const highlights = isGm
    ? options.highlightIds ?? EMPTY_HIGHLIGHTS
    : EMPTY_HIGHLIGHTS;
  const drag = isGm ? options.dragOverlay ?? null : null;
  const dragSet = drag && drag.ids.length > 0 ? new Set(drag.ids) : null;
  const dx = drag?.deltaX ?? 0;
  const dy = drag?.deltaY ?? 0;
  const endpointDrag = isGm ? options.endpointDrag ?? null : null;

  // Phase 85 — Spectator skips walls whose visibility is `'gm'`. They
  // still occlude LoS (consumed elsewhere from `state.walls`); we just
  // don't draw the outline so the player can't see where the secret
  // door is.
  const visibleWalls: readonly Wall[] = isGm
    ? walls
    : walls.filter((w) => (w.visibility ?? 'shared') !== 'gm');
  if (visibleWalls.length === 0 && !endpointDrag) return;

  // Per-wall world-space coords applied AFTER the drag overlay AND
  // the endpoint-drag overlay so a selected wall mid-drag previews its
  // destination in real time + a single endpoint mid-drag follows the
  // cursor while the OTHER endpoint stays put.
  function wallCoords(w: Wall): { x1: number; y1: number; x2: number; y2: number } {
    let x1 = w.x1;
    let y1 = w.y1;
    let x2 = w.x2;
    let y2 = w.y2;
    if (dragSet && dragSet.has(w.id)) {
      x1 += dx; y1 += dy; x2 += dx; y2 += dy;
    }
    if (endpointDrag && endpointDrag.wallId === w.id) {
      if (endpointDrag.endpoint === 1) {
        x1 = endpointDrag.x;
        y1 = endpointDrag.y;
      } else {
        x2 = endpointDrag.x;
        y2 = endpointDrag.y;
      }
    }
    return { x1, y1, x2, y2 };
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1) Soft glow under selected walls — wider, lower-opacity stroke
  //    that reads as a halo at any zoom. Single batched stroke.
  let drewGlow = false;
  ctx.strokeStyle = WALL_HIGHLIGHT_GLOW;
  ctx.lineWidth = glowWidth;
  ctx.beginPath();
  for (const w of visibleWalls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    drewGlow = true;
  }
  if (drewGlow) ctx.stroke();

  // 2) Wall body — per-wall stroke so per-wall thickness + the GM-only
  //    dashed style work without bucketing. With <100 walls in any
  //    realistic encounter the per-wall stroke cost is negligible.
  for (const w of visibleWalls) {
    const isHighlighted = highlights.has(w.id);
    const isGmOnly = isGm && (w.visibility ?? 'shared') === 'gm';
    const baseThickness = (w.thickness ?? WALL_DEFAULT_THICKNESS_PX) / safeZoom;
    const lineWidth = isHighlighted
      ? baseThickness + HIGHLIGHT_WIDTH_BUMP_PX / safeZoom
      : baseThickness;
    ctx.strokeStyle = isHighlighted
      ? WALL_HIGHLIGHT_COLOR
      : isGmOnly
        ? WALL_GM_ONLY_COLOR
        : WALL_COLOR;
    ctx.lineWidth = lineWidth;
    if (isGmOnly && !isHighlighted) {
      ctx.setLineDash([gmOnlyDashLen, gmOnlyDashLen]);
    } else {
      ctx.setLineDash([]);
    }
    const c = wallCoords(w);
    ctx.beginPath();
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3) Endpoint dots — color-matched to wall state. Selected walls get
  //    LARGER handles (Phase 85) so the GM has a real click target for
  //    the in-place endpoint drag. Unselected walls keep the small
  //    matter-of-fact dot.
  const halfDot = dotSize / 2;
  const halfHandle = handleSize / 2;
  ctx.fillStyle = WALL_COLOR;
  for (const w of visibleWalls) {
    if (highlights.has(w.id)) continue;
    const isGmOnly = isGm && (w.visibility ?? 'shared') === 'gm';
    ctx.fillStyle = isGmOnly ? WALL_GM_ONLY_COLOR : WALL_COLOR;
    const c = wallCoords(w);
    ctx.fillRect(c.x1 - halfDot, c.y1 - halfDot, dotSize, dotSize);
    ctx.fillRect(c.x2 - halfDot, c.y2 - halfDot, dotSize, dotSize);
  }
  ctx.fillStyle = WALL_HIGHLIGHT_COLOR;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5 / safeZoom;
  ctx.setLineDash([]);
  for (const w of visibleWalls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    // Slight outline for contrast against any background — the handle
    // is a click target so we want it visible at any zoom.
    ctx.fillRect(c.x1 - halfHandle, c.y1 - halfHandle, handleSize, handleSize);
    ctx.strokeRect(c.x1 - halfHandle, c.y1 - halfHandle, handleSize, handleSize);
    ctx.fillRect(c.x2 - halfHandle, c.y2 - halfHandle, handleSize, handleSize);
    ctx.strokeRect(c.x2 - halfHandle, c.y2 - halfHandle, handleSize, handleSize);
  }

  // 4) In-progress chain preview (Walls tool only — overlay is null
  //    otherwise). GM-only: the Spectator can't author walls, so the
  //    rubber-band preview never appears on that view.
  const overlay = isGm ? options.overlay : null;
  if (overlay && overlay.vertices.length > 0) {
    ctx.fillStyle = WALL_COLOR;
    for (const v of overlay.vertices) {
      ctx.fillRect(v.x - halfDot, v.y - halfDot, dotSize, dotSize);
    }
    if (overlay.cursor) {
      const last = overlay.vertices[overlay.vertices.length - 1]!;
      ctx.save();
      ctx.setLineDash([dashLen, dashLen]);
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.7)';
      ctx.lineWidth = WALL_DEFAULT_THICKNESS_PX / safeZoom;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(overlay.cursor.x, overlay.cursor.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}
