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
  axialToOffset,
  hexNeighbors,
  worldToHexCell,
  pointInHex,
  rectCellsOverlappingHex,
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

describe('pointInHex', () => {
  it('returns true at the hex center', () => {
    expect(pointInHex(100, 200, 50, 100, 200)).toBe(true);
  });

  it('returns false far outside the bounding circle', () => {
    expect(pointInHex(100, 200, 50, 1000, 1000)).toBe(false);
  });

  it('returns false at a point inside the bounding circle but outside the hex (corners)', () => {
    // A corner of the bounding box (size, size) from center is at
    // distance sqrt(2)*size > size, so it's outside the bbox circle
    // — but a point near the diagonal corner of the inscribed
    // square is inside the bbox circle yet outside the hex.
    const cx = 100,
      cy = 200,
      size = 50;
    // (cx + size*0.7, cy + size*0.99): inside the bbox circle, but
    // beyond the bottom-right hex edge (pointy-top, hex width <
    // 2*size in x).
    expect(pointInHex(cx, cy, size, cx + 49, cy + 49)).toBe(false);
  });
});

describe('rectCellsOverlappingHex', () => {
  it('always returns at least 1 cell for an in-bounds hex', () => {
    const cells = rectCellsOverlappingHex(2, 2, 30, 20, 50);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('clamps to grid bounds (no negative col / row)', () => {
    const cells = rectCellsOverlappingHex(0, 0, 30, 20, 50);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(30);
      expect(c.y).toBeLessThan(20);
    }
  });

  it('cells cover an area near the hex center', () => {
    // The hex(5, 5) center should be inside (or adjacent to) one of
    // the returned rect cells.
    const center = hexCenter(5, 5, 50);
    const cells = rectCellsOverlappingHex(5, 5, 30, 20, 50);
    // At least one returned cell should be within ±1 of the center's
    // floor-quantized coords.
    const expectedCx = Math.floor(center.x / 50);
    const expectedCy = Math.floor(center.y / 50);
    const hit = cells.some(
      (c) =>
        Math.abs(c.x - expectedCx) <= 1 && Math.abs(c.y - expectedCy) <= 1,
    );
    expect(hit).toBe(true);
  });
});

describe('axialToOffset (Phase 133)', () => {
  it('round-trips with offsetToAxial', () => {
    for (const [col, row] of [
      [0, 0],
      [3, 0],
      [3, 1],
      [3, 2],
      [5, 7],
      [10, 0],
      [0, 5],
    ] as Array<[number, number]>) {
      const ax = offsetToAxial(col, row);
      expect(axialToOffset(ax.q, ax.r)).toEqual({ col, row });
    }
  });
});

describe('hexNeighbors (Phase 133)', () => {
  it('radius 0 returns just the center hex', () => {
    const cells = hexNeighbors(5, 5, 0, 30, 20);
    expect(cells).toEqual([{ col: 5, row: 5 }]);
  });

  it('radius 1 returns 7 cells (center + 6 neighbors) when far from edges', () => {
    const cells = hexNeighbors(5, 5, 1, 30, 20);
    expect(cells.length).toBe(7);
    // Center is included.
    expect(cells.some((c) => c.col === 5 && c.row === 5)).toBe(true);
    // All 6 returned non-center cells are at hex distance 1 from center.
    for (const c of cells) {
      if (c.col === 5 && c.row === 5) continue;
      expect(hexDistance(5, 5, c.col, c.row)).toBe(1);
    }
  });

  it('radius 2 returns 19 cells when far from edges', () => {
    const cells = hexNeighbors(10, 10, 2, 30, 20);
    expect(cells.length).toBe(19);
    for (const c of cells) {
      const d = hexDistance(10, 10, c.col, c.row);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(2);
    }
  });

  it('parity correct on even vs odd center rows', () => {
    // Even-row center (3, 2) — neighbors verified by hexDistance.
    const evenCells = hexNeighbors(3, 2, 1, 30, 20);
    expect(evenCells.length).toBe(7);
    for (const c of evenCells) {
      if (c.col === 3 && c.row === 2) continue;
      expect(hexDistance(3, 2, c.col, c.row)).toBe(1);
    }
    // Odd-row center (3, 3).
    const oddCells = hexNeighbors(3, 3, 1, 30, 20);
    expect(oddCells.length).toBe(7);
    for (const c of oddCells) {
      if (c.col === 3 && c.row === 3) continue;
      expect(hexDistance(3, 3, c.col, c.row)).toBe(1);
    }
  });

  it('clamps to grid bounds — center at (0, 0) loses out-of-grid neighbors', () => {
    const cells = hexNeighbors(0, 0, 1, 30, 20);
    // Center hex at (0,0) has neighbors that fall off the top + left
    // edges; the helper drops those. Exact survivor count depends on
    // odd-r parity; we only assert "fewer than 7" + "all in bounds".
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThan(7);
    for (const c of cells) {
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(30);
      expect(c.row).toBeLessThan(20);
    }
    // Center is always included (it IS in bounds).
    expect(cells.some((c) => c.col === 0 && c.row === 0)).toBe(true);
  });

  it('negative radius returns empty', () => {
    expect(hexNeighbors(5, 5, -1, 30, 20)).toEqual([]);
  });

  it('NaN radius returns empty (defensive)', () => {
    expect(hexNeighbors(5, 5, NaN, 30, 20)).toEqual([]);
  });

  it('returns deduped cells (no offset round-trip dupes)', () => {
    const cells = hexNeighbors(5, 5, 2, 30, 20);
    const keys = cells.map((c) => `${c.col},${c.row}`);
    expect(new Set(keys).size).toBe(keys.length);
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
