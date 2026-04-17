import type { Camera, GridConfig, ViewMode } from '../state/types.js';
import { drawGrid } from './layer-grid.js';

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly mode: ViewMode;
  camera: Camera;
  grid: GridConfig;
  requestRender(): void;
  resize(): void;
  destroy(): void;
}

interface CreateRendererOptions {
  canvas: HTMLCanvasElement;
  mode: ViewMode;
  camera: Camera;
  grid: GridConfig;
}

export function createRenderer(opts: CreateRendererOptions): Renderer {
  const { canvas, mode } = opts;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let rafHandle = 0;
  let cssWidth = 0;
  let cssHeight = 0;

  const state = {
    camera: opts.camera,
    grid: opts.grid,
  };

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

    const { camera, grid } = state;
    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    drawGrid(ctx, grid);
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
      return state.camera;
    },
    set camera(value: Camera) {
      state.camera = value;
      requestRender();
    },
    get grid() {
      return state.grid;
    },
    set grid(value: GridConfig) {
      state.grid = value;
      requestRender();
    },
    requestRender,
    resize,
    destroy() {
      window.removeEventListener('resize', onWindowResize);
      if (rafHandle !== 0) cancelAnimationFrame(rafHandle);
    },
  };
}
