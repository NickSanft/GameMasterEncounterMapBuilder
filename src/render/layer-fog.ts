import type { SessionState, ViewMode } from '../state/types.js';
import {
  compactFogRects,
  drawCompactedFogRects,
  type FogRect,
} from './fog-rects.js';

export type FogMode = 'reveal' | 'hide';

export interface FogPreview {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: FogMode;
}

export interface FogHoverPreview {
  cx: number;
  cy: number;
  brushSize: number;
  mode: FogMode;
}

export interface FogRenderOptions {
  gmColor: string;
  gmOpacity: number;
  /**
   * Optional precomputed run-length-compacted fog rectangles for the
   * current state. When provided, the renderer skips its own scan
   * through the fog grid and just iterates these. The caller is
   * responsible for keeping them in sync with `state.fog`.
   *
   * Used by the fog WebWorker pipeline (see `fog-worker.ts`) so the
   * compaction can run off the main thread on large grids.
   */
  precomputedRects?: readonly FogRect[];
}

export function drawFog(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  mode: ViewMode,
  options: FogRenderOptions,
): void {
  const { fog, grid } = state;
  const { cols, rows, cellSize } = grid;

  ctx.fillStyle = mode === 'gm'
    ? hexToRgba(options.gmColor, options.gmOpacity)
    : '#000000';

  const rects = options.precomputedRects ?? compactFogRects(fog, cols, rows);
  drawCompactedFogRects(ctx, rects, cellSize);
}

export function drawFogHoverPreview(
  ctx: CanvasRenderingContext2D,
  hover: FogHoverPreview,
  cellSize: number,
): void {
  const n = hover.brushSize;
  const half = Math.floor((n - 1) / 2);
  const x1 = hover.cx - half;
  const y1 = hover.cy - half;
  const px = x1 * cellSize;
  const py = y1 * cellSize;
  const pw = n * cellSize;
  const ph = n * cellSize;

  if (hover.mode === 'reveal') {
    ctx.fillStyle = 'rgba(129, 199, 132, 0.18)';
    ctx.strokeStyle = 'rgba(129, 199, 132, 0.7)';
  } else {
    ctx.fillStyle = 'rgba(239, 83, 80, 0.2)';
    ctx.strokeStyle = 'rgba(239, 83, 80, 0.7)';
  }
  ctx.fillRect(px, py, pw, ph);
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  ctx.restore();
}

export function drawFogPreview(
  ctx: CanvasRenderingContext2D,
  preview: FogPreview,
  cellSize: number,
): void {
  const x1 = Math.min(preview.x1, preview.x2);
  const x2 = Math.max(preview.x1, preview.x2);
  const y1 = Math.min(preview.y1, preview.y2);
  const y2 = Math.max(preview.y1, preview.y2);
  const px = x1 * cellSize;
  const py = y1 * cellSize;
  const pw = (x2 - x1 + 1) * cellSize;
  const ph = (y2 - y1 + 1) * cellSize;

  if (preview.mode === 'reveal') {
    ctx.fillStyle = 'rgba(129, 199, 132, 0.35)';
    ctx.strokeStyle = '#81c784';
  } else {
    ctx.fillStyle = 'rgba(239, 83, 80, 0.4)';
    ctx.strokeStyle = '#ef5350';
  }
  ctx.fillRect(px, py, pw, ph);
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return `rgba(255, 0, 0, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(255, 0, 0, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
