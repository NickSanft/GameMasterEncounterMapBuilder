/**
 * Render layer for walls. Walls are GM-only; this layer is a no-op on
 * the Spectator canvas.
 *
 * Active walls render as solid teal lines with small square endpoint
 * dots. While the Walls tool is in the middle of a chain, a rubber-band
 * preview segment follows the cursor from the last committed vertex
 * so the GM can see where the next click will land.
 */

import type { ViewMode, Wall } from '../state/types.js';
import type { WallsOverlay } from '../input/context.js';

export interface WallsRenderOptions {
  mode: ViewMode;
  /** In-progress chain while the Walls tool is active. */
  overlay?: WallsOverlay | null;
  /** Current camera zoom so line widths stay visually consistent. */
  zoom: number;
}

const WALL_COLOR = '#63b3ed';
const WALL_WIDTH_SCREEN_PX = 2.5;
const VERTEX_DOT_SCREEN_PX = 5;
const PREVIEW_DASH_SCREEN_PX = 5;

export function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: readonly Wall[],
  options: WallsRenderOptions,
): void {
  if (options.mode !== 'gm') return;

  const safeZoom = Math.max(options.zoom, 0.05);
  const lineWidth = WALL_WIDTH_SCREEN_PX / safeZoom;
  const dotSize = VERTEX_DOT_SCREEN_PX / safeZoom;
  const dashLen = PREVIEW_DASH_SCREEN_PX / safeZoom;

  ctx.save();
  ctx.strokeStyle = WALL_COLOR;
  ctx.fillStyle = WALL_COLOR;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;

  // Committed walls.
  ctx.beginPath();
  for (const w of walls) {
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
  }
  ctx.stroke();

  // Endpoint dots on committed walls — makes corners + t-junctions read
  // at a glance on busy maps.
  const half = dotSize / 2;
  for (const w of walls) {
    ctx.fillRect(w.x1 - half, w.y1 - half, dotSize, dotSize);
    ctx.fillRect(w.x2 - half, w.y2 - half, dotSize, dotSize);
  }

  // In-progress chain preview (Walls tool only — overlay is null
  // otherwise). We draw committed-chain dots first, then the rubber-band
  // segment to the cursor as a dashed line.
  const overlay = options.overlay;
  if (overlay && overlay.vertices.length > 0) {
    for (const v of overlay.vertices) {
      ctx.fillRect(v.x - half, v.y - half, dotSize, dotSize);
    }
    if (overlay.cursor) {
      const last = overlay.vertices[overlay.vertices.length - 1]!;
      ctx.save();
      ctx.setLineDash([dashLen, dashLen]);
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.7)';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(overlay.cursor.x, overlay.cursor.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}
