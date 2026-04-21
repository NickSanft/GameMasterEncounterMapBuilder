import { describe, it, expect } from 'vitest';
import {
  createWall,
  distanceSquaredToSegment,
  hitTestWalls,
  wallLength,
  WALL_HIT_TOLERANCE_PX,
} from './walls.js';

describe('createWall', () => {
  it('defaults blocksSight and blocksMovement to true', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 10, y2: 0 });
    expect(w.blocksSight).toBe(true);
    expect(w.blocksMovement).toBe(true);
  });

  it('assigns a fresh id on each call', () => {
    const a = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    const b = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    expect(a.id).not.toBe(b.id);
  });

  it('respects explicit blocks* overrides', () => {
    const w = createWall({
      x1: 0, y1: 0, x2: 1, y2: 1,
      blocksSight: false,
      blocksMovement: false,
    });
    expect(w.blocksSight).toBe(false);
    expect(w.blocksMovement).toBe(false);
  });
});

describe('distanceSquaredToSegment', () => {
  it('is zero for a point sitting on a horizontal segment', () => {
    expect(distanceSquaredToSegment(5, 0, 0, 0, 10, 0)).toBe(0);
  });

  it('equals the perpendicular-distance squared when the projection lands inside the segment', () => {
    // Segment (0,0)-(10,0); point (5, 3) → perpendicular distance 3 → squared 9.
    expect(distanceSquaredToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(9, 6);
  });

  it('clamps the projection to the endpoints (beyond end)', () => {
    // Segment (0,0)-(10,0); point (15, 0) → closest end is (10, 0), distance 5, squared 25.
    expect(distanceSquaredToSegment(15, 0, 0, 0, 10, 0)).toBeCloseTo(25, 6);
  });

  it('clamps the projection to the endpoints (before start)', () => {
    expect(distanceSquaredToSegment(-5, 4, 0, 0, 10, 0)).toBeCloseTo(41, 6);
  });

  it('handles a degenerate zero-length segment as a point', () => {
    expect(distanceSquaredToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(25, 6);
  });
});

describe('hitTestWalls', () => {
  const walls = [
    createWall({ x1: 0, y1: 0, x2: 100, y2: 0 }),   // horizontal along y=0
    createWall({ x1: 0, y1: 50, x2: 100, y2: 50 }), // horizontal along y=50
  ];

  it('returns null when the point is nowhere near any wall', () => {
    expect(hitTestWalls(walls, 200, 200)).toBeNull();
  });

  it('returns the wall within tolerance', () => {
    const hit = hitTestWalls(walls, 50, 2);
    expect(hit?.id).toBe(walls[0]!.id);
  });

  it('returns the most-recently-drawn wall when two overlap', () => {
    // Put two segments on top of each other; the last one in the array
    // (most recently drawn) should win.
    const overlapping = [
      createWall({ x1: 0, y1: 0, x2: 100, y2: 0 }),
      createWall({ x1: 0, y1: 0, x2: 100, y2: 0 }),
    ];
    const hit = hitTestWalls(overlapping, 50, 0);
    expect(hit?.id).toBe(overlapping[1]!.id);
  });

  it('respects the tolerance parameter', () => {
    // 10 px away from the y=0 wall. Default tolerance (6) misses.
    expect(hitTestWalls(walls, 50, 10)).toBeNull();
    // Larger tolerance catches it.
    expect(hitTestWalls(walls, 50, 10, 12)?.id).toBe(walls[0]!.id);
  });
});

describe('WALL_HIT_TOLERANCE_PX', () => {
  it('is big enough to forgive mouse-precision slop but not so big that walls smear into one another', () => {
    expect(WALL_HIT_TOLERANCE_PX).toBeGreaterThanOrEqual(3);
    expect(WALL_HIT_TOLERANCE_PX).toBeLessThanOrEqual(12);
  });
});

describe('wallLength', () => {
  it.each([
    [{ x1: 0, y1: 0, x2: 3, y2: 4 }, 5],
    [{ x1: 10, y1: 10, x2: 10, y2: 10 }, 0],
    [{ x1: 0, y1: 0, x2: 10, y2: 0 }, 10],
  ])('computes %o → %d', (seg, expected) => {
    expect(wallLength(seg)).toBeCloseTo(expected, 6);
  });
});
