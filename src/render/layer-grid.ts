import type { GridConfig } from '../state/types.js';
import type { Theme } from '../state/preferences.js';

export interface GridRenderOptions {
  highContrast: boolean;
  theme: Theme;
}

const LINE_COLORS = {
  dark: {
    normal: 'rgba(255, 255, 255, 0.12)',
    boundary: 'rgba(255, 255, 255, 0.25)',
    highContrastNormal: 'rgba(255, 255, 255, 0.35)',
    highContrastBoundary: 'rgba(255, 255, 255, 0.7)',
  },
  light: {
    normal: 'rgba(0, 0, 0, 0.12)',
    boundary: 'rgba(0, 0, 0, 0.3)',
    highContrastNormal: 'rgba(0, 0, 0, 0.35)',
    highContrastBoundary: 'rgba(0, 0, 0, 0.7)',
  },
};

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: GridConfig,
  options: GridRenderOptions = { highContrast: false, theme: 'dark' },
): void {
  const mapW = grid.cols * grid.cellSize;
  const mapH = grid.rows * grid.cellSize;
  const palette = LINE_COLORS[options.theme];
  const normalStroke = options.highContrast ? palette.highContrastNormal : palette.normal;
  const boundaryStroke = options.highContrast ? palette.highContrastBoundary : palette.boundary;

  if (!grid.showGridLines) {
    ctx.lineWidth = options.highContrast ? 3 : 2;
    ctx.strokeStyle = boundaryStroke;
    ctx.strokeRect(0, 0, mapW, mapH);
    return;
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = normalStroke;
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

  ctx.lineWidth = options.highContrast ? 3 : 2;
  ctx.strokeStyle = boundaryStroke;
  ctx.strokeRect(0, 0, mapW, mapH);
}
