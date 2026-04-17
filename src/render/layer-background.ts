import type { Background, GridConfig, ID } from '../state/types.js';

export type ImageProvider = (id: ID) => HTMLImageElement | null;

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  grid: GridConfig,
  getImage: ImageProvider,
): void {
  ctx.fillStyle = '#2a2d34';
  ctx.fillRect(0, 0, grid.cols * grid.cellSize, grid.rows * grid.cellSize);

  if (!background.imageId) return;
  const img = getImage(background.imageId);
  if (!img) return;
  const w = img.naturalWidth * background.scaleX;
  const h = img.naturalHeight * background.scaleY;
  ctx.drawImage(img, background.offsetX, background.offsetY, w, h);
}
