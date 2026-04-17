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
import type { Preferences } from '../state/preferences.js';

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
}

const EMPTY_HIGHLIGHT: ReadonlySet<ID> = new Set();
const NO_IMAGE: ImageProvider = () => null;

const RENDER_DEFAULTS = {
  highContrast: false,
  labelSize: 'medium' as const,
  gmFogColor: '#ff0000',
  gmFogOpacity: 0.35,
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

    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const state = getState();
    const highlights = getHighlightIds ? getHighlightIds() : EMPTY_HIGHLIGHT;
    const prefs = getPreferences ? getPreferences() : null;
    const highContrast = prefs?.highContrast ?? RENDER_DEFAULTS.highContrast;
    const labelSize = prefs?.labelSize ?? RENDER_DEFAULTS.labelSize;
    const gmFogColor = prefs?.gmFogColor ?? RENDER_DEFAULTS.gmFogColor;
    const gmFogOpacity = prefs?.gmFogOpacity ?? RENDER_DEFAULTS.gmFogOpacity;
    const showColorblindMarkers = prefs?.colorblindMarkers ?? false;

    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    drawBackground(ctx, state.background, state.grid, getImage);
    drawGrid(ctx, state.grid, { highContrast });
    drawTokens(ctx, state, highlights, getImage, {
      labelSize,
      showColorblindMarkers,
    });
    drawFog(ctx, state, mode, { gmColor: gmFogColor, gmOpacity: gmFogOpacity });
    const preview = getFogPreview ? getFogPreview() : null;
    if (preview) {
      drawFogPreview(ctx, preview, state.grid.cellSize);
    } else {
      const hover = getFogHoverPreview ? getFogHoverPreview() : null;
      if (hover) drawFogHoverPreview(ctx, hover, state.grid.cellSize);
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
