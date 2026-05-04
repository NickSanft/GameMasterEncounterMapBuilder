import { describe, it, expect } from 'vitest';
import { hitTestToken } from './hit-test.js';
import type { GridConfig, Token } from '../state/types.js';

const GRID: GridConfig = { cols: 30, rows: 20, cellSize: 50, showGridLines: true };

function token(partial: Partial<Token> & { id: string }): Token {
  return {
    id: partial.id,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    label: partial.label ?? 'T',
    color: partial.color ?? '#ffffff',
    imageId: partial.imageId ?? null,
    size: partial.size ?? 1,
    borderColor: partial.borderColor ?? null,
    hp: partial.hp ?? null,
    conditions: partial.conditions ?? [],
    rotation: partial.rotation ?? 0,
    losRadius: partial.losRadius ?? null,
    light: partial.light ?? null,
    initiativeMod: partial.initiativeMod ?? 0,
    conditionExpirations: partial.conditionExpirations ?? {},
    deathSaves: partial.deathSaves ?? { successes: 0, failures: 0 },
    ownerId: partial.ownerId ?? null,
    auras: partial.auras ?? [],
    speedFt: partial.speedFt ?? 30,
  };
}

describe('hitTestToken', () => {
  it('finds the token when hitting its center', () => {
    const t = token({ id: 'a', x: 3, y: 2 });
    // Center of cell (3,2) at cellSize 50 is (175, 125)
    const hit = hitTestToken([t], GRID, 175, 125);
    expect(hit?.id).toBe('a');
  });

  it('returns null when outside token circle', () => {
    const t = token({ id: 'a', x: 3, y: 2 });
    const hit = hitTestToken([t], GRID, 300, 300);
    expect(hit).toBeNull();
  });

  it('returns the topmost token when multiple overlap', () => {
    const a = token({ id: 'a', x: 3, y: 2 });
    const b = token({ id: 'b', x: 3, y: 2 });
    // b is later in the list, hence on top
    const hit = hitTestToken([a, b], GRID, 175, 125);
    expect(hit?.id).toBe('b');
  });

  it('respects size for large tokens', () => {
    const t = token({ id: 'big', x: 0, y: 0, size: 3 });
    // Center of a 3x3 token at (0,0) is (75, 75)
    expect(hitTestToken([t], GRID, 75, 75)?.id).toBe('big');
    // Point inside the 3x3 footprint but near the edge
    expect(hitTestToken([t], GRID, 140, 75)?.id).toBe('big');
  });

  it('ignores tokens whose circles do not cover the point', () => {
    const t = token({ id: 'a', x: 0, y: 0 });
    // Cell corner (0,0) is outside the inscribed circle of a size-1 token
    const hit = hitTestToken([t], GRID, 0, 0);
    expect(hit).toBeNull();
  });
});
