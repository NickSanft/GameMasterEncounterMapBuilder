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
import { drawLasso } from './layer-lasso.js';
import { drawPings } from './layer-pings.js';
import { drawAnnotations } from './layer-annotations.js';
import type { Preferences } from '../state/preferences.js';
import type { DragOverlay, LassoOverlay } from '../input/context.js';
import type { Ping } from '../state/ping-manager.js';

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly mode: ViewMode;
  camera: Camera;
  requestRender(): void;
  resize(): void;
  destroy(): void;
  onCameraChange(listener: () => void): () => void;
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
  } = opts;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let rafHandle = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let camera: Camera = opts.camera;
  const cameraListeners = new Set<() => void>();

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
    drawBackground(ctx, state.background, state.grid, getImage, { theme });
    drawGrid(ctx, state.grid, { highContrast, theme });
    const dragOverlay = getDragOverlay ? getDragOverlay() : null;
    drawTokens(ctx, state, highlights, getImage, {
      labelSize,
      showColorblindMarkers,
      mode,
      dragOverlay,
    });
    drawFog(ctx, state, mode, { gmColor: gmFogColor, gmOpacity: gmFogOpacity });
    drawAnnotations(ctx, state, {
      mode,
      highlightIds: highlights,
      dragOverlay,
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
    const pings = getPings ? getPings() : null;
    if (pings && pings.length > 0) {
      drawPings(ctx, pings, state.grid.cellSize, performance.now());
    }
    ctx.restore();
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
    requestRender,
    resize,
    destroy() {
      window.removeEventListener('resize', onWindowResize);
      if (rafHandle !== 0) cancelAnimationFrame(rafHandle);
    },
    onCameraChange(listener: () => void): () => void {
      cameraListeners.add(listener);
      return () => cameraListeners.delete(listener);
    },
  };
}
