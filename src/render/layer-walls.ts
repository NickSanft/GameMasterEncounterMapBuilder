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
   * Phase 112 — grid cell size in world pixels. Required to render
   * block walls (their geometry is in cell coordinates). The renderer
   * passes `state.grid.cellSize` directly.
   */
  cellSize: number;
  /**
   * Phase 112 — block-wall preview while drag-creating. The Walls
   * tool's Block mode passes a `{cellX, cellY, cellsWide, cellsTall}`
   * object that renders as a translucent ghost rectangle until
   * pointerup commits it as a real block.
   */
  blockPreview?: {
    cellX: number;
    cellY: number;
    cellsWide: number;
    cellsTall: number;
  } | null;
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

  // Phase 112 — segments take the original line-coords path; blocks
  // get a separate filled-rectangle pass below. Filtering once lets
  // the segment loop assume `w.x1` etc. are present.
  const segmentVisibleWalls = visibleWalls.filter(
    (w): w is import('../state/types.js').WallSegment => w.kind === 'segment',
  );
  const blockVisibleWalls = visibleWalls.filter(
    (w): w is import('../state/types.js').WallBlock => w.kind === 'block',
  );

  // Per-wall world-space coords applied AFTER the drag overlay AND
  // the endpoint-drag overlay so a selected wall mid-drag previews its
  // destination in real time + a single endpoint mid-drag follows the
  // cursor while the OTHER endpoint stays put.
  function wallCoords(w: import('../state/types.js').WallSegment): { x1: number; y1: number; x2: number; y2: number } {
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
  for (const w of segmentVisibleWalls) {
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
  for (const w of segmentVisibleWalls) {
    const isHighlighted = highlights.has(w.id);
    const isGmOnly = isGm && (w.visibility ?? 'shared') === 'gm';
    const baseThickness = (w.thickness ?? WALL_DEFAULT_THICKNESS_PX) / safeZoom;
    const lineWidth = isHighlighted
      ? baseThickness + HIGHLIGHT_WIDTH_BUMP_PX / safeZoom
      : baseThickness;
    // Phase 113 — open doors render with a thinner, fainter, dashed
    // line so the GM can see at a glance which doors are open. Closed
    // doors render normally; the door affordance comes from the
    // perpendicular tick markers added below.
    const isDoor = w.door !== undefined;
    const isOpenDoor = isDoor && w.door!.open;
    ctx.strokeStyle = isHighlighted
      ? WALL_HIGHLIGHT_COLOR
      : isGmOnly
        ? WALL_GM_ONLY_COLOR
        : WALL_COLOR;
    ctx.lineWidth = isOpenDoor
      ? Math.max(1 / safeZoom, lineWidth * 0.55)
      : lineWidth;
    ctx.globalAlpha = isOpenDoor ? 0.55 : 1;
    if (isOpenDoor) {
      const dlen = PREVIEW_DASH_SCREEN_PX / safeZoom;
      ctx.setLineDash([dlen, dlen]);
    } else if (isGmOnly && !isHighlighted) {
      ctx.setLineDash([gmOnlyDashLen, gmOnlyDashLen]);
    } else {
      ctx.setLineDash([]);
    }
    const c = wallCoords(w);
    ctx.beginPath();
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Phase 113 — door tick markers. Two short perpendicular ticks at
    // the segment midpoint (±10% of segment length) so a door reads
    // as a door even when closed and visually identical to a wall.
    if (isDoor) {
      const dx = c.x2 - c.x1;
      const dy = c.y2 - c.y1;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const mx = (c.x1 + c.x2) / 2;
        const my = (c.y1 + c.y2) / 2;
        // Perpendicular unit vector + a tick length tied to the wall
        // thickness (visually scales with the door's chunkiness).
        const px = -dy / len;
        const py = dx / len;
        const tick = Math.max(4 / safeZoom, lineWidth * 1.6);
        ctx.lineWidth = Math.max(1 / safeZoom, lineWidth * 0.6);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mx - px * tick, my - py * tick);
        ctx.lineTo(mx + px * tick, my + py * tick);
        ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // 3) Endpoint dots — color-matched to wall state. Selected walls get
  //    LARGER handles (Phase 85) so the GM has a real click target for
  //    the in-place endpoint drag. Unselected walls keep the small
  //    matter-of-fact dot.
  const halfDot = dotSize / 2;
  const halfHandle = handleSize / 2;
  ctx.fillStyle = WALL_COLOR;
  for (const w of segmentVisibleWalls) {
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
  for (const w of segmentVisibleWalls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    // Slight outline for contrast against any background — the handle
    // is a click target so we want it visible at any zoom.
    ctx.fillRect(c.x1 - halfHandle, c.y1 - halfHandle, handleSize, handleSize);
    ctx.strokeRect(c.x1 - halfHandle, c.y1 - halfHandle, handleSize, handleSize);
    ctx.fillRect(c.x2 - halfHandle, c.y2 - halfHandle, handleSize, handleSize);
    ctx.strokeRect(c.x2 - halfHandle, c.y2 - halfHandle, handleSize, handleSize);
  }

  // Phase 112 — block walls. Drawn as filled rectangles in cell
  // coordinates. Highlighted blocks get the same accent fill as
  // selected segments; GM-only blocks get a dashed outline + the
  // tinted color (matches the segment-wall convention).
  if (blockVisibleWalls.length > 0) {
    for (const w of blockVisibleWalls) {
      const isHighlighted = highlights.has(w.id);
      const isGmOnly = isGm && (w.visibility ?? 'shared') === 'gm';
      const cs = options.cellSize;
      const draggedDX = dragSet && dragSet.has(w.id) ? dx : 0;
      const draggedDY = dragSet && dragSet.has(w.id) ? dy : 0;
      const x = w.cellX * cs + draggedDX;
      const y = w.cellY * cs + draggedDY;
      const wpx = w.cellsWide * cs;
      const hpx = w.cellsTall * cs;
      ctx.fillStyle = isHighlighted
        ? WALL_HIGHLIGHT_COLOR
        : isGmOnly
          ? WALL_GM_ONLY_COLOR
          : WALL_COLOR;
      ctx.globalAlpha = isGmOnly && !isHighlighted ? 0.45 : 0.85;
      ctx.fillRect(x, y, wpx, hpx);
      ctx.globalAlpha = 1;
      // Outline so the block edge stays crisp against textured
      // backgrounds. Highlighted blocks get the accent outline.
      ctx.strokeStyle = isHighlighted
        ? WALL_HIGHLIGHT_COLOR
        : isGmOnly
          ? WALL_GM_ONLY_COLOR
          : WALL_COLOR;
      ctx.lineWidth = (isHighlighted ? 2 : 1) / safeZoom;
      if (isGmOnly && !isHighlighted) {
        ctx.setLineDash([gmOnlyDashLen, gmOnlyDashLen]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(x, y, wpx, hpx);
    }
    ctx.setLineDash([]);
  }

  // Phase 112 — block-mode drag preview. The Walls tool's Block mode
  // hands us a {cellX, cellY, cellsWide, cellsTall} ghost; render it
  // as a translucent dashed rectangle at the prospective destination.
  const blockPreview = isGm ? options.blockPreview ?? null : null;
  if (blockPreview && blockPreview.cellsWide > 0 && blockPreview.cellsTall > 0) {
    const cs = options.cellSize;
    const x = blockPreview.cellX * cs;
    const y = blockPreview.cellY * cs;
    const wpx = blockPreview.cellsWide * cs;
    const hpx = blockPreview.cellsTall * cs;
    ctx.fillStyle = WALL_COLOR;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x, y, wpx, hpx);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 1.5 / safeZoom;
    ctx.setLineDash([dashLen, dashLen]);
    ctx.strokeRect(x, y, wpx, hpx);
    ctx.setLineDash([]);
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
