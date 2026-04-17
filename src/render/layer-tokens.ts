import type { ID, SessionState, Token, ViewMode } from '../state/types.js';
import type { ImageProvider } from './layer-background.js';
import type { LabelSize } from '../state/preferences.js';
import { shapeForBorderColor, type MarkerShape } from '../state/team-colors.js';
import { isTokenFullyHidden } from './fog-visibility.js';

const NO_IMAGE: ImageProvider = () => null;

const LABEL_SIZE_MULTIPLIER: Record<LabelSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};

export interface TokenRenderOptions {
  labelSize: LabelSize;
  showColorblindMarkers: boolean;
  mode: ViewMode;
}

const DEFAULT_OPTIONS: TokenRenderOptions = {
  labelSize: 'medium',
  showColorblindMarkers: false,
  mode: 'gm',
};

export function drawTokens(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  highlightIds: ReadonlySet<ID>,
  getImage: ImageProvider = NO_IMAGE,
  options: TokenRenderOptions = DEFAULT_OPTIONS,
): void {
  const { cellSize } = state.grid;
  const labelScale = LABEL_SIZE_MULTIPLIER[options.labelSize];

  const unselected: Token[] = [];
  const selected: Token[] = [];
  for (const t of state.tokens) {
    if (options.mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    if (highlightIds.has(t.id)) selected.push(t);
    else unselected.push(t);
  }

  for (const t of unselected) {
    drawTokenBody(ctx, t, cellSize, false, getImage, options.showColorblindMarkers);
  }
  for (const t of selected) {
    drawTokenBody(ctx, t, cellSize, true, getImage, options.showColorblindMarkers);
  }
  for (const t of unselected) {
    drawTokenLabel(ctx, t, cellSize, labelScale, false);
  }
  for (const t of selected) {
    drawTokenLabel(ctx, t, cellSize, labelScale, true);
  }
}

function drawTokenBody(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  highlighted: boolean,
  getImage: ImageProvider,
  showMarkers: boolean,
): void {
  const cx = (t.x + t.size / 2) * cellSize;
  const cy = (t.y + t.size / 2) * cellSize;
  const r = (t.size * cellSize) / 2 - 4;

  const img = t.imageId ? getImage(t.imageId) : null;

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = t.color;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.stroke();

  if (t.borderColor) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = t.borderColor;
    ctx.stroke();
  }

  if (highlighted) {
    const hr = r + (t.borderColor ? 6 : 3);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd966';
    ctx.beginPath();
    ctx.arc(cx, cy, hr, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (showMarkers && t.borderColor) {
    const shape = shapeForBorderColor(t.borderColor);
    if (shape) {
      const markerCx = cx + r * 0.72;
      const markerCy = cy - r * 0.72;
      const markerR = Math.max(7, r * 0.24);
      drawMarker(ctx, shape, markerCx, markerCy, markerR, t.borderColor);
    }
  }
}

function drawTokenLabel(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  labelScale: number,
  selected: boolean,
): void {
  const cx = (t.x + t.size / 2) * cellSize;
  const cy = (t.y + t.size / 2) * cellSize;
  const r = (t.size * cellSize) / 2 - 4;

  const baseFontSize = Math.max(11, cellSize * 0.22);
  const fontSize = baseFontSize * labelScale;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(t.label);
  const padX = 6;
  const padY = 3;
  const labelW = metrics.width + padX * 2;
  const labelH = fontSize + padY * 2;
  const labelX = cx - labelW / 2;
  const labelY = cy + r + (t.borderColor ? 8 : 6);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  roundRect(ctx, labelX, labelY, labelW, labelH, 3);
  ctx.fill();

  if (selected) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffd966';
    roundRect(ctx, labelX, labelY, labelW, labelH, 3);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillText(t.label, cx, labelY + padY);
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  shape: MarkerShape,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.92, cy + r * 0.7);
      ctx.lineTo(cx - r * 0.92, cy + r * 0.7);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8);
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
    case 'circle':
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
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
