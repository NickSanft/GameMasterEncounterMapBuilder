import type {
  Camera,
  ID,
  SessionState,
  ViewMode,
} from '../state/types.js';
import { drawGrid } from './layer-grid.js';
import { drawTokens } from './layer-tokens.js';
import {
  drawFog,
  drawFogPreview,
  drawFogHoverPreview,
  type FogPreview,
  type FogHoverPreview,
} from './layer-fog.js';
import { drawBackground, type ImageProvider } from './layer-background.js';
import { createBackgroundCache } from './background-cache.js';
import { drawLasso } from './layer-lasso.js';
import { drawPings } from './layer-pings.js';
import { drawAnnotations } from './layer-annotations.js';
import { drawMeasurement, type MeasurementOverlay } from './layer-measure.js';
import { drawAoeTemplates, type AoePreview } from './layer-aoe.js';
import {
  drawSpectatorViewport,
} from './layer-spectator-viewport.js';
import { drawMovementIndicator } from './layer-movement-indicator.js';
import { drawStrokes } from './layer-strokes.js';
import { drawWalls } from './layer-walls.js';
import { drawLosPolygons } from './layer-los.js';
import { drawGridLabels, drawSceneTint } from './layer-grid-labels.js';
import { gridDistance, formatDistance } from '../state/distance.js';
import type { DrawStroke } from '../state/types.js';
import type { Preferences } from '../state/preferences.js';
import type { DragOverlay, LassoOverlay, WallsOverlay } from '../input/context.js';
import type { Ping } from '../state/ping-manager.js';
import type { ViewportRect } from '../sync/messages.js';

export interface FrameSample {
  /** Time elapsed since the previous rendered frame, in ms. */
  deltaMs: number;
  /** Duration of this frame's render call, in ms. */
  renderMs: number;
  /** CSS-pixel canvas dimensions. */
  cssWidth: number;
  cssHeight: number;
}

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly mode: ViewMode;
  camera: Camera;
  readonly cssWidth: number;
  readonly cssHeight: number;
  requestRender(): void;
  resize(): void;
  destroy(): void;
  onCameraChange(listener: () => void): () => void;
  onFrame(listener: (sample: FrameSample) => void): () => void;
}

interface CreateRendererOptions {
  canvas: HTMLCanvasElement;
  mode: ViewMode;
  camera: Camera;
  getState(): SessionState;
  getHighlightIds?(): ReadonlySet<ID>;
  getFogPreview?(): FogPreview | null;
  getFogHoverPreview?(): FogHoverPreview | null;
  getImage?: ImageProvider;
  getPreferences?(): Preferences;
  getDragOverlay?(): DragOverlay | null;
  getLassoOverlay?(): LassoOverlay | null;
  getPings?(): readonly Ping[];
  getMeasurement?(): MeasurementOverlay | null;
  getAoePreview?(): AoePreview | null;
  getSpectatorViewport?(): ViewportRect | null;
  /** Active ruler-preset target feet (null = freeform). */
  getRulerTargetFeet?(): number | null;
  /** Optional in-progress stroke (pre-commit) for the Draw tool. */
  getDrawPreview?(): DrawStroke | null;
  /**
   * Optional precomputed run-length-compacted fog rectangles. Set by
   * the entry when the fog WebWorker pipeline is available — saves an
   * inline scan through the fog grid each frame on large maps. When
   * omitted (or returns null) the renderer falls back to inline
   * compaction inside `drawFog`.
   */
  getFogRects?(): import('./fog-rects.js').FogRect[] | null;
  /**
   * In-progress walls chain while the Walls tool is active. GM-only —
   * Spectator never sees walls or chain previews.
   */
  getWallsOverlay?(): WallsOverlay | null;
  /**
   * Current LoS visibility polygons (one per viewer token). GM entry
   * passes the latest from `fogWorkerClient.getLatestPolygons()` when
   * `losMode !== 'off'`, `null` otherwise. The layer itself further
   * no-ops on Spectator — Spectator consumes polygons via fog masking.
   */
  getLosPolygons?(): import('../state/los.js').LosPoint[][] | null;
}

const EMPTY_HIGHLIGHT: ReadonlySet<ID> = new Set();
const NO_IMAGE: ImageProvider = () => null;

const RENDER_DEFAULTS = {
  highContrast: false,
  labelSize: 'medium' as const,
  gmFogColor: '#ff0000',
  gmFogOpacity: 0.35,
  theme: 'dark' as const,
};

const CANVAS_BG = {
  dark: '#14161a',
  light: '#e6e7ec',
};

