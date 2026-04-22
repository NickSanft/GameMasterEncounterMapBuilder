/**
 * GM-side line-of-sight overlay.
 *
 * When `losMode !== 'off'` and the worker has produced polygons, paint
 * each visibility polygon as a translucent yellow outline + subtle
 * fill. This lets the GM see at a glance which cells are currently
 * visible to at least one viewer — matching what the Spectator's fog
 * layer will clip to.
 *
 * No-op on the Spectator canvas; Spectator consumes the polygons by
 * masking its fog layer (via `spectatorEffectiveFog` in the entry),
 * not by drawing the polygons on top.
 */

import type { ViewMode } from '../state/types.js';
import type { LosPoint } from '../state/los.js';

export interface LosLayerOptions {
  mode: ViewMode;
  /** Current camera zoom so outline widths stay consistent on screen. */
  zoom: number;
  /** One polygon per viewer, CCW around the viewer. */
  polygons?: readonly (readonly LosPoint[])[] | null;
}

const FILL = 'rgba(255, 221, 0, 0.05)';
const STROKE = 'rgba(255, 221, 0, 0.45)';
const STROKE_WIDTH_SCREEN_PX = 1;

export function drawLosPolygons(
  ctx: CanvasRenderingContext2D,
  options: LosLayerOptions,
): void {
  if (options.mode !== 'gm') return;
  const polys = options.polygons;
  if (!polys || polys.length === 0) return;

  const safeZoom = Math.max(options.zoom, 0.05);
  const lineWidth = STROKE_WIDTH_SCREEN_PX / safeZoom;

  ctx.save();
  ctx.fillStyle = FILL;
  ctx.strokeStyle = STROKE;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';

  for (const poly of polys) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    const first = poly[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < poly.length; i++) {
      const p = poly[i]!;
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
