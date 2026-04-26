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
 *
 * 0.84.1 — Spectator fog masking now consults the EFFECTIVE fog
 * (state.fog AND-masked with LoS visibility AND lights), not the raw
 * `state.fog`. Pre-0.84.1 a GM-revealed cell that the Spectator
 * couldn't see (no viewer / no light) would still show its animated
 * token: the canvas correctly draws the token + then covers it with
 * the LoS-derived fog overlay, but the DOM `<img>` floats above the
 * canvas so the canvas-fog couldn't mask it. Plumbing the effective
 * fog through `getEffectiveFog?()` lets the overlay match the canvas's
 * computed visibility exactly.
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
  /**
   * 0.84.1 — Spectator-side effective fog (state.fog AND-masked with
   * LoS visibility AND lights). When provided AND `mode === 'spectator'`,
   * the overlay uses this buffer for the cell-visibility check instead
   * of the raw `state.fog`. Returning `null` falls back to `state.fog`
   * (the pre-0.84.1 behavior). GM mode ignores this entirely.
   */
  getEffectiveFog?(): Uint8Array | null;
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

      // Spectator fog hide — the canvas-side fog overlay covers
      // hidden cells so the token shouldn't peek through. Without
      // this guard a DOM <img> would float above the canvas (z-index
      // 5) and the fog overlay couldn't mask it.
      //
      // 0.84.1 — Hide if ANY cell of the token's footprint is in fog,
      // not just the top-left. Pre-0.84.1 a size>1 token whose
      // top-left cell happened to be revealed but other cells were in
      // fog would show the GIF poking out. Stricter than the canvas's
      // `isTokenFullyHidden` check (which hides only when ALL cells
      // are in fog) — for animated tokens we lean on the side of "if
      // any of you is in fog, you don't render at all", since the DOM
      // <img> can't be partially masked by the canvas fog overlay
      // the way a canvas-rendered token can.
      //
      // Uses the effective fog (LoS-masked) when the entry provides
      // it, falls back to raw state.fog otherwise.
      if (opts.mode === 'spectator') {
        const fog = opts.getEffectiveFog?.() ?? state.fog;
        const cols = state.grid.cols;
        const rows = state.grid.rows;
        const x0 = Math.floor(t.x);
        const y0 = Math.floor(t.y);
        const x1 = Math.max(x0 + 1, Math.ceil(t.x + t.size));
        const y1 = Math.max(y0 + 1, Math.ceil(t.y + t.size));
        let anyHidden = false;
        for (let cy = y0; cy < y1 && !anyHidden; cy++) {
          for (let cx = x0; cx < x1 && !anyHidden; cx++) {
            if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
              // Off-grid cells count as hidden — a token half-off the
              // map shouldn't have its GIF render in the void.
              anyHidden = true;
              break;
            }
            if (fog[cy * cols + cx] !== 1) anyHidden = true;
          }
        }
        if (anyHidden) continue;
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
