/**
 * Phase 81 (revisit) — animated GIF token overlay.
 *
 * The original 0.81.0 implementation tried to use `ctx.drawImage(img)`
 * on a hidden animated `<img>` element, hoping that browsers would
 * advance the GIF's frames internally and `drawImage` would pick up
 * the current frame. This is NOT how Chromium / Firefox / Safari
 * behave: `drawImage` of an animated source always reads frame 0.
 * (The bug went unreported because the Token Editor preview uses a
 * real `<img>` element which DOES animate — but the canvas didn't.)
 *
 * The right fix: render animated tokens as actual `<img>` DOM
 * elements positioned absolutely over the canvas. The browser's
 * native GIF playback handles the animation; we just keep each
 * `<img>`'s position + size in sync with the underlying token's
 * world-to-screen mapping every frame.
 *
 * Per-frame work:
 *   - For each animated token: ensure an `<img>` exists, update its
 *     `transform` + `width` + `height` to match the camera.
 *   - For each tracked DOM `<img>` whose token is gone or no longer
 *     animated: remove it.
 *
 * The canvas-side `drawTokens` skips drawing the image for animated
 * sources (still draws the colored circle background as a fallback
 * + the border / drag overlay) — see the `isAnimated` check inside.
 *
 * Limitations vs canvas rendering:
 *   - Token rotation is NOT applied to the DOM `<img>` (yet —
 *     `transform: rotate()` would work, just untested).
 *   - HP bars + condition chips render on the canvas BEHIND the
 *     `<img>`, so they get partially hidden by it. Acceptable for
 *     the animated-token visual flair.
 *   - GM-side fog tint / Spectator fog masking are canvas operations;
 *     the DOM `<img>` sits ON TOP of them so an animated token in
 *     a hidden cell would still be visible to the Spectator. The
 *     overlay hides the `<img>` for tokens whose center cell is in
 *     un-revealed fog (Spectator only) to preserve fog semantics.
 */

import type { ID, SessionState, Camera } from '../state/types.js';
import type { DragOverlay } from '../input/context.js';

export interface AnimatedTokenOverlayOptions {
  /** Main canvas — we read its bounding rect to translate world → screen. */
  canvas: HTMLCanvasElement;
  /** Active mode; spectator hides imgs for tokens in un-revealed fog. */
  mode: 'gm' | 'spectator';
  getState(): SessionState;
  getCamera(): Camera;
  /**
   * Loader hooks so we know which tokens to render here vs leave to
   * the canvas. `getUrl` returns the cached object URL so each DOM
   * `<img>` gets an independent src (the underlying blob URL is
   * shared so the browser cache deduplicates).
   */
  isAnimated(id: ID): boolean;
  getUrl(id: ID): string | null;
  /** Optional drag overlay so a dragging animated token follows the cursor. */
  getDragOverlay?(): DragOverlay | null;
}

export interface AnimatedTokenOverlayHandle {
  /** Re-sync DOM `<img>` positions to current state + camera. Cheap. */
  update(): void;
  destroy(): void;
}

export function mountAnimatedTokenOverlay(
  opts: AnimatedTokenOverlayOptions,
): AnimatedTokenOverlayHandle {
  const overlay = document.createElement('div');
  overlay.className = 'animated-token-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  /**
   * Tracks one DOM `<img>` per animated token. Keyed by token id so
   * we can incrementally diff each frame instead of clearing +
   * re-creating (which would re-decode the GIF + restart its
   * animation loop, jarring).
   */
  const elements = new Map<ID, HTMLImageElement>();

  function update(): void {
    const state = opts.getState();
    const camera = opts.getCamera();
    const drag = opts.getDragOverlay?.() ?? null;
    const dragSet = drag && drag.ids.length > 0 ? new Set(drag.ids) : null;
    const dx = drag?.deltaX ?? 0;
    const dy = drag?.deltaY ?? 0;

    const cssWidth = opts.canvas.clientWidth;
    const cssHeight = opts.canvas.clientHeight;
    const seen = new Set<ID>();

    for (const t of state.tokens) {
      if (!t.imageId) continue;
      if (!opts.isAnimated(t.imageId)) continue;
      const url = opts.getUrl(t.imageId);
      if (!url) continue;

      // Spectator fog hide — canvas fog covers a hidden cell so the
      // token shouldn't peek through the overlay. Center-cell check
      // is a coarse approximation; tokens straddling cells where the
      // center happens to land in fog still hide. Matches the
      // Spectator's existing visibility check in the canvas layer.
      if (opts.mode === 'spectator') {
        const gx = Math.floor(t.x);
        const gy = Math.floor(t.y);
        if (
          gx >= 0 &&
          gy >= 0 &&
          gx < state.grid.cols &&
          gy < state.grid.rows
        ) {
          const fogIdx = gy * state.grid.cols + gx;
          if (state.fog[fogIdx] !== 1) continue;
        }
      }

      seen.add(t.id);

      let el = elements.get(t.id);
      if (!el) {
        el = document.createElement('img');
        el.className = 'animated-token-img';
        el.src = url;
        elements.set(t.id, el);
        overlay.appendChild(el);
      } else if (el.src !== url) {
        // Token's imageId changed; swap the src.
        el.src = url;
      }

      // World → screen math, mirrors the canvas's `r = ... - 4`
      // shrink so the DOM circle exactly overlays the canvas circle
      // (not 4px of border around it, which would mask the existing
      // canvas border + selection highlight).
      const cellSize = state.grid.cellSize;
      const tokenWorldSize = t.size * cellSize;
      const isDragging = dragSet?.has(t.id) ?? false;
      const wx = (t.x + t.size / 2) * cellSize + (isDragging ? dx : 0);
      const wy = (t.y + t.size / 2) * cellSize + (isDragging ? dy : 0);

      const screenX = (wx - camera.x) * camera.zoom;
      const screenY = (wy - camera.y) * camera.zoom;
      const screenSize = Math.max(0, tokenWorldSize * camera.zoom - 8);

      // Skip rendering when the token has scrolled fully off-screen —
      // the browser would still tick the GIF's animation, but we
      // avoid the layout thrash from a transform that's miles away.
      if (
        screenX + screenSize / 2 < -50 ||
        screenY + screenSize / 2 < -50 ||
        screenX - screenSize / 2 > cssWidth + 50 ||
        screenY - screenSize / 2 > cssHeight + 50
      ) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';

      // translate3d hints to the compositor for hardware acceleration;
      // the per-frame transform update should never trigger layout.
      el.style.transform = `translate3d(${screenX - screenSize / 2}px, ${
        screenY - screenSize / 2
      }px, 0)`;
      el.style.width = `${screenSize}px`;
      el.style.height = `${screenSize}px`;

      // Drag-ghost the img to match the canvas's drag overlay alpha.
      el.style.opacity = isDragging ? '0.5' : '1';
    }

    // Remove DOM `<img>` elements for tokens that no longer exist or
    // are no longer animated. Iteration order preserved so tokens
    // tracked first stay attached first (no flicker on re-attach).
    for (const [id, el] of elements) {
      if (!seen.has(id)) {
        el.remove();
        elements.delete(id);
      }
    }
  }

  return {
    update,
    destroy() {
      overlay.remove();
      elements.clear();
    },
  };
}
