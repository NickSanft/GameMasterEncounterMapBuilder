import { describe, it, expect } from 'vitest';
import {
  createWall,
  createWallBlock,
  isBlockWall,
  isSegmentWall,
  isDoor,
  wallBlocksSightEffective,
  wallBlocksMovementEffective,
  blockWallBounds,
  wallToSegments,
  distanceSquaredToSegment,
  hitTestWalls,
  hitTestWallEndpoint,
  hitTestBlockCorner,
  applyBlockCornerDrag,
  clampThickness,
  wallLength,
  WALL_HIT_TOLERANCE_PX,
  WALL_DEFAULT_THICKNESS_PX,
  WALL_MIN_THICKNESS_PX,
  WALL_MAX_THICKNESS_PX,
} from './walls.js';
import type { Wall } from './types.js';

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
    expect(hitTestWalls(walls, 200, 200, 50)).toBeNull();
  });

  it('returns the wall within tolerance', () => {
    const hit = hitTestWalls(walls, 50, 2, 50);
    expect(hit?.id).toBe(walls[0]!.id);
  });

  it('returns the most-recently-drawn wall when two overlap', () => {
    // Put two segments on top of each other; the last one in the array
    // (most recently drawn) should win.
    const overlapping = [
      createWall({ x1: 0, y1: 0, x2: 100, y2: 0 }),
      createWall({ x1: 0, y1: 0, x2: 100, y2: 0 }),
    ];
    const hit = hitTestWalls(overlapping, 50, 0, 50);
    expect(hit?.id).toBe(overlapping[1]!.id);
  });

  it('respects the tolerance parameter', () => {
    // 10 px away from the y=0 wall. Default tolerance (6) misses.
    expect(hitTestWalls(walls, 50, 10, 50)).toBeNull();
    // Larger tolerance catches it.
    expect(hitTestWalls(walls, 50, 10, 50, 12)?.id).toBe(walls[0]!.id);
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

describe('createWall — Phase 85 (thickness + visibility)', () => {
  it('omits thickness + visibility from the result by default (back-compat shape)', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    expect(w.thickness).toBeUndefined();
    expect(w.visibility).toBeUndefined();
  });

  it('passes through an explicit thickness', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 1, y2: 1, thickness: 5 });
    expect(w.thickness).toBe(5);
  });

  it('passes through an explicit visibility', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 1, y2: 1, visibility: 'gm' });
    expect(w.visibility).toBe('gm');
  });
});

describe('clampThickness', () => {
  it('returns the default for non-numeric input', () => {
    expect(clampThickness('foo')).toBe(WALL_DEFAULT_THICKNESS_PX);
    expect(clampThickness(null)).toBe(WALL_DEFAULT_THICKNESS_PX);
    expect(clampThickness(undefined)).toBe(WALL_DEFAULT_THICKNESS_PX);
    expect(clampThickness(NaN)).toBe(WALL_DEFAULT_THICKNESS_PX);
    expect(clampThickness(Infinity)).toBe(WALL_DEFAULT_THICKNESS_PX);
  });

  it('clamps to [MIN, MAX]', () => {
    expect(clampThickness(0)).toBe(WALL_MIN_THICKNESS_PX);
    expect(clampThickness(-5)).toBe(WALL_MIN_THICKNESS_PX);
    expect(clampThickness(1000)).toBe(WALL_MAX_THICKNESS_PX);
  });

  it('passes through values inside the range unchanged', () => {
    expect(clampThickness(3)).toBe(3);
    expect(clampThickness(WALL_MIN_THICKNESS_PX)).toBe(WALL_MIN_THICKNESS_PX);
    expect(clampThickness(WALL_MAX_THICKNESS_PX)).toBe(WALL_MAX_THICKNESS_PX);
  });
});

