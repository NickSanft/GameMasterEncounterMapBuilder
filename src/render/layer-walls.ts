/**
 * Render layer for walls. Walls are GM-only; this layer is a no-op on
 * the Spectator canvas.
 *
 * Active walls render as solid teal lines with small square endpoint
 * dots. Selected walls (Phase 56) get a brighter highlight color +
 * thicker stroke + a soft glow. While the user is mid-drag with one
 * or more selected walls in the overlay, those walls render at
 * `(x, y) + (deltaX, deltaY)` so the user sees a live preview of
 * where they'll land on release.
 *
 * While the Walls tool itself is mid-chain, a rubber-band preview
 * segment follows the cursor from the last committed vertex.
 */

import type { ID, ViewMode, Wall } from '../state/types.js';
import type { DragOverlay, WallsOverlay } from '../input/context.js';

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
}

const WALL_COLOR = '#63b3ed';
const WALL_HIGHLIGHT_COLOR = '#ffd54a';
const WALL_HIGHLIGHT_GLOW = 'rgba(255, 213, 74, 0.35)';
const WALL_WIDTH_SCREEN_PX = 2.5;
const HIGHLIGHT_WIDTH_SCREEN_PX = 4;
const HIGHLIGHT_GLOW_WIDTH_SCREEN_PX = 9;
const VERTEX_DOT_SCREEN_PX = 5;
const PREVIEW_DASH_SCREEN_PX = 5;

const EMPTY_HIGHLIGHTS: ReadonlySet<ID> = new Set();

export function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: readonly Wall[],
  options: WallsRenderOptions,
): void {
  if (options.mode !== 'gm') return;

  const safeZoom = Math.max(options.zoom, 0.05);
  const lineWidth = WALL_WIDTH_SCREEN_PX / safeZoom;
  const highlightWidth = HIGHLIGHT_WIDTH_SCREEN_PX / safeZoom;
  const glowWidth = HIGHLIGHT_GLOW_WIDTH_SCREEN_PX / safeZoom;
  const dotSize = VERTEX_DOT_SCREEN_PX / safeZoom;
  const dashLen = PREVIEW_DASH_SCREEN_PX / safeZoom;
  const highlights = options.highlightIds ?? EMPTY_HIGHLIGHTS;
  const drag = options.dragOverlay ?? null;
  const dragSet = drag && drag.ids.length > 0 ? new Set(drag.ids) : null;
  const dx = drag?.deltaX ?? 0;
  const dy = drag?.deltaY ?? 0;

  // Per-wall world-space coords applied AFTER the drag overlay so a
  // selected wall mid-drag previews its destination in real time.
  function wallCoords(w: Wall): { x1: number; y1: number; x2: number; y2: number } {
    if (dragSet && dragSet.has(w.id)) {
      return { x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy };
    }
    return { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1) Soft glow under selected walls — wider, lower-opacity stroke
  //    that reads as a halo at any zoom.
  let drewGlow = false;
  ctx.strokeStyle = WALL_HIGHLIGHT_GLOW;
  ctx.lineWidth = glowWidth;
  ctx.beginPath();
  for (const w of walls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    drewGlow = true;
  }
  if (drewGlow) ctx.stroke();

  // 2) Unselected walls in the standard teal.
  ctx.strokeStyle = WALL_COLOR;
  ctx.fillStyle = WALL_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  let drewBase = false;
  for (const w of walls) {
    if (highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    drewBase = true;
  }
  if (drewBase) ctx.stroke();

  // 3) Selected walls in the highlight color, drawn last so they sit
  //    on top of any crossing unselected wall.
  ctx.strokeStyle = WALL_HIGHLIGHT_COLOR;
  ctx.lineWidth = highlightWidth;
  ctx.beginPath();
  let drewHighlight = false;
  for (const w of walls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    drewHighlight = true;
  }
  if (drewHighlight) ctx.stroke();

  // 4) Endpoint dots — color-matched to whether the wall is selected.
  const half = dotSize / 2;
  ctx.fillStyle = WALL_COLOR;
  for (const w of walls) {
    if (highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.fillRect(c.x1 - half, c.y1 - half, dotSize, dotSize);
    ctx.fillRect(c.x2 - half, c.y2 - half, dotSize, dotSize);
  }
  ctx.fillStyle = WALL_HIGHLIGHT_COLOR;
  for (const w of walls) {
    if (!highlights.has(w.id)) continue;
    const c = wallCoords(w);
    ctx.fillRect(c.x1 - half, c.y1 - half, dotSize, dotSize);
    ctx.fillRect(c.x2 - half, c.y2 - half, dotSize, dotSize);
  }

  // 5) In-progress chain preview (Walls tool only — overlay is null
  //    otherwise). We draw committed-chain dots first, then the
  //    rubber-band segment to the cursor as a dashed line.
  const overlay = options.overlay;
  if (overlay && overlay.vertices.length > 0) {
    ctx.fillStyle = WALL_COLOR;
    for (const v of overlay.vertices) {
      ctx.fillRect(v.x - half, v.y - half, dotSize, dotSize);
    }
    if (overlay.cursor) {
      const last = overlay.vertices[overlay.vertices.length - 1]!;
      ctx.save();
      ctx.setLineDash([dashLen, dashLen]);
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.7)';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(overlay.cursor.x, overlay.cursor.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}
