import type { Camera, SessionState, ViewMode } from '../state/types.js';
import type { ImageProvider } from './layer-background.js';
import type { Preferences } from '../state/preferences.js';
import { drawBackground } from './layer-background.js';
import { drawGrid } from './layer-grid.js';
import { drawTokens } from './layer-tokens.js';
import { drawFog } from './layer-fog.js';
import { drawAnnotations } from './layer-annotations.js';
import { drawAoeTemplates } from './layer-aoe.js';
import { drawStrokes } from './layer-strokes.js';
import { drawGridLabels, drawSceneTint } from './layer-grid-labels.js';

/**
 * Canvas background for snapshot exports — must match the renderer's
 * `CANVAS_BG` so a saved-image of the map looks identical to what the
 * GM sees. Phase 59 extended this with the new theme variants.
 */
const CANVAS_BG: Record<import('../state/preferences.js').Theme, string> = {
  dark: '#14161a',
  light: '#e6e7ec',
  parchment: '#ebe0c5',
  console: '#080d08',
  'purple-dusk': '#0e0a1f',
};

export type SnapshotScope = 'whole-map' | 'visible-area';

export interface SnapshotOptions {
  state: SessionState;
  /** Determines fog rendering + GM-only visibility. */
  mode: ViewMode;
  scope: SnapshotScope;
  /** Upscale factor (1 / 2 / 4). Multiplies output pixel size. */
  scale: 1 | 2 | 4;
  /** Camera to use for `visible-area` scope. Ignored for `whole-map`. */
  liveCamera: Camera;
  /** CSS dimensions for `visible-area` scope (the main canvas's current size). */
  liveCssWidth: number;
  liveCssHeight: number;
  /** Resolver for images by id (token images, background). */
  getImage: ImageProvider;
  /** Live preferences blob (theme, label size, etc.). */
  preferences: Preferences;
}

export interface SnapshotResult {
  blob: Blob;
  /** Width in device pixels of the produced PNG. */
  pixelWidth: number;
  /** Height in device pixels of the produced PNG. */
  pixelHeight: number;
}

/**
 * Render the current session to an off-screen canvas and convert to a
 * PNG blob. The live renderer's interaction overlays (pings, drag,
 * measurement, etc.) are intentionally excluded — this is a
 * print-quality snapshot, not a screenshot.
 */
export interface SnapshotPlan {
  pixelWidth: number;
  pixelHeight: number;
  camera: Camera;
}

/**
 * Pure derivation of output dimensions + virtual camera for a snapshot.
 * Split out so it can be unit-tested without touching a real canvas
 * (jsdom doesn't implement `getContext('2d')`).
 */
export function planSnapshot(
  opts: Pick<
    SnapshotOptions,
    'state' | 'scope' | 'scale' | 'liveCamera' | 'liveCssWidth' | 'liveCssHeight'
  >,
): SnapshotPlan {
  const { state, scope, scale } = opts;
  if (scope === 'whole-map') {
    const { cols, rows, cellSize } = state.grid;
    if (cols <= 0 || rows <= 0 || cellSize <= 0) {
      throw new Error('Grid has zero dimensions — nothing to export.');
    }
    return {
      pixelWidth: Math.max(1, cols * cellSize * scale),
      pixelHeight: Math.max(1, rows * cellSize * scale),
      camera: { x: 0, y: 0, zoom: scale },
    };
  }
  if (!Number.isFinite(opts.liveCssWidth) || !Number.isFinite(opts.liveCssHeight)) {
    throw new Error('Live canvas has no size — nothing to export.');
  }
  if (opts.liveCssWidth <= 0 || opts.liveCssHeight <= 0) {
    throw new Error('Live canvas has zero size — nothing to export.');
  }
  return {
    pixelWidth: Math.max(1, Math.round(opts.liveCssWidth * scale)),
    pixelHeight: Math.max(1, Math.round(opts.liveCssHeight * scale)),
    camera: {
      x: opts.liveCamera.x,
      y: opts.liveCamera.y,
      zoom: opts.liveCamera.zoom * scale,
    },
  };
}

export async function renderSnapshot(
  opts: SnapshotOptions,
): Promise<SnapshotResult> {
  const { state, mode } = opts;
  const { pixelWidth, pixelHeight, camera } = planSnapshot(opts);

  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas unavailable for snapshot');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const prefs = opts.preferences;
  const theme = prefs.theme;
  const labelSize = prefs.labelSize;
  const gmFogColor = prefs.gmFogColor;
  const gmFogOpacity = prefs.gmFogOpacity;
  const showColorblindMarkers = prefs.colorblindMarkers;

  // Canvas background — matches the live renderer's solid backdrop.
  ctx.fillStyle = CANVAS_BG[theme];
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // Apply the virtual camera transform. The snapshot is drawn at CSS
  // pixel granularity (no DPR scaling) since the scale factor already
  // handles upsampling.
  ctx.save();
  ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  // Background art + grid.
  drawBackground(ctx, state.background, state.grid, opts.getImage, { theme });
  drawGrid(ctx, state.grid, {
    highContrast: prefs.highContrast,
    theme,
  });

  // Active-initiative glow should still be correct for the snapshot
  // so exported maps match what the players saw at that moment.
  const activeEntry = state.initiative.order.find(
    (e) => e.id === state.initiative.activeId,
  );
  const activeTokenId = activeEntry?.tokenId ?? null;

  drawTokens(ctx, state, new Set(), opts.getImage, {
    labelSize,
    showColorblindMarkers,
    mode,
    dragOverlay: null,
    activeInitiativeTokenId: activeTokenId,
  });
  drawAoeTemplates(ctx, state, {
    mode,
    highlightIds: new Set(),
    preview: null,
    dragOverlay: null,
  });
  drawFog(ctx, state, mode, {
    gmColor: gmFogColor,
    gmOpacity: gmFogOpacity,
  });
  drawStrokes(ctx, state.strokes, { mode, preview: null });
  drawAnnotations(ctx, state, {
    mode,
    highlightIds: new Set(),
    dragOverlay: null,
  });

  if (prefs.showGridLabels) {
    drawGridLabels(ctx, state.grid, camera.zoom);
  }
  if (prefs.sceneLightOpacity > 0) {
    drawSceneTint(
      ctx,
      pixelWidth,
      pixelHeight,
      prefs.sceneLightColor,
      prefs.sceneLightOpacity,
      camera.zoom,
      camera.x,
      camera.y,
    );
  }

  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) throw new Error('Canvas.toBlob returned null');
  return { blob, pixelWidth, pixelHeight };
}