describe('hitTestWallEndpoint', () => {
  const wall = createWall({ x1: 0, y1: 0, x2: 100, y2: 0 });
  const otherWall = createWall({ x1: 50, y1: 50, x2: 150, y2: 50 });
  const walls = [wall, otherWall];
  const selected = new Set([wall.id]);

  it('returns null when no walls are selected', () => {
    expect(hitTestWallEndpoint(walls, new Set(), 0, 0, 8)).toBeNull();
  });

  it('returns null when the cursor is far from any selected endpoint', () => {
    expect(hitTestWallEndpoint(walls, selected, 50, 50, 8)).toBeNull();
  });

  it('returns endpoint 1 when the cursor is near the start', () => {
    const hit = hitTestWallEndpoint(walls, selected, 2, 1, 8);
    expect(hit?.endpoint).toBe(1);
    expect(hit?.wall.id).toBe(wall.id);
  });

  it('returns endpoint 2 when the cursor is near the end', () => {
    const hit = hitTestWallEndpoint(walls, selected, 98, 0, 8);
    expect(hit?.endpoint).toBe(2);
  });

  it('skips walls that are not in the selection set', () => {
    // Cursor right on otherWall's endpoint, but otherWall isn't selected.
    expect(hitTestWallEndpoint(walls, selected, 50, 50, 8)).toBeNull();
  });

  it('respects the tolerance parameter', () => {
    expect(hitTestWallEndpoint(walls, selected, 0, 5, 4)).toBeNull(); // 5 > 4
    expect(hitTestWallEndpoint(walls, selected, 0, 3, 4)?.endpoint).toBe(1); // 3 ≤ 4
  });

  it('picks the closer endpoint when both are within tolerance (degenerate short wall)', () => {
    const tiny = createWall({ x1: 0, y1: 0, x2: 4, y2: 0 });
    const hit = hitTestWallEndpoint([tiny], new Set([tiny.id]), 1, 0, 10);
    expect(hit?.endpoint).toBe(1); // closer to (0,0) than to (4,0)
  });

  it('Phase 112 — block walls have no endpoints (skipped in endpoint hit-test)', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 2, cellsTall: 2 });
    const seg = createWall({ x1: 0, y1: 0, x2: 10, y2: 0 });
    const selected = new Set([block.id, seg.id]);
    // Click right on the block's "corner" (0, 0) — should resolve to
    // the segment's endpoint, NOT the block (blocks don't expose
    // endpoint handles in Phase 112).
    const hit = hitTestWallEndpoint([block, seg], selected, 0, 0, 4);
    expect(hit?.wall.id).toBe(seg.id);
  });
});

describe('Phase 112 — createWallBlock', () => {
  it('defaults blocksSight + blocksMovement to true', () => {
    const w = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 });
    expect(w.kind).toBe('block');
    expect(w.blocksSight).toBe(true);
    expect(w.blocksMovement).toBe(true);
  });

  it('floors fractional cell coords + clamps cellsWide/Tall to ≥ 1', () => {
    const w = createWallBlock({
      cellX: 3.7,
      cellY: -2,
      cellsWide: 0,
      cellsTall: -5,
    });
    expect(w.cellX).toBe(3);
    expect(w.cellY).toBe(0); // clamped to ≥ 0
    expect(w.cellsWide).toBe(1);
    expect(w.cellsTall).toBe(1);
  });

  it('threads visibility when supplied', () => {
    const w = createWallBlock({
      cellX: 0,
      cellY: 0,
      cellsWide: 1,
      cellsTall: 1,
      visibility: 'gm',
    });
    expect(w.visibility).toBe('gm');
  });
});

describe('Phase 112 — discriminator predicates', () => {
  it('isBlockWall narrows to WallBlock', () => {
    const seg = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 });
    expect(isBlockWall(seg)).toBe(false);
    expect(isBlockWall(block)).toBe(true);
  });

  it('isSegmentWall narrows to WallSegment', () => {
    const seg = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 });
    expect(isSegmentWall(seg)).toBe(true);
    expect(isSegmentWall(block)).toBe(false);
  });
});

describe('Phase 112 — wallToSegments', () => {
  it('segment wall returns [self]', () => {
    const seg = createWall({ x1: 1, y1: 2, x2: 3, y2: 4 });
    expect(wallToSegments(seg, 50)).toEqual([{ x1: 1, y1: 2, x2: 3, y2: 4 }]);
  });

  it('block wall returns 4 perimeter edges', () => {
    const block = createWallBlock({ cellX: 1, cellY: 2, cellsWide: 3, cellsTall: 1 });
    const segments = wallToSegments(block, 10);
    // Block covers world rect x:[10..40], y:[20..30].
    expect(segments).toEqual([
      { x1: 10, y1: 20, x2: 40, y2: 20 }, // top
      { x1: 40, y1: 20, x2: 40, y2: 30 }, // right
      { x1: 10, y1: 30, x2: 40, y2: 30 }, // bottom
      { x1: 10, y1: 20, x2: 10, y2: 30 }, // left
    ]);
  });
});

