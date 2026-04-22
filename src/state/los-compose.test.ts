import { describe, it, expect } from 'vitest';
import {
  collectSightWalls,
  collectViewers,
  spectatorEffectiveFog,
} from './los-compose.js';
import type { Token, Wall, SessionState } from './types.js';
import { createDefaultState } from './types.js';

function token(overrides: Partial<Token> & { id: string }): Token {
  return {
    id: overrides.id,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    label: overrides.label ?? 'T',
    color: overrides.color ?? '#fff',
    imageId: overrides.imageId ?? null,
    size: overrides.size ?? 1,
    borderColor: overrides.borderColor ?? null,
    hp: overrides.hp ?? null,
    conditions: overrides.conditions ?? [],
    rotation: overrides.rotation ?? 0,
    losRadius: overrides.losRadius ?? null,
  };
}

function wall(overrides: Partial<Wall> & { id: string }): Wall {
  return {
    id: overrides.id,
    x1: overrides.x1 ?? 0,
    y1: overrides.y1 ?? 0,
    x2: overrides.x2 ?? 100,
    y2: overrides.y2 ?? 0,
    blocksSight: overrides.blocksSight ?? true,
    blocksMovement: overrides.blocksMovement ?? true,
  };
}

const GRID = { cellSize: 50 };

describe('collectViewers', () => {
  it('skips tokens without a losRadius', () => {
    const tokens = [
      token({ id: 'a', losRadius: null }),
      token({ id: 'b', losRadius: 100 }),
      token({ id: 'c', losRadius: null }),
    ];
    const viewers = collectViewers(tokens, GRID);
    expect(viewers).toHaveLength(1);
    expect(viewers[0]?.radius).toBe(100);
  });

  it('places the viewer at the token cell center (size 1)', () => {
    const tokens = [token({ id: 'a', x: 3, y: 4, losRadius: 100 })];
    const viewers = collectViewers(tokens, GRID);
    // Cell (3, 4) center in world pixels: (3.5 * 50, 4.5 * 50) = (175, 225).
    expect(viewers[0]).toEqual({ x: 175, y: 225, radius: 100 });
  });

  it('honours token.size for off-center large tokens', () => {
    const tokens = [token({ id: 'a', x: 2, y: 2, size: 2, losRadius: 100 })];
    const viewers = collectViewers(tokens, GRID);
    // 2×2 token at (2,2) → center cell-coord (3, 3) → (150, 150).
    expect(viewers[0]).toEqual({ x: 150, y: 150, radius: 100 });
  });

  describe('with a drag overlay', () => {
    it('shifts viewers in the drag overlay\'s id set by deltaX/deltaY', () => {
      const tokens = [
        token({ id: 'dragging', x: 3, y: 4, losRadius: 100 }),
        token({ id: 'still', x: 0, y: 0, losRadius: 50 }),
      ];
      const viewers = collectViewers(tokens, GRID, {
        ids: ['dragging'],
        deltaX: 75,
        deltaY: -25,
      });
      // 'dragging' shifts: (175, 225) + (75, -25) = (250, 200).
      expect(viewers[0]).toEqual({ x: 250, y: 200, radius: 100 });
      // 'still' stays put at (0+0.5)*50 = 25, 25.
      expect(viewers[1]).toEqual({ x: 25, y: 25, radius: 50 });
    });

    it('ignores overlay when the dragging viewer has no losRadius', () => {
      // (Defensive — a non-viewer drag wouldn't recompute LoS in
      //  practice, but the helper should still skip it cleanly.)
      const tokens = [token({ id: 'a', x: 3, y: 4, losRadius: null })];
      const viewers = collectViewers(tokens, GRID, {
        ids: ['a'],
        deltaX: 99,
        deltaY: 99,
      });
      expect(viewers).toHaveLength(0);
    });

    it('treats an empty drag overlay as no overlay (back-compat)', () => {
      const tokens = [token({ id: 'a', x: 3, y: 4, losRadius: 100 })];
      const viewers = collectViewers(tokens, GRID, {
        ids: [],
        deltaX: 999,
        deltaY: 999,
      });
      // Empty ids list = nothing's being dragged.
      expect(viewers[0]).toEqual({ x: 175, y: 225, radius: 100 });
    });

    it('matches the no-overlay behavior when dragOverlay is null', () => {
      const tokens = [token({ id: 'a', x: 3, y: 4, losRadius: 100 })];
      const viewers = collectViewers(tokens, GRID, null);
      expect(viewers[0]).toEqual({ x: 175, y: 225, radius: 100 });
    });
  });
});

describe('collectSightWalls', () => {
  it('keeps only walls with blocksSight = true', () => {
    const walls = [
      wall({ id: 'w1', blocksSight: true }),
      wall({ id: 'w2', blocksSight: false }),
      wall({ id: 'w3', blocksSight: true }),
    ];
    const out = collectSightWalls(walls);
    expect(out).toHaveLength(2);
  });

  it('strips id + blocks* fields from the output', () => {
    const walls = [wall({ id: 'w1', x1: 1, y1: 2, x2: 3, y2: 4 })];
    expect(collectSightWalls(walls)).toEqual([{ x1: 1, y1: 2, x2: 3, y2: 4 }]);
  });
});

describe('spectatorEffectiveFog', () => {
  function stateWithFog(fog: number[]): SessionState {
    const s = createDefaultState();
    s.grid = { ...s.grid, cols: 4, rows: 1, cellSize: 10 };
    s.fog = Uint8Array.from(fog);
    return s;
  }

  it('returns the input fog unchanged when LoS is off', () => {
    const s = stateWithFog([1, 1, 0, 1]);
    const out = spectatorEffectiveFog(s, [[{ x: 0, y: 0 }]], false);
    expect(out).toBe(s.fog);
  });

  it('returns the input fog unchanged when polygons array is empty', () => {
    const s = stateWithFog([1, 1, 0, 1]);
    const out = spectatorEffectiveFog(s, [], true);
    expect(out).toBe(s.fog);
  });

  it('AND-masks the fog with rasterized polygon coverage', () => {
    // 4-cell row, all revealed by GM, polygon covers only cell 0.
    const s = stateWithFog([1, 1, 1, 1]);
    const polygon = [
      { x: -1, y: -1 },
      { x: 9, y: -1 },
      { x: 9, y: 9 },
      { x: -1, y: 9 },
    ];
    const out = spectatorEffectiveFog(s, [polygon], true);
    // Only cell 0 (center 5,5) lies inside the polygon — the rest go back to fog.
    expect(Array.from(out)).toEqual([1, 0, 0, 0]);
  });
});
