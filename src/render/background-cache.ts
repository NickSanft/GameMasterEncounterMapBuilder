/**
 * Background-layer bitmap cache.
 *
 * The background (fallback fill + optional image at its offset/scale) is
 * static across frames — it only changes when the grid resizes, the
 * background image swaps, the user drags/scales the image with the Map
 * tool, or the theme switches. Re-painting it every frame wastes work
 * that a cached `OffscreenCanvas` can skip.
 *
 * This module owns an `OffscreenCanvas` sized to the world dimensions
 * (`grid.cols * cellSize × grid.rows * cellSize`). The first render
 * paints into it via the existing `drawBackground()` helper; subsequent
 * renders reuse the bitmap via `drawImage(cache, 0, 0)` in the renderer.
 *
 * Grid lines are intentionally NOT cached: they're cheap to paint each
 * frame (O(cols + rows)) and a bitmap cache would make them fuzzy at
 * non-1× zoom levels.
 *
 * Graceful fallback: when `OffscreenCanvas` is unavailable (some Safari
 * builds, jsdom, workers without feature support) or the world grid
 * exceeds the safe bitmap cap, `getBitmap()` returns `null` and the
 * caller falls through to inline rendering.
 */

import type { Background, GridConfig, ID, SessionState } from '../state/types.js';
import type { Preferences, Theme } from '../state/preferences.js';
import { drawBackground, type ImageProvider } from './layer-background.js';

/**
 * Maximum edge length (in CSS pixels) for the offscreen bitmap. Safari
 * historically capped `OffscreenCanvas` at 4096×4096; we stay well under
 * that and fall through to inline rendering for larger grids. The
 * default grid (30×20 @ 50px = 1500×1000) is comfortably inside.
 */
export const MAX_CACHE_EDGE_PX = 4096;

export interface BackgroundCacheKey {
  gridCols: number;
  gridRows: number;
  cellSize: number;
  theme: Theme;
  bgImageId: ID | null;
  /**
   * Whether the image referenced by `bgImageId` is actually loaded at
   * cache-rebuild time. Needed so the cache invalidates once an in-flight
   * image fetch lands — otherwise we'd show the fallback fill forever.
   */
  bgImageLoaded: boolean;
  bgOffsetX: number;
  bgOffsetY: number;
  bgScaleX: number;
  bgScaleY: number;
  /**
   * Phase 140 — rotation in radians (default 0) + flipX / flipY
   * booleans (default false). Cache invalidates whenever any of
   * these change so the next render re-paints the bitmap with the
   * new transform.
   */
  bgRotation: number;
  bgFlipX: boolean;
  bgFlipY: boolean;
}

/**
 * Build a cache key from the slices of state + prefs that the background
 * layer actually reads. Pure — no DOM, no side effects.
 */
export function backgroundCacheKeyOf(
  background: Background,
  grid: GridConfig,
  theme: Theme,
  bgImageLoaded: boolean,
): BackgroundCacheKey {
  return {
    gridCols: grid.cols,
    gridRows: grid.rows,
    cellSize: grid.cellSize,
    theme,
    bgImageId: background.imageId,
    bgImageLoaded,
    bgOffsetX: background.offsetX,
    bgOffsetY: background.offsetY,
    bgScaleX: background.scaleX,
    bgScaleY: background.scaleY,
    bgRotation: background.rotation ?? 0,
    bgFlipX: background.flipX === true,
    bgFlipY: background.flipY === true,
  };
}

/** Shallow equality on the cache key. */
export function cacheKeyEquals(a: BackgroundCacheKey, b: BackgroundCacheKey): boolean {
  return (
    a.gridCols === b.gridCols &&
    a.gridRows === b.gridRows &&
    a.cellSize === b.cellSize &&
    a.theme === b.theme &&
    a.bgImageId === b.bgImageId &&
    a.bgImageLoaded === b.bgImageLoaded &&
    a.bgOffsetX === b.bgOffsetX &&
    a.bgOffsetY === b.bgOffsetY &&
    a.bgScaleX === b.bgScaleX &&
    a.bgScaleY === b.bgScaleY &&
    a.bgRotation === b.bgRotation &&
    a.bgFlipX === b.bgFlipX &&
    a.bgFlipY === b.bgFlipY
  );
}

export interface BackgroundCache {
  /**
   * Return a cached `OffscreenCanvas` that already contains a painted
   * background layer for the given state+prefs. Returns `null` if the
   * bitmap can't be produced (unsupported env, oversized grid) — in
   * that case the caller should fall back to inline `drawBackground()`.
   *
   * The returned canvas is owned by the cache; callers must not mutate
   * it. Its dimensions are `grid.cols * cellSize × grid.rows * cellSize`.
   */
  getBitmap(
    state: SessionState,
    prefs: Pick<Preferences, 'theme'>,
    getImage: ImageProvider,
  ): OffscreenCanvas | null;
  /** Force the next `getBitmap` call to rebuild regardless of key. */
  invalidate(): void;
  /** Drop the bitmap (releases the GPU texture). */
  destroy(): void;
}

export function createBackgroundCache(): BackgroundCache {
  // `OffscreenCanvas` is widely supported (~99% of browsers) but we
  // must survive its absence gracefully — e.g. inside the unit test
  // environment, very old browsers, or workers without the flag.
  const hasOffscreen =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas === 'function';

  let canvas: OffscreenCanvas | null = null;
  let lastKey: BackgroundCacheKey | null = null;

  function rebuild(
    key: BackgroundCacheKey,
    background: Background,
    grid: GridConfig,
    getImage: ImageProvider,
  ): OffscreenCanvas | null {
    const worldW = Math.max(1, grid.cols * grid.cellSize);
    const worldH = Math.max(1, grid.rows * grid.cellSize);
    if (worldW > MAX_CACHE_EDGE_PX || worldH > MAX_CACHE_EDGE_PX) return null;
    // Reallocate only when dimensions change — keeps the GPU texture
    // warm across theme / image-transform tweaks.
    if (!canvas || canvas.width !== worldW || canvas.height !== worldH) {
      canvas = new OffscreenCanvas(worldW, worldH);
    }
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return null;
    // `OffscreenCanvasRenderingContext2D` and `CanvasRenderingContext2D`
    // share the subset of operations `drawBackground` uses; narrow-cast
    // so we don't need to widen every layer's type signature.
    const ctx = maybeCtx as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, worldW, worldH);
    drawBackground(ctx, background, grid, getImage, { theme: key.theme });
    return canvas;
  }

  return {
    getBitmap(state, prefs, getImage) {
      if (!hasOffscreen) return null;
      const imageLoaded = state.background.imageId !== null && getImage(state.background.imageId) !== null;
      const key = backgroundCacheKeyOf(state.background, state.grid, prefs.theme, imageLoaded);
      if (canvas && lastKey && cacheKeyEquals(key, lastKey)) {
        return canvas;
      }
      const next = rebuild(key, state.background, state.grid, getImage);
      if (next) lastKey = key;
      return next;
    },
    invalidate() {
      lastKey = null;
    },
    destroy() {
      lastKey = null;
      canvas = null;
    },
  };
}
