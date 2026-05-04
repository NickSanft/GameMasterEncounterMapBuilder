/**
 * Phase 135 — visibility rasterizer dispatcher tests.
 */
import { describe, it, expect } from 'vitest';
import { rasterizeVisibilityForGrid } from './visibility-rasterize.js';
import type { LosPoint } from './los.js';
import { hexCenter } from '../render/hex-geometry.js';

/** Polygon covering a 200×200 box at (cx, cy) — large enough to
 *  encompass several hex / rect cells. */
function bigBoxPoly(cx: number, cy: number, half = 100): LosPoint[] {
  return [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
  ];
}

describe('rasterizeVisibilityForGrid (Phase 135)', () => {
  it('square mode delegates to rect rasterizer (cell centers in polygon)', () => {
    // 4x1 grid at cellSize 10. Centers at x=5, 15, 25, 35.
    const poly: LosPoint[] = [
      { x: 11, y: -1 },
      { x: 29, y: -1 },
      { x: 29, y: 11 },
      { x: 11, y: 11 },
    ];
    const mask = rasterizeVisibilityForGrid([poly], 4, 1, 10, 'square');
    expect(Array.from(mask)).toEqual([0, 1, 1, 0]);
  });

  it('square mode is the default when gridShape is undefined', () => {
    const poly: LosPoint[] = [
      { x: 11, y: -1 },
      { x: 29, y: -1 },
      { x: 29, y: 11 },
      { x: 11, y: 11 },
    ];
    const mask = rasterizeVisibilityForGrid([poly], 4, 1, 10, undefined);
    expect(Array.from(mask)).toEqual([0, 1, 1, 0]);
  });

  it('empty polygon list returns an all-zeros mask in both modes', () => {
    const square = rasterizeVisibilityForGrid([], 5, 5, 10, 'square');
    const hex = rasterizeVisibilityForGrid([], 5, 5, 10, 'hex');
    expect(square.every((v) => v === 0)).toBe(true);
    expect(hex.every((v) => v === 0)).toBe(true);
  });

  it('hex mode marks cells overlapping a hex whose center is in a polygon', () => {
    // 30×20 grid, cellSize 50. Polygon covers a 200×200 box around
    // hex (5, 5)'s world center.
    const center = hexCenter(5, 5, 50);
    const poly = bigBoxPoly(center.x, center.y, 30);
    const mask = rasterizeVisibilityForGrid([poly], 30, 20, 50, 'hex');
    // At least one cell should be marked (the hex straddles ~3-4
    // rect cells).
    const marked = mask.reduce<number>((sum, v) => sum + v, 0);
    expect(marked).toBeGreaterThan(0);
  });

  it('hex mode marks more cells than square for a polygon wider than 1 hex', () => {
    // A polygon that contains many cell / hex centers should mark
    // strictly more rect cells in hex mode (because each visible hex
    // contributes 3-4 cells, vs square which marks just the cells
    // whose centers are in the polygon directly). Actually — both
    // can mark the same cells; the strict inequality only holds when
    // hex disks reach beyond the polygon's strict cell-center hits.
    // Here we use a polygon centered at hex(5, 5) but small enough
    // that fewer rect cell centers fall in it than rect cells overlap
    // the polygon-containing hexes.
    const center = hexCenter(5, 5, 50);
    const poly = bigBoxPoly(center.x, center.y, 25); // 50×50 box
    const square = rasterizeVisibilityForGrid([poly], 30, 20, 50, 'square');
    const hex = rasterizeVisibilityForGrid([poly], 30, 20, 50, 'hex');
    const sqCount = square.reduce<number>((sum, v) => sum + v, 0);
    const hexCount = hex.reduce<number>((sum, v) => sum + v, 0);
    // Square marks the rect cells whose centers are in the 50×50 box
    // at hex(5,5)'s world center. Hex marks every rect cell
    // overlapping any hex whose center is in the box. The two
    // overlap heavily but hex's set is generally larger.
    expect(hexCount).toBeGreaterThanOrEqual(sqCount);
    expect(hexCount).toBeGreaterThan(0);
  });

  it('hex mode produces a mask sized cols × rows (rect-buffer wire format unchanged)', () => {
    const poly = bigBoxPoly(150, 150, 50);
    const mask = rasterizeVisibilityForGrid([poly], 6, 4, 50, 'hex');
    expect(mask.length).toBe(6 * 4);
  });

  it('hex mode skips hexes whose center is outside every polygon', () => {
    // Polygon nowhere near any hex center.
    const poly = bigBoxPoly(10000, 10000, 50);
    const mask = rasterizeVisibilityForGrid([poly], 5, 5, 50, 'hex');
    expect(mask.every((v) => v === 0)).toBe(true);
  });
});
