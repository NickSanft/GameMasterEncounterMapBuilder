import type { Renderer } from '../render/renderer.js';
import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';
import { viewportFromCamera } from '../render/viewport.js';
import { isTokenFullyHidden } from '../render/fog-visibility.js';

const MINI_CSS_WIDTH = 200;
const MINI_CSS_HEIGHT = 140;

export interface MiniMapOptions {
  renderer: Renderer;
  store: Store;
  viewMode: ViewMode;
  /** Background image provider (same one the main renderer uses). */
  getImage?(id: string): HTMLImageElement | HTMLCanvasElement | null;
}

export interface MiniMapHandle {
  setEnabled(on: boolean): void;
  /** Ask the mini-map to repaint (camera moved, state changed, etc.). */
  requestRender(): void;
  destroy(): void;
}

/**
 * A small floating canvas pinned to the bottom-right, above the zoom
 * controls. Renders a cheap stylized view of the whole grid + fog +
 * tokens + the current viewport rectangle. Clicking anywhere inside
 * recenters the main camera on that world point.
 *
 * Kept intentionally simple — no zoom, no interactivity beyond click;
 * every frame clears + redraws, which is cheap at 200×140 px.
 */
export function mountMiniMap(opts: MiniMapOptions): MiniMapHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'mini-map';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mini-map — click to recenter the camera');
  canvas.hidden = true;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = MINI_CSS_WIDTH * dpr;
  canvas.height = MINI_CSS_HEIGHT * dpr;
  canvas.style.width = `${MINI_CSS_WIDTH}px`;
  canvas.style.height = `${MINI_CSS_HEIGHT}px`;

  document.body.appendChild(canvas);

  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas unavailable for mini-map');
  const ctx: CanvasRenderingContext2D = maybeCtx;
  ctx.scale(dpr, dpr);

  let enabled = false;
  let rafHandle = 0;
  let unsubscribeFrame: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  function render(): void {
    rafHandle = 0;
    if (!enabled) return;
    const state = opts.store.getState();
    const { cols, rows, cellSize } = state.grid;
    if (cols <= 0 || rows <= 0) return;

    const worldW = cols * cellSize;
    const worldH = rows * cellSize;
    const scale = Math.min(MINI_CSS_WIDTH / worldW, MINI_CSS_HEIGHT / worldH);
    const gridW = worldW * scale;
    const gridH = worldH * scale;
    // Center the grid rect inside the mini-canvas.
    const offsetX = (MINI_CSS_WIDTH - gridW) / 2;
    const offsetY = (MINI_CSS_HEIGHT - gridH) / 2;

    // Clear.
    ctx.clearRect(0, 0, MINI_CSS_WIDTH, MINI_CSS_HEIGHT);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, MINI_CSS_WIDTH, MINI_CSS_HEIGHT);

    // Grid backdrop.
    ctx.fillStyle = '#2a2e35';
    ctx.fillRect(offsetX, offsetY, gridW, gridH);

    // Background image (if loaded) — drawn stretched into the grid rect.
    const bg = state.background;
    if (bg.imageId && opts.getImage) {
      const img = opts.getImage(bg.imageId);
      if (img) {
        try {
          ctx.drawImage(img, offsetX, offsetY, gridW, gridH);
        } catch {
          /* image may still be decoding — skip this frame */
        }
      }
    }

    // Fog overlay (fully-hidden cells go dark). Spectator view sees
    // fog as opaque; GM sees it as translucent like the main canvas.
    const fogAlpha = opts.viewMode === 'spectator' ? 0.95 : 0.55;
    ctx.fillStyle = `rgba(0, 0, 0, ${fogAlpha})`;
    const cellW = gridW / cols;
    const cellH = gridH / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (state.fog[y * cols + x] !== 1) {
          ctx.fillRect(
            offsetX + x * cellW,
            offsetY + y * cellH,
            cellW + 0.5, // +0.5 hides seams at low scale
            cellH + 0.5,
          );
        }
      }
    }

    // Tokens — as tiny dots.
    for (const t of state.tokens) {
      if (opts.viewMode === 'spectator' && isTokenFullyHidden(t, state)) continue;
      const cx = offsetX + (t.x + t.size / 2) * cellSize * scale;
      const cy = offsetY + (t.y + t.size / 2) * cellSize * scale;
      const r = Math.max(1.2, t.size * cellSize * scale * 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
      if (t.borderColor) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = t.borderColor;
        ctx.stroke();
      }
    }

    // Viewport rectangle — shows what the main canvas is currently showing.
    const viewport = viewportFromCamera(
      opts.renderer.camera,
      opts.renderer.cssWidth,
      opts.renderer.cssHeight,
    );
    const vx = offsetX + viewport.x * scale;
    const vy = offsetY + viewport.y * scale;
    const vw = viewport.width * scale;
    const vh = viewport.height * scale;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd54a';
    ctx.strokeRect(vx, vy, vw, vh);
  }

  function requestRender(): void {
    if (!enabled) return;
    if (rafHandle !== 0) return;
    rafHandle = requestAnimationFrame(render);
  }

  /**
   * Convert a click inside the mini-map to a world-space center point
   * and recenter the main camera on it.
   */
  canvas.addEventListener('click', (e) => {
    if (!enabled) return;
    const state = opts.store.getState();
    const { cols, rows, cellSize } = state.grid;
    if (cols <= 0 || rows <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const worldW = cols * cellSize;
    const worldH = rows * cellSize;
    const scale = Math.min(MINI_CSS_WIDTH / worldW, MINI_CSS_HEIGHT / worldH);
    const gridW = worldW * scale;
    const gridH = worldH * scale;
    const offsetX = (MINI_CSS_WIDTH - gridW) / 2;
    const offsetY = (MINI_CSS_HEIGHT - gridH) / 2;

    // World coord of click (0,0 = top-left of grid).
    const worldX = (localX - offsetX) / scale;
    const worldY = (localY - offsetY) / scale;

    // Center the main camera on that world point.
    const zoom = opts.renderer.camera.zoom > 0 ? opts.renderer.camera.zoom : 1;
    opts.renderer.camera = {
      x: worldX - opts.renderer.cssWidth / (2 * zoom),
      y: worldY - opts.renderer.cssHeight / (2 * zoom),
      zoom,
    };
    requestRender();
  });

  function setEnabled(on: boolean): void {
    if (on === enabled) return;
    enabled = on;
    canvas.hidden = !on;
    if (on) {
      // Refresh on canvas camera changes + every state update.
      unsubscribeFrame = opts.renderer.onCameraChange(() => requestRender());
      unsubscribeStore = opts.store.subscribe(() => requestRender());
      requestRender();
    } else {
      unsubscribeFrame?.();
      unsubscribeStore?.();
      unsubscribeFrame = null;
      unsubscribeStore = null;
      if (rafHandle !== 0) {
        cancelAnimationFrame(rafHandle);
        rafHandle = 0;
      }
    }
  }

  return {
    setEnabled,
    requestRender,
    destroy() {
      setEnabled(false);
      canvas.remove();
    },
  };
}
