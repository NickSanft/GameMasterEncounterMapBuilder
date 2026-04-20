import { describe, it, expect } from 'vitest';
import { isTokenFullyHidden } from './fog-visibility.js';
import { createDefaultState, type Token } from '../state/types.js';

function token(overrides: Partial<Token>): Token {
  return {
    id: overrides.id ?? 't',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    label: overrides.label ?? 'T',
    color: overrides.color ?? '#ffffff',
    imageId: overrides.imageId ?? null,
    size: overrides.size ?? 1,
    borderColor: overrides.borderColor ?? null,
    hp: overrides.hp ?? null,
    conditions: overrides.conditions ?? [],
  };
}

describe('isTokenFullyHidden', () => {
  it('returns true when the cell is hidden by default fog', () => {
    const state = createDefaultState();
    expect(isTokenFullyHidden(token({ x: 3, y: 5 }), state)).toBe(true);
  });

  it('returns false when the single cell is revealed', () => {
    const state = createDefaultState();
    state.fog[5 * state.grid.cols + 3] = 1;
    expect(isTokenFullyHidden(token({ x: 3, y: 5 }), state)).toBe(false);
  });

  it('returns false when any cell of a large token is revealed', () => {
    const state = createDefaultState();
    // Token occupies (0,0)-(2,2). Reveal one corner cell.
    state.fog[0] = 0; // (0,0) still hidden
    state.fog[1 * state.grid.cols + 1] = 1; // (1,1) revealed
    expect(isTokenFullyHidden(token({ x: 0, y: 0, size: 2 }), state)).toBe(false);
  });

  it('returns true when every cell of a large token is hidden', () => {
    const state = createDefaultState();
    // All fog is 0 (hidden) by default
    expect(isTokenFullyHidden(token({ x: 5, y: 5, size: 3 }), state)).toBe(true);
  });

  it('ignores out-of-bounds cells', () => {
    const state = createDefaultState();
    // Token partially off the grid — only on-grid cells count
    expect(isTokenFullyHidden(token({ x: -1, y: 0 }), state)).toBe(true);
  });

  it('returns true for token fully outside the grid', () => {
    const state = createDefaultState();
    expect(isTokenFullyHidden(token({ x: 100, y: 100 }), state)).toBe(true);
  });

  it('returns false when a fractionally-positioned token overlaps a revealed cell', () => {
    const state = createDefaultState();
    // Token at (2.5, 5) size 1 overlaps cells (2,5) and (3,5) via rounding
    state.fog[5 * state.grid.cols + 3] = 1;
    expect(isTokenFullyHidden(token({ x: 2.5, y: 5 }), state)).toBe(false);
  });
});
