import type { ID, SessionState, Token } from '../state/types.js';
import type { ImageProvider } from './layer-background.js';

const NO_IMAGE: ImageProvider = () => null;

export function drawTokens(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  highlightIds: ReadonlySet<ID>,
  getImage: ImageProvider = NO_IMAGE,
): void {
  const { cellSize } = state.grid;
  for (const token of state.tokens) {
    drawToken(ctx, token, cellSize, highlightIds.has(token.id), getImage);
  }
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  highlighted: boolean,
  getImage: ImageProvider,
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
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.stroke();

  if (highlighted) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd966';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  const fontSize = Math.max(11, cellSize * 0.22);
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(t.label);
  const padX = 6;
  const padY = 3;
  const labelW = metrics.width + padX * 2;
  const labelH = fontSize + padY * 2;
  const labelX = cx - labelW / 2;
  const labelY = cy + r + 4;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(ctx, labelX, labelY, labelW, labelH, 3);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(t.label, cx, labelY + padY);
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
