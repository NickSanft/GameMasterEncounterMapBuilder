/**
 * Phase 124 — hex-geometry tests.
 */
import { describe, it, expect } from 'vitest';
import {
  hexWidth,
  hexHeight,
  hexHorizontalStride,
  hexVerticalStride,
  hexCenter,
  hexVertices,
  hexDistance,
  offsetToAxial,
  worldToHexCell,
} from './hex-geometry.js';

describe('hex dimensions', () => {
  it('width = sqrt(3) × size', () => {
    expect(hexWidth(1)).toBeCloseTo(Math.sqrt(3), 6);
    expect(hexWidth(50)).toBeCloseTo(50 * Math.sqrt(3), 6);
  });

  it('height = 2 × size', () => {
    expect(hexHeight(1)).toBe(2);
    expect(hexHeight(50)).toBe(100);
  });

  it('horizontal stride equals width', () => {
    expect(hexHorizontalStride(50)).toBeCloseTo(hexWidth(50), 6);
  });

  it('vertical stride is 3/4 × height', () => {
    expect(hexVerticalStride(1)).toBeCloseTo(1.5, 6);
    expect(hexVerticalStride(50)).toBeCloseTo(75, 6);
  });
});

describe('hexCenter', () => {
  it('positions (0,0) at half-width / size offset from origin', () => {
    const c = hexCenter(0, 0, 50);
    expect(c.x).toBeCloseTo(hexWidth(50) / 2, 6);
    expect(c.y).toBeCloseTo(50, 6);
  });

  it('odd rows shift right by half a hex width', () => {
    const evenRow = hexCenter(2, 0, 50);
    const oddRow = hexCenter(2, 1, 50);
    expect(oddRow.x - evenRow.x).toBeCloseTo(hexWidth(50) / 2, 6);
  });

  it('row stride is the vertical stride', () => {
    const r0 = hexCenter(0, 0, 50);
    const r2 = hexCenter(0, 2, 50);
    expect(r2.y - r0.y).toBeCloseTo(2 * hexVerticalStride(50), 6);
  });
});

describe('hexVertices', () => {
  it('returns 6 vertices', () => {
    const v = hexVertices(0, 0, 50);
    expect(v).toHaveLength(6);
  });

  it('top vertex (index 0) is directly above the center', () => {
    const v = hexVertices(100, 200, 50);
    expect(v[0]!.x).toBeCloseTo(100, 6);
    expect(v[0]!.y).toBeCloseTo(200 - 50, 6);
  });

  it('vertices are size away from the center', () => {
    const cx = 200;
    const cy = 300;
    const size = 40;
    for (const vertex of hexVertices(cx, cy, size)) {
      const dx = vertex.x - cx;
      const dy = vertex.y - cy;
      expect(Math.hypot(dx, dy)).toBeCloseTo(size, 4);
    }
  });
});

describe('offsetToAxial', () => {
  it('preserves origin', () => {
    expect(offsetToAxial(0, 0)).toEqual({ q: 0, r: 0 });
  });

  it('row 0 (even) — q matches col directly', () => {
    expect(offsetToAxial(3, 0)).toEqual({ q: 3, r: 0 });
  });

  it('row 1 (odd) — q shifts by -0', () => {
    // For odd-r layout, row 1 (odd, row & 1 = 1): q = col - (1 - 1)/2 = col
    expect(offsetToAxial(3, 1)).toEqual({ q: 3, r: 1 });
  });

  it('row 2 (even, > 0) — q shifts by -1', () => {
    expect(offsetToAxial(3, 2)).toEqual({ q: 2, r: 2 });
  });
});

describe('hexDistance', () => {
  it('zero distance to self', () => {
    expect(hexDistance(5, 5, 5, 5)).toBe(0);
  });

  it('distance 1 to any of the 6 horizontal neighbors (even row)', () => {
    // From (3, 2): the 6 neighbors of an even-row pointy-top hex are
    // (2, 2), (4, 2), (2, 1), (3, 1), (2, 3), (3, 3).
    expect(hexDistance(3, 2, 2, 2)).toBe(1);
    expect(hexDistance(3, 2, 4, 2)).toBe(1);
    expect(hexDistance(3, 2, 2, 1)).toBe(1);
    expect(hexDistance(3, 2, 3, 1)).toBe(1);
    expect(hexDistance(3, 2, 2, 3)).toBe(1);
    expect(hexDistance(3, 2, 3, 3)).toBe(1);
  });

  it('symmetric — d(a,b) = d(b,a)', () => {
    expect(hexDistance(0, 0, 5, 7)).toBe(hexDistance(5, 7, 0, 0));
  });

  it('returns integer for integer inputs', () => {
    const d = hexDistance(0, 0, 4, 5);
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });

  it('moving 4 horizontal hexes = distance 4', () => {
    expect(hexDistance(0, 0, 4, 0)).toBe(4);
  });
});

describe('worldToHexCell', () => {
  it('center of hex(0,0) maps to (0,0)', () => {
    const c = hexCenter(0, 0, 50);
    expect(worldToHexCell(c.x, c.y, 50)).toEqual({ col: 0, row: 0 });
  });

  it('center of hex(3, 4) maps to (3, 4)', () => {
    const c = hexCenter(3, 4, 50);
    expect(worldToHexCell(c.x, c.y, 50)).toEqual({ col: 3, row: 4 });
  });

  it('center of hex(1, 1) (odd row) maps to (1, 1)', () => {
    const c = hexCenter(1, 1, 50);
    expect(worldToHexCell(c.x, c.y, 50)).toEqual({ col: 1, row: 1 });
  });

  it('point inside hex(2, 0) (offset slightly off-center) still maps to (2, 0)', () => {
    const c = hexCenter(2, 0, 50);
    expect(worldToHexCell(c.x + 5, c.y - 5, 50)).toEqual({
      col: 2,
      row: 0,
    });
  });
});
