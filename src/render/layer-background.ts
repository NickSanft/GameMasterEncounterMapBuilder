import type { Background, GridConfig, ID } from '../state/types.js';
import type { Theme } from '../state/preferences.js';

export type ImageProvider = (id: ID) => HTMLImageElement | null;

export interface BackgroundRenderOptions {
  theme: Theme;
}

/**
 * Fallback fill for the map area when no background image is set.
 * One per theme so a brand-new scene doesn't show a slab of dark gray
 * inside a parchment- or console-themed UI.
 */
const FALLBACK_FILL: Record<Theme, string> = {
  dark: '#2a2d34',
  light: '#d7d9df',
  parchment: '#dfd2b0',
  console: '#15201a',
  'purple-dusk': '#2a234a',
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  grid: GridConfig,
  getImage: ImageProvider,
  options: BackgroundRenderOptions = { theme: 'dark' },
): void {
  // Phase 169 — when the user authored a custom fill color, use it
  // instead of the theme fallback. The image (if any) renders ON
  // TOP of the fill, so an image with transparent regions shows
  // the color through.
  ctx.fillStyle = background.fillColor || FALLBACK_FILL[options.theme];
  ctx.fillRect(0, 0, grid.cols * grid.cellSize, grid.rows * grid.cellSize);

  if (!background.imageId) return;
  const img = getImage(background.imageId);
  if (!img) return;
  const w = img.naturalWidth * background.scaleX;
  const h = img.naturalHeight * background.scaleY;
  const rotation = background.rotation ?? 0;
  const flipX = background.flipX === true;
  const flipY = background.flipY === true;

  // Phase 140 — fast path for the no-transform case (every pre-140
  // save lands here, plus any v140 user who hasn't rotated / flipped
  // their map). Skips the save / translate / rotate / restore overhead
  // on the common path.
  if (rotation === 0 && !flipX && !flipY) {
    ctx.drawImage(img, background.offsetX, background.offsetY, w, h);
    return;
  }

  // Phase 140 — apply rotation + flip around the background's CENTER
  // point. Order: translate to center → flip (negative scale) →
  // rotate → translate back, so the user-visible pivot is the
  // background's geometric center regardless of where (offsetX,
  // offsetY) lands the top-left corner.
  ctx.save();
  const cx = background.offsetX + w / 2;
  const cy = background.offsetY + h / 2;
  ctx.translate(cx, cy);
  if (flipX || flipY) {
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  }
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
