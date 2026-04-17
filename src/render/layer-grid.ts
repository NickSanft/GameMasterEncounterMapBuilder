import type { GridConfig } from '../state/types.js';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: GridConfig,
): void {
  const mapW = grid.cols * grid.cellSize;
  const mapH = grid.rows * grid.cellSize;

  if (!grid.showGridLines) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.strokeRect(0, 0, mapW, mapH);
    return;
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  for (let c = 0; c <= grid.cols; c++) {
    const x = c * grid.cellSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, mapH);
  }
  for (let r = 0; r <= grid.rows; r++) {
    const y = r * grid.cellSize;
    ctx.moveTo(0, y);
    ctx.lineTo(mapW, y);
  }
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.strokeRect(0, 0, mapW, mapH);
}
