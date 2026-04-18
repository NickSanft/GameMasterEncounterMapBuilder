import type { LassoOverlay } from '../input/context.js';

export function drawLasso(
  ctx: CanvasRenderingContext2D,
  lasso: LassoOverlay,
): void {
  const x = Math.min(lasso.x1, lasso.x2);
  const y = Math.min(lasso.y1, lasso.y2);
  const w = Math.abs(lasso.x2 - lasso.x1);
  const h = Math.abs(lasso.y2 - lasso.y1);
  if (w === 0 && h === 0) return;

  ctx.save();
  if (lasso.additive) {
    ctx.fillStyle = 'rgba(255, 217, 102, 0.12)';
    ctx.strokeStyle = '#ffd966';
  } else {
    ctx.fillStyle = 'rgba(96, 165, 250, 0.12)';
    ctx.strokeStyle = '#60a5fa';
  }
  ctx.fillRect(x, y, w, h);
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}
