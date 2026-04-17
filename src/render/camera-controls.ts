import type { Renderer } from './renderer.js';
import type { ID, SessionState } from '../state/types.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { screenToWorld } from './coords.js';

export const MIN_CAMERA_ZOOM = 0.1;
export const MAX_CAMERA_ZOOM = 8;
export const ZOOM_BUTTON_STEP = 1.25;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function zoomByAt(
  renderer: Renderer,
  sx: number,
  sy: number,
  factor: number,
): void {
  const camera = renderer.camera;
  const newZoom = clamp(camera.zoom * factor, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
  if (newZoom === camera.zoom) return;
  const before = screenToWorld(camera, sx, sy);
  renderer.camera = {
    x: before.x - sx / newZoom,
    y: before.y - sy / newZoom,
    zoom: newZoom,
  };
}

export function zoomBy(renderer: Renderer, factor: number): void {
  const rect = renderer.canvas.getBoundingClientRect();
  zoomByAt(renderer, rect.width / 2, rect.height / 2, factor);
}

export function resetCamera(renderer: Renderer): void {
  renderer.camera = { ...DEFAULT_CAMERA };
}

export interface ContentBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeContentBounds(
  state: SessionState,
  getImage: (id: ID) => HTMLImageElement | null,
): ContentBounds {
  const grid = state.grid;
  let minX = 0;
  let minY = 0;
  let maxX = grid.cols * grid.cellSize;
  let maxY = grid.rows * grid.cellSize;

  if (state.background.imageId) {
    const img = getImage(state.background.imageId);
    if (img) {
      const bgX = state.background.offsetX;
      const bgY = state.background.offsetY;
      const bgW = img.naturalWidth * state.background.scaleX;
      const bgH = img.naturalHeight * state.background.scaleY;
      minX = Math.min(minX, bgX);
      minY = Math.min(minY, bgY);
      maxX = Math.max(maxX, bgX + bgW);
      maxY = Math.max(maxY, bgY + bgH);
    }
  }

  for (const t of state.tokens) {
    const tx = t.x * grid.cellSize;
    const ty = t.y * grid.cellSize;
    const tw = t.size * grid.cellSize;
    const th = t.size * grid.cellSize;
    minX = Math.min(minX, tx);
    minY = Math.min(minY, ty);
    maxX = Math.max(maxX, tx + tw);
    maxY = Math.max(maxY, ty + th);
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function fitToContent(
  renderer: Renderer,
  state: SessionState,
  getImage: (id: ID) => HTMLImageElement | null,
): void {
  const bounds = computeContentBounds(state, getImage);
  if (bounds.w <= 0 || bounds.h <= 0) return;
  const rect = renderer.canvas.getBoundingClientRect();
  const padding = 40;
  const availW = Math.max(1, rect.width - padding * 2);
  const availH = Math.max(1, rect.height - padding * 2);
  const zoom = clamp(
    Math.min(availW / bounds.w, availH / bounds.h),
    MIN_CAMERA_ZOOM,
    MAX_CAMERA_ZOOM,
  );
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  renderer.camera = {
    x: centerX - rect.width / (2 * zoom),
    y: centerY - rect.height / (2 * zoom),
    zoom,
  };
}