export function createRenderer(opts: CreateRendererOptions): Renderer {
  const {
    canvas,
    mode,
    getState,
    getHighlightIds,
    getFogPreview,
    getFogHoverPreview,
    getImage = NO_IMAGE,
    getPreferences,
    getDragOverlay,
    getLassoOverlay,
    getPings,
    getMeasurement,
    getAoePreview,
    getSpectatorViewport,
    getRulerTargetFeet,
    getDrawPreview,
    getFogRects,
    getWallsOverlay,
    getLosPolygons,
  } = opts;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let rafHandle = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let camera: Camera = opts.camera;
  let lastFrameAt = 0;
  const cameraListeners = new Set<() => void>();
  const frameListeners = new Set<(sample: FrameSample) => void>();
  // Background layer cache — amortises the per-frame `drawBackground`
  // work into a single `drawImage` of a pre-painted `OffscreenCanvas`.
  // Returns `null` in environments without OffscreenCanvas (jsdom,
  // very old browsers); renderer falls through to inline painting.
  const bgCache = createBackgroundCache();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    requestRender();
  }

  function render() {
    rafHandle = 0;
    const frameStart = performance.now();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const prefs = getPreferences ? getPreferences() : null;
    const theme = prefs?.theme ?? RENDER_DEFAULTS.theme;
    ctx.fillStyle = CANVAS_BG[theme];
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const state = getState();
    const highlights = getHighlightIds ? getHighlightIds() : EMPTY_HIGHLIGHT;
    const highContrast = prefs?.highContrast ?? RENDER_DEFAULTS.highContrast;
    const labelSize = prefs?.labelSize ?? RENDER_DEFAULTS.labelSize;
    const gmFogColor = prefs?.gmFogColor ?? RENDER_DEFAULTS.gmFogColor;
    const gmFogOpacity = prefs?.gmFogOpacity ?? RENDER_DEFAULTS.gmFogOpacity;
    const showColorblindMarkers = prefs?.colorblindMarkers ?? false;

    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    const cachedBg = bgCache.getBitmap(state, { theme }, getImage);
    if (cachedBg) {
      ctx.drawImage(cachedBg, 0, 0);
    } else {
      drawBackground(ctx, state.background, state.grid, getImage, { theme });
    }
    drawGrid(ctx, state.grid, { highContrast, theme });
    const dragOverlay = getDragOverlay ? getDragOverlay() : null;
    const activeEntry = state.initiative.order.find(
      (e) => e.id === state.initiative.activeId,
    );
    const activeTokenId = activeEntry?.tokenId ?? null;
    drawTokens(ctx, state, highlights, getImage, {
      labelSize,
      showColorblindMarkers,
      mode,
      dragOverlay,
      activeInitiativeTokenId: activeTokenId,
    });
    drawAoeTemplates(ctx, state, {
      mode,
      highlightIds: highlights,
      preview: getAoePreview ? getAoePreview() : null,
      dragOverlay,
    });
    const precomputedFogRects = getFogRects ? getFogRects() : null;
    drawFog(ctx, state, mode, {
      gmColor: gmFogColor,
      gmOpacity: gmFogOpacity,
      ...(precomputedFogRects ? { precomputedRects: precomputedFogRects } : {}),
    });
    drawStrokes(ctx, state.strokes, {
      mode,
      preview: getDrawPreview ? getDrawPreview() : null,
    });
    drawAnnotations(ctx, state, {
      mode,
      highlightIds: highlights,
      dragOverlay,
    });
    // Walls render above annotations but below the live interaction
    // overlays (fog preview, measurement, pings). GM-only — the layer
    // no-ops on the Spectator canvas.
    drawWalls(ctx, state.walls, {
      mode,
      overlay: getWallsOverlay ? getWallsOverlay() : null,
      zoom: camera.zoom,
    });
    // LoS visibility polygons — GM-only yellow outline so the GM sees
    // what each viewer can see. Spectator consumes these via fog
    // masking upstream, not by drawing outlines.
    drawLosPolygons(ctx, {
      mode,
      zoom: camera.zoom,
      polygons: getLosPolygons ? getLosPolygons() : null,
    });
    const preview = getFogPreview ? getFogPreview() : null;
    if (preview) {
      drawFogPreview(ctx, preview, state.grid.cellSize);
    } else {
      const hover = getFogHoverPreview ? getFogHoverPreview() : null;
      if (hover) drawFogHoverPreview(ctx, hover, state.grid.cellSize);
    }
    const lasso = getLassoOverlay ? getLassoOverlay() : null;
    if (lasso) drawLasso(ctx, lasso);
    const measurement = getMeasurement ? getMeasurement() : null;
    if (measurement) {
      drawMeasurement(ctx, measurement, state.grid.cellSize, {
        diagonalRule: prefs?.diagonalRule ?? 'chebyshev',
        distanceUnit: prefs?.distanceUnit ?? 'squares',
        feetPerSquare: prefs?.feetPerSquare ?? 5,
        targetFeet: getRulerTargetFeet ? getRulerTargetFeet() : null,
      });
    }
    const pings = getPings ? getPings() : null;
    if (pings && pings.length > 0) {
      drawPings(ctx, pings, state.grid.cellSize, performance.now());
    }
    if (mode === 'gm' && getSpectatorViewport) {
      const vp = getSpectatorViewport();
      if (vp) drawSpectatorViewport(ctx, vp, camera.zoom);
    }
    // Movement-remaining indicator — drawn while a GM is dragging tokens.
    if (mode === 'gm' && dragOverlay && dragOverlay.ids.length > 0) {
      drawMovementOverlay(ctx, state, dragOverlay, camera.zoom, prefs);
    }
    // Grid labels (chess-style A1 coords in the gutters) — on top of
    // most layers but beneath the scene tint so the tint darkens them.
    if (prefs?.showGridLabels) {
      drawGridLabels(ctx, state.grid, camera.zoom);
    }
    // Scene tint — painted last (over everything) so ambient lighting
    // actually darkens the view.
    if (prefs && prefs.sceneLightOpacity > 0) {
      drawSceneTint(
        ctx,
        cssWidth,
        cssHeight,
        prefs.sceneLightColor,
        prefs.sceneLightOpacity,
        camera.zoom,
        camera.x,
        camera.y,
      );
    }
    ctx.restore();

    if (frameListeners.size > 0) {
      const renderMs = performance.now() - frameStart;
      const deltaMs = lastFrameAt > 0 ? frameStart - lastFrameAt : 0;
      lastFrameAt = frameStart;
      const sample: FrameSample = { deltaMs, renderMs, cssWidth, cssHeight };
      for (const l of frameListeners) l(sample);
    } else {
      lastFrameAt = frameStart;
    }
  }

  function requestRender() {
    if (rafHandle !== 0) return;
    rafHandle = requestAnimationFrame(render);
  }

  const onWindowResize = () => resize();
  window.addEventListener('resize', onWindowResize);

  resize();

  return {
    canvas,
    mode,
    get camera() {
      return camera;
    },
    set camera(value: Camera) {
      camera = value;
      requestRender();
      for (const l of cameraListeners) l();
    },
    get cssWidth() {
      return cssWidth;
    },
    get cssHeight() {
      return cssHeight;
    },
    requestRender,
    resize,
    destroy() {
      window.removeEventListener('resize', onWindowResize);
      if (rafHandle !== 0) cancelAnimationFrame(rafHandle);
      cameraListeners.clear();
      frameListeners.clear();
      bgCache.destroy();
    },
    onCameraChange(listener: () => void): () => void {
      cameraListeners.add(listener);
      return () => cameraListeners.delete(listener);
    },
    onFrame(listener: (sample: FrameSample) => void): () => void {
      frameListeners.add(listener);
      return () => frameListeners.delete(listener);
    },
  };
}

