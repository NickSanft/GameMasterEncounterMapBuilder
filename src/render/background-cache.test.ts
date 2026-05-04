import { describe, it, expect, vi } from 'vitest';
import {
  backgroundCacheKeyOf,
  cacheKeyEquals,
  createBackgroundCache,
  MAX_CACHE_EDGE_PX,
} from './background-cache.js';
import { createDefaultState } from '../state/types.js';

const BASE_BG = {
  imageId: null as string | null,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

const GRID_30x20 = { cols: 30, rows: 20, cellSize: 50, showGridLines: true };

describe('backgroundCacheKeyOf', () => {
  it('copies every field the cache actually depends on', () => {
    const key = backgroundCacheKeyOf(
      { imageId: 'img-1', offsetX: 10, offsetY: 20, scaleX: 1.5, scaleY: 2 },
      GRID_30x20,
      'dark',
      true,
    );
    expect(key).toEqual({
      gridCols: 30,
      gridRows: 20,
      cellSize: 50,
      theme: 'dark',
      bgImageId: 'img-1',
      bgImageLoaded: true,
      bgOffsetX: 10,
      bgOffsetY: 20,
      bgScaleX: 1.5,
      bgScaleY: 2,
      // Phase 140 — orientation fields default to 0 / false / false
      // when the input Background object doesn't carry them (matches
      // the optional-field semantics in `state/types.ts`).
      bgRotation: 0,
      bgFlipX: false,
      bgFlipY: false,
    });
  });

  it('Phase 140 — copies rotation + flipX + flipY when present', () => {
    const key = backgroundCacheKeyOf(
      {
        imageId: 'img-2',
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: Math.PI / 2,
        flipX: true,
        flipY: false,
      },
      GRID_30x20,
      'dark',
      true,
    );
    expect(key.bgRotation).toBeCloseTo(Math.PI / 2, 6);
    expect(key.bgFlipX).toBe(true);
    expect(key.bgFlipY).toBe(false);
  });

  it('treats a null imageId + loaded=false as "no image yet"', () => {
    const key = backgroundCacheKeyOf(BASE_BG, GRID_30x20, 'light', false);
    expect(key.bgImageId).toBeNull();
    expect(key.bgImageLoaded).toBe(false);
  });
});

describe('cacheKeyEquals', () => {
  const baseKey = backgroundCacheKeyOf(BASE_BG, GRID_30x20, 'dark', false);

  it('returns true for identical keys', () => {
    const other = backgroundCacheKeyOf(BASE_BG, GRID_30x20, 'dark', false);
    expect(cacheKeyEquals(baseKey, other)).toBe(true);
  });

  it.each([
    ['gridCols', backgroundCacheKeyOf(BASE_BG, { ...GRID_30x20, cols: 40 }, 'dark', false)],
    ['gridRows', backgroundCacheKeyOf(BASE_BG, { ...GRID_30x20, rows: 10 }, 'dark', false)],
    ['cellSize', backgroundCacheKeyOf(BASE_BG, { ...GRID_30x20, cellSize: 80 }, 'dark', false)],
    ['theme', backgroundCacheKeyOf(BASE_BG, GRID_30x20, 'light', false)],
    ['bgImageId', backgroundCacheKeyOf({ ...BASE_BG, imageId: 'img-2' }, GRID_30x20, 'dark', false)],
    ['bgImageLoaded', backgroundCacheKeyOf(BASE_BG, GRID_30x20, 'dark', true)],
    ['bgOffsetX', backgroundCacheKeyOf({ ...BASE_BG, offsetX: 5 }, GRID_30x20, 'dark', false)],
    ['bgOffsetY', backgroundCacheKeyOf({ ...BASE_BG, offsetY: 5 }, GRID_30x20, 'dark', false)],
    ['bgScaleX', backgroundCacheKeyOf({ ...BASE_BG, scaleX: 2 }, GRID_30x20, 'dark', false)],
    ['bgScaleY', backgroundCacheKeyOf({ ...BASE_BG, scaleY: 2 }, GRID_30x20, 'dark', false)],
  ])('returns false when %s changes', (_, changed) => {
    expect(cacheKeyEquals(baseKey, changed)).toBe(false);
  });
});

describe('createBackgroundCache', () => {
  it('returns null from getBitmap in an env without OffscreenCanvas', () => {
    // jsdom doesn't ship an OffscreenCanvas implementation, so this is
    // the live codepath unit tests actually exercise.
    expect(typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas).toBe(
      'undefined',
    );
    const cache = createBackgroundCache();
    const state = createDefaultState();
    expect(cache.getBitmap(state, { theme: 'dark' }, () => null)).toBeNull();
  });

  it('destroy() is safe to call on a freshly-made cache', () => {
    const cache = createBackgroundCache();
    expect(() => cache.destroy()).not.toThrow();
  });

  it('invalidate() is safe to call on a freshly-made cache', () => {
    const cache = createBackgroundCache();
    expect(() => cache.invalidate()).not.toThrow();
  });

  it('with a stubbed OffscreenCanvas, rebuilds once and reuses the bitmap on identical keys', () => {
    // Stand in a minimal OffscreenCanvas that tracks how many 2D contexts
    // were acquired — one context means one rebuild.
    const getContextCalls = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    class StubOffscreenCanvas {
      width: number;
      height: number;
      getContext: typeof getContextCalls;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.getContext = getContextCalls;
      }
    }
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = StubOffscreenCanvas;
    try {
      const cache = createBackgroundCache();
      const state = createDefaultState();
      const first = cache.getBitmap(state, { theme: 'dark' }, () => null);
      const second = cache.getBitmap(state, { theme: 'dark' }, () => null);
      expect(first).not.toBeNull();
      expect(second).toBe(first);
      expect(getContextCalls).toHaveBeenCalledTimes(1);
    } finally {
      delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    }
  });

  it('rebuilds when the theme changes (stubbed OffscreenCanvas)', () => {
    const getContextCalls = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    class StubOffscreenCanvas {
      width: number;
      height: number;
      getContext: typeof getContextCalls;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.getContext = getContextCalls;
      }
    }
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = StubOffscreenCanvas;
    try {
      const cache = createBackgroundCache();
      const state = createDefaultState();
      cache.getBitmap(state, { theme: 'dark' }, () => null);
      cache.getBitmap(state, { theme: 'light' }, () => null);
      // Same offscreen (dimensions unchanged) but the context was reused
      // to re-paint for the new theme — so we expect 2 context acquires
      // because rebuild() calls getContext fresh on each rebuild pass.
      expect(getContextCalls).toHaveBeenCalledTimes(2);
    } finally {
      delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    }
  });

  it('returns null when the world grid exceeds MAX_CACHE_EDGE_PX', () => {
    const getContextCalls = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    class StubOffscreenCanvas {
      width: number;
      height: number;
      getContext: typeof getContextCalls;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.getContext = getContextCalls;
      }
    }
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = StubOffscreenCanvas;
    try {
      const cache = createBackgroundCache();
      const state = createDefaultState();
      state.grid = { ...state.grid, cols: 200, cellSize: 50 }; // 10,000 > 4,096
      expect(cache.getBitmap(state, { theme: 'dark' }, () => null)).toBeNull();
      // No context acquired — we refused before touching the bitmap.
      expect(getContextCalls).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    }
  });

  it('invalidate() forces the next getBitmap to rebuild', () => {
    const getContextCalls = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    class StubOffscreenCanvas {
      width: number;
      height: number;
      getContext: typeof getContextCalls;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.getContext = getContextCalls;
      }
    }
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = StubOffscreenCanvas;
    try {
      const cache = createBackgroundCache();
      const state = createDefaultState();
      cache.getBitmap(state, { theme: 'dark' }, () => null);
      cache.invalidate();
      cache.getBitmap(state, { theme: 'dark' }, () => null);
      expect(getContextCalls).toHaveBeenCalledTimes(2);
    } finally {
      delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    }
  });
});

describe('MAX_CACHE_EDGE_PX', () => {
  it('is a sensible cap well under browser bitmap limits', () => {
    expect(MAX_CACHE_EDGE_PX).toBeGreaterThanOrEqual(2048);
    expect(MAX_CACHE_EDGE_PX).toBeLessThanOrEqual(8192);
  });
});
