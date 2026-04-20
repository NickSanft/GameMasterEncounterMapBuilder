/**
 * Dashed line + distance label shown while a GM is dragging tokens.
 * Caller computes the origin (world-px center of the origin cell) and
 * the current pointer position (world-px), plus the already-formatted
 * label (e.g. "4 sq" or "20 ft").
 *
 * Rendered in world space — caller has applied the camera transform.
 */

export interface MovementIndicatorStyle {
  lineColor: string;
  dashPattern: [number, number];
  lineWidth: number;
  labelBg: string;
  labelFg: string;
}

export const DEFAULT_MOVEMENT_STYLE: MovementIndicatorStyle = {
  lineColor: '#ffd966',
  dashPattern: [10, 6],
  lineWidth: 3,
  labelBg: 'rgba(0, 0, 0, 0.8)',
  labelFg: '#ffd966',
};

export function drawMovementIndicator(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  endX: number,
  endY: number,
  cellSize: number,
  zoom: number,
  label: string,
  style: MovementIndicatorStyle = DEFAULT_MOVEMENT_STYLE,
): void {
  // No-op if the drag hasn't actually moved yet.
  if (originX === endX && originY === endY) return;

  const safeZoom = Math.max(zoom, 0.01);
  ctx.save();

  // Dashed line. Dashes scale inversely with zoom so they keep a
  // consistent visual density at any zoom level.
  ctx.lineWidth = style.lineWidth / safeZoom;
  ctx.setLineDash([
    style.dashPattern[0] / safeZoom,
    style.dashPattern[1] / safeZoom,
  ]);
  ctx.strokeStyle = style.lineColor;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Origin marker — small filled circle so "where I started" stays
  // obvious even when the line doubles back on itself.
  const originR = Math.max(4, cellSize * 0.08) / safeZoom;
  ctx.beginPath();
  ctx.arc(originX, originY, originR, 0, Math.PI * 2);
  ctx.fillStyle = style.lineColor;
  ctx.fill();
  ctx.lineWidth = 1.5 / safeZoom;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.stroke();

  // Distance label — rounded pill near the end of the line, offset a
  // little so it doesn't sit directly under the cursor.
  const fontSize = Math.max(11, cellSize * 0.22) / safeZoom;
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const text = label;
  const metrics = ctx.measureText(text);
  const padX = 8 / safeZoom;
  const padY = 4 / safeZoom;
  const labelW = metrics.width + padX * 2;
  const labelH = fontSize + padY * 2;

  // Offset from the cursor in world space — 14px away at zoom=1.
  const offsetX = 14 / safeZoom;
  const offsetY = -14 / safeZoom;
  const labelX = endX + offsetX;
  const labelY = endY + offsetY - labelH / 2;

  ctx.fillStyle = style.labelBg;
  roundRect(ctx, labelX, labelY, labelW, labelH, 4 / safeZoom);
  ctx.fill();

  ctx.lineWidth = 1 / safeZoom;
  ctx.strokeStyle = style.lineColor;
  roundRect(ctx, labelX, labelY, labelW, labelH, 4 / safeZoom);
  ctx.stroke();

  ctx.fillStyle = style.labelFg;
  ctx.fillText(text, labelX + padX, labelY + labelH / 2);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
