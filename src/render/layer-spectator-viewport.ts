import type { ViewportRect } from '../sync/messages.js';

export interface SpectatorViewportStyle {
  strokeColor: string;
  fillColor: string;
  dash: [number, number];
  lineWidth: number;
}

export const DEFAULT_SPECTATOR_VIEWPORT_STYLE: SpectatorViewportStyle = {
  strokeColor: '#ffd54a',
  fillColor: 'rgba(255, 213, 74, 0.08)',
  dash: [8, 6],
  lineWidth: 2,
};

/**
 * Draw the spectator's visible viewport as a dashed rectangle in world
 * coordinates. Caller must have applied the camera transform already.
 */
export function drawSpectatorViewport(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportRect,
  zoom: number,
  style: SpectatorViewportStyle = DEFAULT_SPECTATOR_VIEWPORT_STYLE,
): void {
  ctx.save();
  ctx.lineWidth = style.lineWidth / Math.max(zoom, 0.01);
  ctx.setLineDash([
    style.dash[0] / Math.max(zoom, 0.01),
    style.dash[1] / Math.max(zoom, 0.01),
  ]);
  ctx.strokeStyle = style.strokeColor;
  ctx.fillStyle = style.fillColor;
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);

  // Small corner ticks for extra legibility.
  const tick = 14 / Math.max(zoom, 0.01);
  ctx.setLineDash([]);
  ctx.beginPath();
  // TL
  ctx.moveTo(viewport.x, viewport.y + tick);
  ctx.lineTo(viewport.x, viewport.y);
  ctx.lineTo(viewport.x + tick, viewport.y);
  // TR
  ctx.moveTo(viewport.x + viewport.width - tick, viewport.y);
  ctx.lineTo(viewport.x + viewport.width, viewport.y);
  ctx.lineTo(viewport.x + viewport.width, viewport.y + tick);
  // BL
  ctx.moveTo(viewport.x, viewport.y + viewport.height - tick);
  ctx.lineTo(viewport.x, viewport.y + viewport.height);
  ctx.lineTo(viewport.x + tick, viewport.y + viewport.height);
  // BR
  ctx.moveTo(viewport.x + viewport.width - tick, viewport.y + viewport.height);
  ctx.lineTo(viewport.x + viewport.width, viewport.y + viewport.height);
  ctx.lineTo(viewport.x + viewport.width, viewport.y + viewport.height - tick);
  ctx.stroke();

  ctx.restore();
}
