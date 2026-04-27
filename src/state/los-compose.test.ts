import { describe, it, expect } from 'vitest';
import {
  collectLights,
  collectSightWalls,
  collectViewers,
  spectatorEffectiveFog,
} from './los-compose.js';
import type { Token, TokenLight, Wall, WallSegment, SessionState } from './types.js';
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
    light: overrides.light ?? null,
    initiativeMod: overrides.initiativeMod ?? 0,
    conditionExpirations: overrides.conditionExpirations ?? {},
    deathSaves: overrides.deathSaves ?? { successes: 0, failures: 0 },
  };
}

function wall(overrides: Partial<WallSegment> & { id: string }): Wall {
  return {
    kind: 'segment',
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
    const out = collectSightWalls(walls, GRID.cellSize);
    expect(out).toHaveLength(2);
  });

  it('strips id + blocks* fields from the output', () => {
    const walls = [wall({ id: 'w1', x1: 1, y1: 2, x2: 3, y2: 4 })];
    expect(collectSightWalls(walls, GRID.cellSize)).toEqual([
      { x1: 1, y1: 2, x2: 3, y2: 4 },
    ]);
  });

  it('Phase 112 — block walls expand to 4 perimeter segments', () => {
    // A 2x1 block at cell (3, 4) on a 10-px grid covers world rect
    // x:[30..50], y:[40..50]. Expect top, right, bottom, left edges.
    const walls: Wall[] = [
      {
        kind: 'block',
        id: 'b1',
        cellX: 3,
        cellY: 4,
        cellsWide: 2,
        cellsTall: 1,
        blocksSight: true,
        blocksMovement: true,
      },
    ];
    const out = collectSightWalls(walls, 10);
    expect(out).toEqual([
      { x1: 30, y1: 40, x2: 50, y2: 40 }, // top
      { x1: 50, y1: 40, x2: 50, y2: 50 }, // right
      { x1: 30, y1: 50, x2: 50, y2: 50 }, // bottom
      { x1: 30, y1: 40, x2: 30, y2: 50 }, // left
    ]);
  });

  it('Phase 112 — blocksSight=false on a block wall drops all 4 perimeter edges', () => {
    const walls: Wall[] = [
      {
        kind: 'block',
        id: 'b1',
        cellX: 0,
        cellY: 0,
        cellsWide: 1,
        cellsTall: 1,
        blocksSight: false,
        blocksMovement: true,
      },
    ];
    expect(collectSightWalls(walls, 10)).toEqual([]);
  });

  it('Phase 113 — closed door contributes its segment to LoS', () => {
    const w = wall({ id: 'd1', x1: 0, y1: 0, x2: 100, y2: 0 }) as WallSegment;
    w.door = { open: false };
    expect(collectSightWalls([w], 50)).toEqual([
      { x1: 0, y1: 0, x2: 100, y2: 0 },
    ]);
  });

  it('Phase 113 — open door drops its LoS contribution', () => {
    const w = wall({ id: 'd1', x1: 0, y1: 0, x2: 100, y2: 0 }) as WallSegment;
    w.door = { open: true };
    expect(collectSightWalls([w], 50)).toEqual([]);
  });

  it('Phase 113 — open door coexists with normal walls (only the door drops)', () => {
    const normal = wall({ id: 'normal', x1: 0, y1: 0, x2: 100, y2: 0 });
    const door = wall({ id: 'door', x1: 100, y1: 0, x2: 200, y2: 0 }) as WallSegment;
    door.door = { open: true };
    const out = collectSightWalls([normal, door], 50);
    expect(out).toEqual([{ x1: 0, y1: 0, x2: 100, y2: 0 }]);
  });
});