describe('Phase 112 — blockWallBounds', () => {
  it('returns the AABB in world pixels', () => {
    const block = createWallBlock({ cellX: 2, cellY: 3, cellsWide: 4, cellsTall: 5 });
    expect(blockWallBounds(block, 10)).toEqual({ x: 20, y: 30, w: 40, h: 50 });
  });
});

describe('Phase 113 — door helpers', () => {
  it('isDoor returns false for plain segments + block walls', () => {
    const seg = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 });
    expect(isDoor(seg)).toBe(false);
    expect(isDoor(block)).toBe(false);
  });

  it('isDoor returns true for a segment with a door field', () => {
    const door: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0 }),
      door: { open: false },
    };
    expect(isDoor(door)).toBe(true);
  });

  it('wallBlocksSightEffective: closed door blocks; open door does not', () => {
    const closed: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0 }),
      door: { open: false },
    };
    const open: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0 }),
      door: { open: true },
    };
    expect(wallBlocksSightEffective(closed)).toBe(true);
    expect(wallBlocksSightEffective(open)).toBe(false);
  });

  it('wallBlocksSightEffective: respects underlying blocksSight=false even for closed doors', () => {
    // A non-sight-blocking door (e.g. arrow slit) doesn't block LoS
    // when closed either — the door wraps the flag, doesn't override it.
    const w: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0, blocksSight: false }),
      door: { open: false },
    };
    expect(wallBlocksSightEffective(w)).toBe(false);
  });

  it('wallBlocksSightEffective: non-door segment walls fall through to blocksSight', () => {
    const blocking = createWall({ x1: 0, y1: 0, x2: 1, y2: 1 });
    const transparent = createWall({
      x1: 0, y1: 0, x2: 1, y2: 1, blocksSight: false,
    });
    expect(wallBlocksSightEffective(blocking)).toBe(true);
    expect(wallBlocksSightEffective(transparent)).toBe(false);
  });

  it('wallBlocksMovementEffective: same shape as sight (open door = false)', () => {
    const open: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0 }),
      door: { open: true },
    };
    const closed: Wall = {
      ...createWall({ x1: 0, y1: 0, x2: 10, y2: 0 }),
      door: { open: false },
    };
    expect(wallBlocksMovementEffective(open)).toBe(false);
    expect(wallBlocksMovementEffective(closed)).toBe(true);
  });

  it('block walls cannot be doors (isDoor stays false)', () => {
    // Type system already forbids `door` on WallBlock; the runtime
    // helper also checks kind explicitly so a malformed peer that
    // sneaks `door` onto a block via the wire format is ignored.
    const bogus = {
      ...createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 }),
      door: { open: true },
    } as Wall;
    expect(isDoor(bogus)).toBe(false);
    expect(wallBlocksSightEffective(bogus)).toBe(true);
  });
});

describe('Phase 112 — hitTestWalls block path', () => {
  const cellSize = 50;
  it('point inside the block AABB hits', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 2, cellsTall: 2 });
    expect(hitTestWalls([block], 75, 75, cellSize)?.id).toBe(block.id);
  });

  it('point outside the block AABB does NOT hit (no tolerance band)', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 1, cellsTall: 1 });
    // Block covers (50..100, 50..100). 49 is outside; segments
    // would forgive a 6-px slop but blocks should be exact.
    expect(hitTestWalls([block], 49, 75, cellSize)).toBeNull();
  });

  it('most-recently-drawn wins when a segment + block overlap', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 1, cellsTall: 1 });
    const seg = createWall({ x1: 0, y1: 25, x2: 50, y2: 25 });
    // Segment was drawn AFTER the block → should win on overlap.
    expect(hitTestWalls([block, seg], 25, 25, cellSize)?.id).toBe(seg.id);
  });
});

