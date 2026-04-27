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
