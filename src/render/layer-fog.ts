import type { SessionState, ViewMode } from '../state/types.js';

export type FogMode = 'reveal' | 'hide';

export interface FogPreview {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: FogMode;
}

export function drawFog(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  mode: ViewMode,
): void {
  const { fog, grid } = state;
  const { cols, rows, cellSize } = grid;

  ctx.fillStyle = mode === 'gm' ? 'rgba(255, 0, 0, 0.35)' : '#000000';

  for (let y = 0; y < rows; y++) {
    let runStart = -1;
    for (let x = 0; x < cols; x++) {
      const hidden = fog[y * cols + x] === 0;
      if (hidden && runStart === -1) {
        runStart = x;
      } else if (!hidden && runStart !== -1) {
        ctx.fillRect(
          runStart * cellSize,
          y * cellSize,
          (x - runStart) * cellSize,
          cellSize,
        );
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      ctx.fillRect(
        runStart * cellSize,
        y * cellSize,
        (cols - runStart) * cellSize,
        cellSize,
      );
    }
  }
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
