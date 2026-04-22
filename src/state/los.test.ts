import { describe, it, expect } from 'vitest';
import {
  computeVisibilityPolygon,
  filterWallsInRange,
  pointInPolygon,
  rasterizeVisibility,
  rayHitSegment,
  type LosPoint,
  type LosSegment,
} from './los.js';

const VIEWER = { x: 0, y: 0 };

/**
 * Euclidean distance helper — tests read more clearly with this than
 * with inlined `Math.hypot` everywhere.
 */
function dist(a: LosPoint, b: LosPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('rayHitSegment', () => {
  it('returns the distance when the ray crosses the segment', () => {
    // Ray from origin pointing +x; segment vertical at x = 10.
    const t = rayHitSegment(VIEWER, 1, 0, { x1: 10, y1: -5, x2: 10, y2: 5 });
    expect(t).toBeCloseTo(10, 6);
  });

  it('returns null when the ray points away from the segment', () => {
    const t = rayHitSegment(VIEWER, -1, 0, { x1: 10, y1: -5, x2: 10, y2: 5 });
    expect(t).toBeNull();
  });

  it('returns null when the ray misses the segment latitudinally', () => {
    // Segment from (10,-5) to (10,5); ray along +x but offset to y=20 misses.
    const t = rayHitSegment({ x: 0, y: 20 }, 1, 0, { x1: 10, y1: -5, x2: 10, y2: 5 });
    expect(t).toBeNull();
  });

  it('returns null for parallel rays (no unique intersection)', () => {
    const t = rayHitSegment(VIEWER, 1, 0, { x1: 5, y1: 0, x2: 15, y2: 0 });
    expect(t).toBeNull();
  });
});

describe('filterWallsInRange', () => {
  const walls: LosSegment[] = [
    { x1: 5, y1: 0, x2: 5, y2: 10 },      // near
    { x1: 500, y1: 0, x2: 500, y2: 10 },  // far
  ];
  it('keeps walls within range', () => {
    expect(filterWallsInRange(VIEWER, 50, walls)).toHaveLength(1);
  });
  it('drops walls completely outside range', () => {
    const out = filterWallsInRange(VIEWER, 50, walls);
    expect(out[0]!.x1).toBe(5);
  });
  it('is empty when radius is zero', () => {
    expect(filterWallsInRange(VIEWER, 0, walls)).toHaveLength(0);
  });
});

describe('computeVisibilityPolygon — open space (no walls)', () => {
  it('returns a many-point polygon approximating a circle', () => {
    const poly = computeVisibilityPolygon(VIEWER, 100, []);
    expect(poly.length).toBeGreaterThanOrEqual(24);
    // Every vertex should sit at (approximately) `radius` away.
    for (const p of poly) {
      expect(dist(p, VIEWER)).toBeCloseTo(100, 2);
    }
  });

  it('returns empty for zero or negative radius', () => {
    expect(computeVisibilityPolygon(VIEWER, 0, [])).toEqual([]);
    expect(computeVisibilityPolygon(VIEWER, -5, [])).toEqual([]);
  });
});

describe('computeVisibilityPolygon — with occluding walls', () => {
  it('shortens rays that hit a wall before reaching the radius', () => {
    // Single vertical wall at x=50 from y=-100 to y=100. Viewer at origin,
    // radius 200. Rays pointing +x should hit the wall at x=50.
    const walls: LosSegment[] = [{ x1: 50, y1: -100, x2: 50, y2: 100 }];
    const poly = computeVisibilityPolygon(VIEWER, 200, walls);
    // Find the vertex closest to the +x direction and assert it's ~on
    // the wall, not at the radius.
    let bestDotX = -Infinity;
    let pickedByDot: LosPoint | null = null;
    for (const p of poly) {
      const len = Math.hypot(p.x, p.y);
      if (len === 0) continue;
      const dot = p.x / len;
      if (dot > bestDotX) {
        bestDotX = dot;
        pickedByDot = p;
      }
    }
    expect(pickedByDot).not.toBeNull();
    expect(pickedByDot!.x).toBeCloseTo(50, 1);
  });

  it('a wall behind the viewer does not occlude anything in front', () => {
    const wallsBehind: LosSegment[] = [{ x1: -50, y1: -100, x2: -50, y2: 100 }];
    const poly = computeVisibilityPolygon(VIEWER, 100, wallsBehind);
    // Find the vertex at angle ~0 (directly in front). It should reach
    // the circular radius.
    const front = poly.reduce((best, p) =>
      p.x > best.x ? p : best,
    );
    expect(front.x).toBeCloseTo(100, 1);
  });
});

describe('pointInPolygon', () => {
  const square: LosPoint[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('is true inside', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
  });

  it('is false outside', () => {
    expect(pointInPolygon(-1, 5, square)).toBe(false);
    expect(pointInPolygon(11, 5, square)).toBe(false);
    expect(pointInPolygon(5, -1, square)).toBe(false);
    expect(pointInPolygon(5, 11, square)).toBe(false);
  });

  it('returns false for degenerate (<3-vertex) polygons', () => {
    expect(pointInPolygon(0, 0, [])).toBe(false);
    expect(pointInPolygon(0, 0, [{ x: 0, y: 0 }])).toBe(false);
    expect(pointInPolygon(0, 0, [{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(false);
  });
});

describe('rasterizeVisibility', () => {
  it('flips the expected cells for a 3×3 grid inside a big polygon', () => {
    // Big square polygon covers the whole 3×3 grid (each cell is 10 wide).
    const polys: LosPoint[][] = [[
      { x: -5, y: -5 },
      { x: 35, y: -5 },
      { x: 35, y: 35 },
      { x: -5, y: 35 },
    ]];
    const mask = rasterizeVisibility(polys, 3, 3, 10);
    expect(Array.from(mask)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('leaves cells outside the polygon at 0', () => {
    // Polygon covers only the bottom-right cell of a 3×3 grid.
    const polys: LosPoint[][] = [[
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
      { x: 20, y: 30 },
    ]];
    const mask = rasterizeVisibility(polys, 3, 3, 10);
    expect(Array.from(mask)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('unions multiple polygons (cell marked visible if any polygon covers it)', () => {
    // Polygons are padded slightly past the target cell's bounds so the
    // cell-center sample (at +0.5 offsets) isn't sitting on a polygon
    // edge — which would be even-odd-rule ambiguous.
    const polys: LosPoint[][] = [
      // Covers cell (0, 0) — center (5, 5).
      [
        { x: -2, y: -2 },
        { x: 9, y: -2 },
        { x: 9, y: 9 },
        { x: -2, y: 9 },
      ],
      // Covers cell (2, 2) — center (25, 25).
      [
        { x: 21, y: 21 },
        { x: 29, y: 21 },
        { x: 29, y: 29 },
        { x: 21, y: 29 },
      ],
    ];
    const mask = rasterizeVisibility(polys, 3, 3, 10);
    expect(mask[0]).toBe(1); // (0,0)
    expect(mask[8]).toBe(1); // (2,2)
    expect(mask[4]).toBe(0); // (1,1) — gap between them
  });

  it('returns an all-zero mask when no polygons are supplied', () => {
    const mask = rasterizeVisibility([], 3, 3, 10);
    expect(Array.from(mask)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
