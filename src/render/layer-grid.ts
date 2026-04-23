import type { GridConfig } from '../state/types.js';
import type { Theme } from '../state/preferences.js';

export interface GridRenderOptions {
  highContrast: boolean;
  theme: Theme;
}

/**
 * Grid-line palette keyed by theme. Phase 59 added 3 new themes — we
 * group them by "ink on light" (parchment) vs "light on dark"
 * (console, purple-dusk) so the lines stay readable on each backdrop.
 * Colors borrow each theme's own accent hue lightly so the grid feels
 * native (warm brown for parchment, terminal green for console, etc.)
 * rather than just plain black/white everywhere.
 */
const LINE_COLORS: Record<import('../state/preferences.js').Theme, {
  normal: string;
  boundary: string;
  highContrastNormal: string;
  highContrastBoundary: string;
}> = {
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
  parchment: {
    // Faded brown ink — matches the "old hand-drawn map" feel.
    normal: 'rgba(80, 50, 20, 0.15)',
    boundary: 'rgba(80, 50, 20, 0.4)',
    highContrastNormal: 'rgba(60, 35, 10, 0.45)',
    highContrastBoundary: 'rgba(60, 35, 10, 0.85)',
  },
  console: {
    // Terminal green at low alpha so it doesn't drown the map.
    normal: 'rgba(0, 255, 127, 0.12)',
    boundary: 'rgba(0, 255, 127, 0.3)',
    highContrastNormal: 'rgba(0, 255, 127, 0.4)',
    highContrastBoundary: 'rgba(0, 255, 127, 0.75)',
  },
  'purple-dusk': {
    normal: 'rgba(220, 200, 255, 0.12)',
    boundary: 'rgba(220, 200, 255, 0.28)',
    highContrastNormal: 'rgba(220, 200, 255, 0.4)',
    highContrastBoundary: 'rgba(220, 200, 255, 0.75)',
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
