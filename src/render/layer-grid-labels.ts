import type { GridConfig } from '../state/types.js';
import { columnLetter, rowLabel } from './grid-labels.js';

export interface GridLabelsRenderOptions {
  /** Text color. */
  color: string;
  /** Background fill under each label pill. */
  bgColor: string;
}

const DEFAULT_OPTIONS: GridLabelsRenderOptions = {
  color: '#e2e8f0',
  bgColor: 'rgba(15, 18, 25, 0.8)',
};

/**
 * Draw chess-style column + row labels in the gutters just outside the
 * grid. Runs in world-space so the caller has already applied the
 * camera transform; font sizes and offsets scale inversely with zoom
 * so labels read at a consistent size on the screen.
 *
 * At very low zoom we skip every-other label to avoid text overlap.
 */
export function drawGridLabels(
  ctx: CanvasRenderingContext2D,
  grid: GridConfig,
  zoom: number,
  options: GridLabelsRenderOptions = DEFAULT_OPTIONS,
): void {
  const { cols, rows, cellSize } = grid;
  if (cols <= 0 || rows <= 0) return;

  const safeZoom = Math.max(zoom, 0.05);
  const fontSize = Math.max(10, 14 / safeZoom);
  const padX = 4 / safeZoom;
  const padY = 2 / safeZoom;
  const gutterOffset = 6 / safeZoom;

  // Skip every Nth label at low zoom so text doesn't pile up.
  const approxLabelPx = fontSize * 2;
  const cellScreenPx = cellSize * safeZoom;
  const step = cellScreenPx > 0 ? Math.max(1, Math.ceil(approxLabelPx / cellScreenPx)) : 1;

  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Column labels along the top.
  const topY = -gutterOffset - fontSize / 2 - padY;
  for (let c = 0; c < cols; c += step) {
    const label = columnLetter(c + 1);
    if (!label) continue;
    const cx = (c + 0.5) * cellSize;
    paintLabel(ctx, label, cx, topY, fontSize, padX, padY, options);
  }

  // Row labels along the left.
  const leftX = -gutterOffset - padX - fontSize * 0.6;
  for (let r = 0; r < rows; r += step) {
    const label = rowLabel(r + 1);
    if (!label) continue;
    const cy = (r + 0.5) * cellSize;
    paintLabel(ctx, label, leftX, cy, fontSize, padX, padY, options);
  }

  ctx.restore();
}

function paintLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSize: number,
  padX: number,
  padY: number,
  options: GridLabelsRenderOptions,
): void {
  const metrics = ctx.measureText(text);
  const w = metrics.width + padX * 2;
  const h = fontSize + padY * 2;
  ctx.fillStyle = options.bgColor;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = options.color;
  ctx.fillText(text, cx, cy);
}

/**
 * Paint a solid color over the whole canvas at the given opacity.
 * Called AFTER grid/tokens/annotations/etc. are laid down so the tint
 * darkens the scene uniformly. Opacity of 0 is a free no-op.
 */
export function drawSceneTint(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  color: string,
  opacity: number,
  zoom: number,
  cameraX: number,
  cameraY: number,
): void {
  if (!Number.isFinite(opacity) || opacity <= 0) return;
  const clamped = Math.min(1, opacity);

  // The caller has applied the camera transform; paint in world-space
  // but sized to the current viewport so the tint covers whatever the
  // viewer sees, regardless of camera position.
  const safeZoom = Math.max(zoom, 0.05);
  const worldW = cssWidth / safeZoom;
  const worldH = cssHeight / safeZoom;

  ctx.save();
  ctx.globalAlpha = clamped;
  ctx.fillStyle = color;
  ctx.fillRect(cameraX, cameraY, worldW, worldH);
  ctx.restore();
}
