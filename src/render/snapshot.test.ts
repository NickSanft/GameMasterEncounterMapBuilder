import { describe, it, expect } from 'vitest';
import { planSnapshot } from './snapshot.js';
import { createDefaultState, DEFAULT_CAMERA } from '../state/types.js';

describe('planSnapshot — whole-map scope', () => {
  it('sizes the canvas to cols*rows*cellSize and upscales by `scale`', () => {
    const state = createDefaultState();
    const { cols, rows, cellSize } = state.grid;
    const plan = planSnapshot({
      state,
      scope: 'whole-map',
      scale: 2,
      liveCamera: { ...DEFAULT_CAMERA },
      liveCssWidth: 800,
      liveCssHeight: 600,
    });
    expect(plan.pixelWidth).toBe(cols * cellSize * 2);
    expect(plan.pixelHeight).toBe(rows * cellSize * 2);
  });

  it('virtual camera is origin + scale zoom (ignores live camera)', () => {
    const state = createDefaultState();
    const plan = planSnapshot({
      state,
      scope: 'whole-map',
      scale: 4,
      liveCamera: { x: 999, y: -500, zoom: 3 },
      liveCssWidth: 1,
      liveCssHeight: 1,
    });
    expect(plan.camera).toEqual({ x: 0, y: 0, zoom: 4 });
  });

  it('throws when the grid has no cells', () => {
    const state = createDefaultState();
    state.grid = { ...state.grid, cols: 0 };
    expect(() =>
      planSnapshot({
        state,
        scope: 'whole-map',
        scale: 1,
        liveCamera: { ...DEFAULT_CAMERA },
        liveCssWidth: 100,
        liveCssHeight: 100,
      }),
    ).toThrow(/zero dimensions/);
  });
});

describe('planSnapshot — visible-area scope', () => {
  it('sizes the canvas to liveCss*scale, rounded', () => {
    const state = createDefaultState();
    const plan = planSnapshot({
      state,
      scope: 'visible-area',
      scale: 2,
      liveCamera: { x: 40, y: 20, zoom: 1.5 },
      liveCssWidth: 1024.4,
      liveCssHeight: 768.7,
    });
    expect(plan.pixelWidth).toBe(Math.round(1024.4 * 2));
    expect(plan.pixelHeight).toBe(Math.round(768.7 * 2));
  });

  it('virtual camera preserves live position and multiplies zoom by scale', () => {
    const state = createDefaultState();
    const plan = planSnapshot({
      state,
      scope: 'visible-area',
      scale: 4,
      liveCamera: { x: 40, y: 20, zoom: 1.5 },
      liveCssWidth: 800,
      liveCssHeight: 600,
    });
    expect(plan.camera).toEqual({ x: 40, y: 20, zoom: 1.5 * 4 });
  });

  it('throws on zero / non-finite live canvas size', () => {
    const state = createDefaultState();
    const base = {
      state,
      scope: 'visible-area' as const,
      scale: 1 as const,
      liveCamera: { ...DEFAULT_CAMERA },
    };
    expect(() =>
      planSnapshot({ ...base, liveCssWidth: 0, liveCssHeight: 100 }),
    ).toThrow(/zero size/);
    expect(() =>
      planSnapshot({ ...base, liveCssWidth: NaN, liveCssHeight: 100 }),
    ).toThrow(/no size/);
  });

  it('floors dimensions at 1 pixel even for tiny live sizes', () => {
    const state = createDefaultState();
    const plan = planSnapshot({
      state,
      scope: 'visible-area',
      scale: 1,
      liveCamera: { ...DEFAULT_CAMERA },
      liveCssWidth: 0.1,
      liveCssHeight: 0.1,
    });
    expect(plan.pixelWidth).toBeGreaterThanOrEqual(1);
    expect(plan.pixelHeight).toBeGreaterThanOrEqual(1);
  });
});
