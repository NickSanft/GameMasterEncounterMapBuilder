import type { ID } from '../state/types.js';
import { getImage } from './store.js';

interface LoadEntry {
  status: 'loading' | 'loaded' | 'error';
  img: HTMLImageElement | null;
  /**
   * Phase 81 — true when the source MIME is `image/gif`. Drives:
   *   - Append-to-DOM-as-hidden so the browser advances GIF frames
   *     (an off-DOM `<img>` element doesn't animate; it has to be in
   *     a render tree, even if visually hidden).
   *   - Per-tab redraw ticker that calls `onReady()` ~12 fps while
   *     any animated image is loaded, so the canvas's `drawImage`
   *     picks up the current frame each tick.
   */
  isAnimated: boolean;
}

export interface ImageLoader {
  get(id: ID): HTMLImageElement | null;
  invalidate(id: ID): void;
  /**
   * Phase 81 — debug / test hook. Returns the count of currently-
   * loaded animated images (drives the redraw ticker shutdown when
   * the count reaches zero).
   */
  _animatedCount(): number;
}

/**
 * Phase 81 — single document-wide hidden container that holds every
 * loaded animated `<img>` so the browser keeps advancing GIF frames.
 * Position pinned off-screen + opacity 0 + pointer-events none so
 * the elements don't paint or intercept input. Created on first need
 * so test harnesses without a DOM (Vitest jsdom envs) can construct
 * loaders without side effects.
 */
let animatedContainer: HTMLDivElement | null = null;

function getAnimatedContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (animatedContainer && animatedContainer.isConnected) {
    return animatedContainer;
  }
  const div = document.createElement('div');
  div.className = 'animated-token-host';
  // The CSS `.animated-token-host` rule pins these off-screen +
  // hidden; we don't inline the styles so a future reskin can
  // tweak without recompiling.
  document.body.appendChild(div);
  animatedContainer = div;
  return div;
}

const ANIMATED_TICK_MS = 80; // ~12 fps redraw cap

export function createImageLoader(onReady: () => void): ImageLoader {
  const cache = new Map<ID, LoadEntry>();
  let animatedCount = 0;
  let animatedTickerId = 0;

  function startAnimatedTickerIfNeeded() {
    if (animatedTickerId !== 0) return;
    if (typeof window === 'undefined') return;
    animatedTickerId = window.setInterval(() => {
      if (animatedCount === 0) {
        window.clearInterval(animatedTickerId);
        animatedTickerId = 0;
        return;
      }
      onReady();
    }, ANIMATED_TICK_MS);
  }

  function load(id: ID) {
    cache.set(id, { status: 'loading', img: null, isAnimated: false });
    void getImage(id).then((record) => {
      if (!record) {
        cache.set(id, { status: 'error', img: null, isAnimated: false });
        onReady();
        return;
      }
      const url = URL.createObjectURL(record.blob);
      const img = new Image();
      const isAnimated = record.mimeType === 'image/gif';
      img.onload = () => {
        cache.set(id, { status: 'loaded', img, isAnimated });
        if (isAnimated) {
          // Append to the hidden host so the browser actually
          // advances GIF frames. Off-DOM `<img>` elements do NOT
          // animate; the browser only ticks images that exist in
          // a render tree.
          const host = getAnimatedContainer();
          host?.appendChild(img);
          animatedCount++;
          startAnimatedTickerIfNeeded();
        }
        onReady();
      };
      img.onerror = () => {
        cache.set(id, { status: 'error', img: null, isAnimated: false });
        onReady();
      };
      img.src = url;
    });
  }

  return {
    get(id: ID): HTMLImageElement | null {
      const entry = cache.get(id);
      if (!entry) {
        load(id);
        return null;
      }
      return entry.img;
    },
    invalidate(id: ID) {
      const entry = cache.get(id);
      if (entry?.isAnimated && entry.img && entry.img.parentElement) {
        // Remove the hidden DOM element so the browser stops
        // ticking it (and we don't leak nodes when the GM rapidly
        // re-uploads a token portrait).
        entry.img.remove();
        animatedCount = Math.max(0, animatedCount - 1);
      }
      cache.delete(id);
    },
    _animatedCount: () => animatedCount,
  };
}
