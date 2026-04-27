import type { GridConfig } from '../state/types.js';
import type { Theme } from '../state/preferences.js';
import {
  hexCenter,
  hexHorizontalStride,
  hexVerticalStride,
  pathHex,
} from './hex-geometry.js';

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

  // Phase 124 — hex overlay branch. The underlying coord system stays
  // rectangular (cellSize × cellSize); the hex render covers the same
  // map bounds but with pointy-top hex cells of vertex-radius =
  // cellSize. The boundary rect still draws so the GM can see the
  // logical map extent.
  if (grid.gridShape === 'hex') {
    if (grid.showGridLines) {
      drawHexOverlay(ctx, grid, normalStroke);
    }
    ctx.lineWidth = options.highContrast ? 3 : 2;
    ctx.strokeStyle = boundaryStroke;
    ctx.strokeRect(0, 0, mapW, mapH);
    return;
  }

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

/**
 * Phase 124 — paint the pointy-top hex cells covering the map bounds.
 * We over-iterate by 1 row + 1 col so partial hexes near the right /
 * bottom edges still get an outline. Hexes that fall entirely outside
 * the map rect still draw; the boundary rect drawn afterward covers
 * the logical extent.
 */
function drawHexOverlay(
  ctx: CanvasRenderingContext2D,
  grid: GridConfig,
  stroke: string,
): void {
  const size = grid.cellSize;
  const xStride = hexHorizontalStride(size);
  const yStride = hexVerticalStride(size);
  const mapW = grid.cols * size;
  const mapH = grid.rows * size;
  const cols = Math.ceil(mapW / xStride) + 1;
  const rows = Math.ceil(mapH / yStride) + 1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const center = hexCenter(c, r, size);
      pathHex(ctx, center.x, center.y, size);
    }
  }
  ctx.stroke();
}
