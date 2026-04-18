import { describe, it, expect } from 'vitest';
import { viewportFromCamera } from './viewport.js';

describe('viewportFromCamera', () => {
  it('maps canvas size to world rect at zoom 1', () => {
    const vp = viewportFromCamera({ x: 100, y: 200, zoom: 1 }, 800, 600);
    expect(vp).toEqual({ x: 100, y: 200, width: 800, height: 600 });
  });

  it('shrinks world span when zoomed in', () => {
    const vp = viewportFromCamera({ x: 0, y: 0, zoom: 2 }, 800, 600);
    // at 2x zoom, each world unit occupies 2 screen px, so 800 screen px = 400 world units
    expect(vp.width).toBe(400);
    expect(vp.height).toBe(300);
  });

  it('expands world span when zoomed out', () => {
    const vp = viewportFromCamera({ x: 0, y: 0, zoom: 0.5 }, 800, 600);
    expect(vp.width).toBe(1600);
    expect(vp.height).toBe(1200);
  });

  it('preserves camera origin as top-left', () => {
    const vp = viewportFromCamera({ x: -50, y: -75, zoom: 1.5 }, 900, 600);
    expect(vp.x).toBe(-50);
    expect(vp.y).toBe(-75);
    expect(vp.width).toBeCloseTo(600, 5);
    expect(vp.height).toBeCloseTo(400, 5);
  });

  it('falls back to zoom=1 when zoom is zero or negative', () => {
    const vp = viewportFromCamera({ x: 0, y: 0, zoom: 0 }, 800, 600);
    expect(vp.width).toBe(800);
    expect(vp.height).toBe(600);
  });
});