/**
 * Resolve the movement-indicator line/label from the current drag overlay
 * and draw it. Prefers a token as the origin (since dragging tokens is the
 * common case); if only annotations / AoE templates are being dragged,
 * falls back silently (no indicator).
 */
function drawMovementOverlay(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  drag: DragOverlay,
  zoom: number,
  prefs: Preferences | null,
): void {
  if (drag.deltaX === 0 && drag.deltaY === 0) return;
  const { cellSize } = state.grid;
  // Pick the first dragged token (in selection/drag order) as the origin.
  const firstTokenId = drag.ids.find((id) =>
    state.tokens.some((t) => t.id === id),
  );
  if (!firstTokenId) return;
  const token = state.tokens.find((t) => t.id === firstTokenId);
  if (!token) return;

  const originX = (token.x + token.size / 2) * cellSize;
  const originY = (token.y + token.size / 2) * cellSize;
  const endX = originX + drag.deltaX;
  const endY = originY + drag.deltaY;

  // Compute distance in cells using the preferred diagonal rule.
  const dxCells = drag.deltaX / cellSize;
  const dyCells = drag.deltaY / cellSize;
  const rule = prefs?.diagonalRule ?? 'chebyshev';
  const cells = gridDistance(dxCells, dyCells, rule);
  // Drags smaller than half a cell don't round to any movement yet — skip
  // the label so dragging in place doesn't flicker a "0 sq" pill.
  if (cells === 0) return;
  const unit = prefs?.distanceUnit ?? 'squares';
  const feetPerSquare = prefs?.feetPerSquare ?? 5;
  const label = formatDistance(cells, unit, feetPerSquare);

  drawMovementIndicator(ctx, originX, originY, endX, endY, cellSize, zoom, label);
}
