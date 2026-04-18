import type { Annotation, SessionState, ViewMode } from '../state/types.js';
import { isAnnotationVisible } from '../input/hit-test-annotation.js';
import type { DragOverlay } from '../input/context.js';

export interface AnnotationRenderOptions {
  mode: ViewMode;
  highlightIds: ReadonlySet<string>;
  dragOverlay?: DragOverlay | null;
}

function withOverlay(a: Annotation, overlay: DragOverlay | null | undefined): Annotation {
  if (!overlay || !overlay.ids.includes(a.id)) return a;
  if (overlay.deltaX === 0 && overlay.deltaY === 0) return a;
  return { ...a, x: a.x + overlay.deltaX, y: a.y + overlay.deltaY };
}

const DRAG_GHOST_ALPHA = 0.6;

export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  options: AnnotationRenderOptions,
): void {
  const { cols, rows, cellSize } = state.grid;
  const overlay = options.dragOverlay ?? null;
  const isActiveOverlay =
    overlay !== null && (overlay.deltaX !== 0 || overlay.deltaY !== 0);
  for (const a of state.annotations) {
    if (!isAnnotationVisible(a, state.fog, cols, rows, cellSize, options.mode)) continue;
    const display = withOverlay(a, overlay);
    const isDragged = isActiveOverlay && overlay!.ids.includes(a.id);
    drawAnnotation(ctx, display, options.highlightIds.has(a.id), isDragged);
  }
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  highlighted: boolean,
  isDragged: boolean,
): void {
  const r = 10;

  // Pin body
  ctx.save();
  if (isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;
  ctx.beginPath();
  ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
  ctx.fillStyle = a.color;
  ctx.fill();

  // Outline — dashed for GM-only, solid for shared
  if (a.visibility === 'gm') {
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.stroke();
  }

  // Inner bullseye dot for quick eye anchor
  ctx.beginPath();
  ctx.arc(a.x, a.y, r * 0.33, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();
  ctx.restore();

  // Selection ring
  if (highlighted) {
    ctx.save();
    ctx.strokeStyle = '#ffd966';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (!a.text) return;

  // Label chip to the right of the pin
  const fontSize = 12;
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const text = a.text.length > 40 ? a.text.slice(0, 40) + '…' : a.text;
  const metrics = ctx.measureText(text);
  const padX = 6;
  const chipH = fontSize + 8;
  const chipW = metrics.width + padX * 2;
  const chipX = a.x + r + 6;
  const chipY = a.y - chipH / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  roundRect(ctx, chipX, chipY, chipW, chipH, 3);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, chipX + padX, a.y);

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
