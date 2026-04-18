import type { Background, GridConfig, ID } from '../state/types.js';
import type { Theme } from '../state/preferences.js';

export type ImageProvider = (id: ID) => HTMLImageElement | null;

export interface BackgroundRenderOptions {
  theme: Theme;
}

const FALLBACK_FILL: Record<Theme, string> = {
  dark: '#2a2d34',
  light: '#d7d9df',
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  grid: GridConfig,
  getImage: ImageProvider,
  options: BackgroundRenderOptions = { theme: 'dark' },
): void {
  ctx.fillStyle = FALLBACK_FILL[options.theme];
  ctx.fillRect(0, 0, grid.cols * grid.cellSize, grid.rows * grid.cellSize);

  if (!background.imageId) return;
  const img = getImage(background.imageId);
  if (!img) return;
  const w = img.naturalWidth * background.scaleX;
  const h = img.naturalHeight * background.scaleY;
  ctx.drawImage(img, background.offsetX, background.offsetY, w, h);
}
