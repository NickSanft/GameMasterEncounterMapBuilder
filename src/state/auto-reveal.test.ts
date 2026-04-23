import { describe, it, expect } from 'vitest';
import { cellsToReveal } from './auto-reveal.js';
import type { LosPoint } from './los.js';

const GRID = { cols: 4, rows: 1, cellSize: 10 };

/** Polygon spanning x=[a,b], y=[-1,11] — covers all cells whose centers
 *  fall in the x-range. Centers are at x = 5, 15, 25, 35. */
function xBandPoly(a: number, b: number): LosPoint[] {
  return [
    { x: a, y: -1 },
    { x: b, y: -1 },
    { x: b, y: 11 },
    { x: a, y: 11 },
  ];
}

describe('cellsToReveal', () => {
  it('returns no cells when polygons is null', () => {
    const fog = new Uint8Array([0, 0, 0, 0]);
    expect(cellsToReveal(null, fog, GRID)).toEqual([]);
  });

  it('returns no cells when polygons is empty', () => {
    const fog = new Uint8Array([0, 0, 0, 0]);
    expect(cellsToReveal([], fog, GRID)).toEqual([]);
  });

  it('returns no cells when fog already covers every polygon-revealed cell', () => {
    // Polygon covers cells 1 + 2; both already revealed.
    const fog = new Uint8Array([0, 1, 1, 0]);
    const poly = xBandPoly(11, 29);
    expect(cellsToReveal([poly], fog, GRID)).toEqual([]);
  });

  it('emits fog-set cells for unrevealed cells inside the polygon', () => {
    // Polygon covers cells 1 + 2; both currently hidden.
    const fog = new Uint8Array([0, 0, 0, 0]);
    const poly = xBandPoly(11, 29);
    const out = cellsToReveal([poly], fog, GRID);
    expect(out).toEqual([
      { x: 1, y: 0, value: 1 },
      { x: 2, y: 0, value: 1 },
    ]);
  });

  it('skips already-revealed cells inside the polygon (one-way)', () => {
    // Polygon covers cells 0..3; cell 1 already revealed.
    const fog = new Uint8Array([0, 1, 0, 0]);
    const poly = xBandPoly(-1, 41);
    const out = cellsToReveal([poly], fog, GRID);
    // Only the still-hidden cells (0, 2, 3) should be flipped.
    expect(out).toEqual([
      { x: 0, y: 0, value: 1 },
      { x: 2, y: 0, value: 1 },
      { x: 3, y: 0, value: 1 },
    ]);
  });

  it('unions multiple polygons before diffing against fog', () => {
    // Two non-overlapping polygons: one covers cell 0, the other cell 3.
    const fog = new Uint8Array([0, 0, 0, 0]);
    const polyA = xBandPoly(-1, 9);
    const polyB = xBandPoly(31, 41);
    const out = cellsToReveal([polyA, polyB], fog, GRID);
    expect(out).toEqual([
      { x: 0, y: 0, value: 1 },
      { x: 3, y: 0, value: 1 },
    ]);
  });

  it('maps cell index to (x, y) on a multi-row grid', () => {
    // 3-col x 2-row grid; polygon covers the bottom-right cell (col 2, row 1).
    const grid = { cols: 3, rows: 2, cellSize: 10 };
    const fog = new Uint8Array(6); // all zeros
    const poly: LosPoint[] = [
      { x: 19, y: 11 },
      { x: 31, y: 11 },
      { x: 31, y: 21 },
      { x: 19, y: 21 },
    ];
    const out = cellsToReveal([poly], fog, grid);
    expect(out).toEqual([{ x: 2, y: 1, value: 1 }]);
  });

  it('returns no cells for a degenerate polygon (< 3 points)', () => {
    const fog = new Uint8Array([0, 0, 0, 0]);
    const degenerate: LosPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(cellsToReveal([degenerate], fog, GRID)).toEqual([]);
  });

  it('returns no cells when the fog buffer length disagrees with the grid', () => {
    // Defensive against mismatched callers — refuse to emit possibly-bad indices.
    const fog = new Uint8Array(2); // wrong size for 4×1
    const poly = xBandPoly(-1, 41);
    expect(cellsToReveal([poly], fog, GRID)).toEqual([]);
  });
});
