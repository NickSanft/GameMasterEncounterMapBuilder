/**
 * Phase 114 — clampMoveAgainstWalls tests.
 *
 * Pure helper. The fixture builds tiny worlds with one or two walls and
 * asserts the clamp result. Cell coordinates throughout — the helper
 * converts to world pixels internally.
 */
import { describe, it, expect } from 'vitest';
import {
  clampMoveAgainstWalls,
  bresenhamLine,
  segmentsIntersect,
} from './movement.js';
import type { Wall, WallSegment } from './types.js';

const cellSize = 50;

function segWall(
  id: string,
  x1: number, y1: number, x2: number, y2: number,
  blocksMovement = true,
): WallSegment {
  return {
    kind: 'segment',
    id,
    x1, y1, x2, y2,
    blocksSight: true,
    blocksMovement,
  };
}

describe('bresenhamLine', () => {
  it('walks a horizontal line cell-by-cell', () => {
    expect(bresenhamLine(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('walks a 45-degree line cell-by-cell', () => {
    expect(bresenhamLine(0, 0, 2, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('handles negative deltas', () => {
    expect(bresenhamLine(2, 2, 0, 0)).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]);
  });

  it('returns just the start cell when start === end', () => {
    expect(bresenhamLine(3, 3, 3, 3)).toEqual([{ x: 3, y: 3 }]);
  });
});

describe('segmentsIntersect', () => {
  it('returns true for crossing segments', () => {
    expect(segmentsIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
  });
  it('returns false for parallel non-overlapping segments', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5)).toBe(false);
  });
  it('returns true for touching endpoints', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 10, 0, 10, 10)).toBe(true);
  });
  it('returns false for clearly non-overlapping segments', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 20, 20, 30, 30)).toBe(false);
  });
});

describe('clampMoveAgainstWalls — passthrough cases', () => {
  it('no walls → end cell unchanged', () => {
    const r = clampMoveAgainstWalls(0, 0, 5, 5, [], cellSize);
    expect(r).toEqual({ cellX: 5, cellY: 5, blocked: false });
  });

  it('start === end → start cell unchanged', () => {
    const r = clampMoveAgainstWalls(3, 3, 3, 3, [], cellSize);
    expect(r).toEqual({ cellX: 3, cellY: 3, blocked: false });
  });

  it('walls with blocksMovement=false do NOT block', () => {
    // Wall directly between cells (1,0) and (2,0) — but flagged
    // movement-transparent. Should pass through.
    const walls = [segWall('w1', 100, 0, 100, cellSize, false)];
    const r = clampMoveAgainstWalls(0, 0, 5, 0, walls, cellSize);
    expect(r).toEqual({ cellX: 5, cellY: 0, blocked: false });
  });

  it('open doors do NOT block (Phase 113 integration)', () => {
    const door: Wall = {
      ...segWall('d1', 100, 0, 100, cellSize),
      door: { open: true },
    };
    const r = clampMoveAgainstWalls(0, 0, 5, 0, [door], cellSize);
    expect(r).toEqual({ cellX: 5, cellY: 0, blocked: false });
  });
});

describe('clampMoveAgainstWalls — blocking cases', () => {
  it('clamps at the cell before the wall', () => {
    // Vertical wall at world x=100 (between cells 1 and 2 horizontally).
    // Token wants to move from (0,0) → (5,0). Step 0→1 OK, step 1→2 hits.
    const walls = [segWall('w1', 100, -10, 100, cellSize + 10)];
    const r = clampMoveAgainstWalls(0, 0, 5, 0, walls, cellSize);
    expect(r).toEqual({ cellX: 1, cellY: 0, blocked: true });
  });

  it('clamps at start when the very first step is blocked', () => {
    // Wall right at cell-0-center (cells start at world 25,25 center).
    // Move from (0,0) → (1,0). The line crosses the wall at x=50.
    const walls = [segWall('w1', 50, -10, 50, 100)];
    const r = clampMoveAgainstWalls(0, 0, 1, 0, walls, cellSize);
    expect(r).toEqual({ cellX: 0, cellY: 0, blocked: true });
  });

  it('closed doors block (Phase 113 integration)', () => {
    const door: Wall = {
      ...segWall('d1', 100, -10, 100, cellSize + 10),
      door: { open: false },
    };
    const r = clampMoveAgainstWalls(0, 0, 5, 0, [door], cellSize);
    expect(r).toEqual({ cellX: 1, cellY: 0, blocked: true });
  });

  it('block walls block via their perimeter (Phase 112 integration)', () => {
    const block: Wall = {
      kind: 'block',
      id: 'b1',
      cellX: 2,
      cellY: 0,
      cellsWide: 1,
      cellsTall: 3,
      blocksSight: true,
      blocksMovement: true,
    };
    // Token at (0,0) tries to move to (5,0); hits the block's left
    // edge between cells 1 and 2.
    const r = clampMoveAgainstWalls(0, 0, 5, 0, [block], cellSize);
    expect(r).toEqual({ cellX: 1, cellY: 0, blocked: true });
  });

  it('a wall PARALLEL to the move does NOT block', () => {
    // Horizontal move along y=0 row; horizontal wall at y=cellSize
    // (between rows 0 and 1). Should NOT block — move stays in row 0.
    const walls = [segWall('w1', 0, cellSize, 1000, cellSize)];
    const r = clampMoveAgainstWalls(0, 0, 5, 0, walls, cellSize);
    expect(r).toEqual({ cellX: 5, cellY: 0, blocked: false });
  });

  it('diagonal move blocked by a wall on the diagonal', () => {
    // Token at (0,0) → (3,3). Wall at world (100,0)→(100,200) blocks
    // any step that crosses x=100. Bresenham steps to (1,1) → ok,
    // step (1,1) → (2,2) crosses x=100 at y=125 (in [0,200]).
    const walls = [segWall('w1', 100, 0, 100, 200)];
    const r = clampMoveAgainstWalls(0, 0, 3, 3, walls, cellSize);
    expect(r).toEqual({ cellX: 1, cellY: 1, blocked: true });
  });

  it('multiple walls — first crossing wins', () => {
    const walls = [
      segWall('w1', 100, -10, 100, 100), // closer
      segWall('w2', 200, -10, 200, 100), // farther
    ];
    const r = clampMoveAgainstWalls(0, 0, 10, 0, walls, cellSize);
    expect(r).toEqual({ cellX: 1, cellY: 0, blocked: true });
  });
});