describe('collectLights', () => {
  const torch: TokenLight = { bright: 100, dim: 200, color: '#ffe1a4' };

  it('skips tokens without a light', () => {
    const tokens = [
      token({ id: 'a', light: null }),
      token({ id: 'b', light: torch }),
      token({ id: 'c', light: null }),
    ];
    const lights = collectLights(tokens, GRID);
    expect(lights).toHaveLength(1);
    // Lights use the DIM radius for visibility math (bright is render-only).
    expect(lights[0]?.radius).toBe(200);
  });

  it('skips lights with non-positive dim radius', () => {
    // Defensive — normalizeLight should keep this out of state, but if
    // a malformed light makes it through we shouldn't ship a 0-radius
    // light source to the worker (would be a wasted ray-cast).
    const tokens = [
      token({ id: 'a', light: { bright: 0, dim: 0, color: '#fff' } }),
    ];
    expect(collectLights(tokens, GRID)).toHaveLength(0);
  });

  it('places the light at the token cell center (size 1)', () => {
    const tokens = [token({ id: 'a', x: 3, y: 4, light: torch })];
    const lights = collectLights(tokens, GRID);
    // Same projection as collectViewers — (3.5 * 50, 4.5 * 50).
    expect(lights[0]).toEqual({ x: 175, y: 225, radius: 200 });
  });

  it('honours token.size for off-center large tokens', () => {
    const tokens = [token({ id: 'a', x: 2, y: 2, size: 2, light: torch })];
    const lights = collectLights(tokens, GRID);
    expect(lights[0]).toEqual({ x: 150, y: 150, radius: 200 });
  });

  it('shifts lights in the drag overlay by deltaX/deltaY', () => {
    const tokens = [
      token({ id: 'torchbearer', x: 3, y: 4, light: torch }),
      token({ id: 'still', x: 0, y: 0, light: torch }),
    ];
    const lights = collectLights(tokens, GRID, {
      ids: ['torchbearer'],
      deltaX: 75,
      deltaY: -25,
    });
    expect(lights[0]).toEqual({ x: 250, y: 200, radius: 200 });
    expect(lights[1]).toEqual({ x: 25, y: 25, radius: 200 });
  });

  it('matches the no-overlay behavior when dragOverlay is null', () => {
    const tokens = [token({ id: 'a', x: 3, y: 4, light: torch })];
    const lights = collectLights(tokens, GRID, null);
    expect(lights[0]).toEqual({ x: 175, y: 225, radius: 200 });
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

  it('treats an empty light-polygons array as "lighting disabled"', () => {
    // No lights configured on the map → behavior should match Phase 55:
    // viewer mask alone determines visibility, no darkness shroud.
    const s = stateWithFog([1, 1, 1, 1]);
    const viewerPoly = [
      { x: -1, y: -1 },
      { x: 25, y: -1 },
      { x: 25, y: 9 },
      { x: -1, y: 9 },
    ];
    const out = spectatorEffectiveFog(s, [viewerPoly], true, []);
    // Cells 0 and 1 inside viewer polygon → visible. Lights array is
    // empty so it should NOT contribute to the AND.
    expect(Array.from(out)).toEqual([1, 1, 0, 0]);
  });

  it('AND-masks viewer ∩ light when light polygons are present', () => {
    // 4-cell row, all revealed. Viewer covers cells 0,1,2 (centers at
    // x = 5, 15, 25); light covers cells 1,2,3 (centers at 15, 25, 35).
    // Intersection: cells 1 and 2.
    const s = stateWithFog([1, 1, 1, 1]);
    const viewerPoly = [
      { x: -1, y: -1 },
      { x: 29, y: -1 },
      { x: 29, y: 9 },
      { x: -1, y: 9 },
    ];
    const lightPoly = [
      { x: 11, y: -1 },
      { x: 45, y: -1 },
      { x: 45, y: 9 },
      { x: 11, y: 9 },
    ];
    const out = spectatorEffectiveFog(s, [viewerPoly], true, [lightPoly]);
    // Cell 0 (center 5):  viewer yes (5 < 29), light no  (5 < 11)  → 0.
    // Cell 1 (center 15): viewer yes, light yes → 1.
    // Cell 2 (center 25): viewer yes, light yes → 1.
    // Cell 3 (center 35): viewer no  (35 > 29) → 0.
    expect(Array.from(out)).toEqual([0, 1, 1, 0]);
  });

  it('darkens cells outside any light when lighting is enabled', () => {
    // Viewer polygon covers everything, light covers nothing.
    // With non-empty lightPolygons, only the lit cells should show.
    const s = stateWithFog([1, 1, 1, 1]);
    const viewerPoly = [
      { x: -1, y: -1 },
      { x: 100, y: -1 },
      { x: 100, y: 9 },
      { x: -1, y: 9 },
    ];
    const lightPoly = [
      { x: 12, y: -1 },
      { x: 18, y: -1 },
      { x: 18, y: 9 },
      { x: 12, y: 9 },
    ];
    const out = spectatorEffectiveFog(s, [viewerPoly], true, [lightPoly]);
    // Only cell 1 (center 15,5) is inside the tiny light polygon.
    expect(Array.from(out)).toEqual([0, 1, 0, 0]);
  });

  it('returns the input fog unchanged when LoS is off, even with lights', () => {
    const s = stateWithFog([1, 1, 0, 1]);
    const out = spectatorEffectiveFog(
      s,
      [[{ x: 0, y: 0 }]],
      false,
      [[{ x: 0, y: 0 }]],
    );
    expect(out).toBe(s.fog);
  });
});