describe('Phase 116 — hitTestBlockCorner', () => {
  const cellSize = 50;

  it('returns null when no walls are selected', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 2, cellsTall: 2 });
    expect(hitTestBlockCorner([block], new Set(), 0, 0, cellSize, 12)).toBeNull();
  });

  it('returns null for selected segment walls (segments have no corners)', () => {
    const seg = createWall({ x1: 0, y1: 0, x2: 100, y2: 100 });
    expect(
      hitTestBlockCorner([seg], new Set([seg.id]), 0, 0, cellSize, 12),
    ).toBeNull();
  });

  it('hits the TL corner', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 2, cellsTall: 2 });
    // Block: cells (1,1)..(2,2). TL world position is (50, 50).
    const hit = hitTestBlockCorner([block], new Set([block.id]), 50, 50, cellSize, 12);
    expect(hit).not.toBeNull();
    expect(hit!.corner).toBe('tl');
  });

  it('hits the BR corner', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 2, cellsTall: 2 });
    // BR world position = (cellX + cellsWide) * cellSize = 150.
    const hit = hitTestBlockCorner([block], new Set([block.id]), 150, 150, cellSize, 12);
    expect(hit).not.toBeNull();
    expect(hit!.corner).toBe('br');
  });

  it('returns null when point is outside the tolerance band', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 2, cellsTall: 2 });
    // 100 px away from any corner.
    expect(
      hitTestBlockCorner([block], new Set([block.id]), 200, 200, cellSize, 12),
    ).toBeNull();
  });

  it('respects selectedIds (unselected blocks ignored)', () => {
    const a = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 1, cellsTall: 1 });
    const b = createWallBlock({ cellX: 5, cellY: 5, cellsWide: 1, cellsTall: 1 });
    // Click on `a`'s TL corner but only `b` is selected.
    expect(
      hitTestBlockCorner([a, b], new Set([b.id]), 50, 50, cellSize, 12),
    ).toBeNull();
  });
});

describe('Phase 116 — applyBlockCornerDrag', () => {
  const cellSize = 50;

  it('TL drag: move TL down-right while BR stays pinned', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 4, cellsTall: 4 });
    // Drag TL toward (cell 2, cell 2) — world (100, 100). Snaps to edge.
    const next = applyBlockCornerDrag(block, 'tl', 100, 100, cellSize);
    expect(next).toEqual({ cellX: 2, cellY: 2, cellsWide: 2, cellsTall: 2 });
  });

  it('BR drag: move BR up-left while TL stays pinned', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 4, cellsTall: 4 });
    const next = applyBlockCornerDrag(block, 'br', 100, 100, cellSize);
    expect(next).toEqual({ cellX: 0, cellY: 0, cellsWide: 2, cellsTall: 2 });
  });

  it('TR drag: independent x + y axes (top changes; right changes)', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 3, cellsTall: 3 });
    // Block edges: left=1 right=4 top=1 bottom=4. Drag TR to world (300, 100):
    // dragEdgeX = 300/50 = 6, dragEdgeY = 100/50 = 2.
    const next = applyBlockCornerDrag(block, 'tr', 300, 100, cellSize);
    expect(next).toEqual({ cellX: 1, cellY: 2, cellsWide: 5, cellsTall: 2 });
  });

  it('BL drag: left + bottom both move', () => {
    const block = createWallBlock({ cellX: 1, cellY: 1, cellsWide: 3, cellsTall: 3 });
    // Drag BL to (0, 250): dragEdgeX = 0, dragEdgeY = 5.
    const next = applyBlockCornerDrag(block, 'bl', 0, 250, cellSize);
    expect(next).toEqual({ cellX: 0, cellY: 1, cellsWide: 4, cellsTall: 4 });
  });

  it('clamps to a 1×1 minimum (drag past the opposite corner)', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 4, cellsTall: 4 });
    // Drag BR way past the TL corner (negative world coords).
    const next = applyBlockCornerDrag(block, 'br', -200, -200, cellSize);
    expect(next.cellsWide).toBe(1);
    expect(next.cellsTall).toBe(1);
  });

  it('clamps cellX/cellY to ≥ 0 (drag TL into negative world space)', () => {
    const block = createWallBlock({ cellX: 2, cellY: 2, cellsWide: 4, cellsTall: 4 });
    // BR is at (6, 6). Drag TL to (-150, -150) → dragEdge negative,
    // clamped to (0, 0). New width = 6, height = 6.
    const next = applyBlockCornerDrag(block, 'tl', -150, -150, cellSize);
    expect(next).toEqual({ cellX: 0, cellY: 0, cellsWide: 6, cellsTall: 6 });
  });

  it('snaps drag positions between cells to the nearest edge', () => {
    const block = createWallBlock({ cellX: 0, cellY: 0, cellsWide: 4, cellsTall: 4 });
    // BR drag to world (130, 130) → dragEdgeX = round(130/50) = 3, dragEdgeY = 3.
    const next = applyBlockCornerDrag(block, 'br', 130, 130, cellSize);
    expect(next).toEqual({ cellX: 0, cellY: 0, cellsWide: 3, cellsTall: 3 });
  });
});
