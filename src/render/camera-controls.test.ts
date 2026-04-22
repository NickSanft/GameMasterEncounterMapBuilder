import { describe, it, expect } from 'vitest';
import { computeContentBounds } from './camera-controls.js';
import { createDefaultState, type Token } from '../state/types.js';

function token(overrides: Partial<Token>): Token {
  return {
    id: overrides.id ?? 't',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    label: overrides.label ?? '',
    color: overrides.color ?? '#ffffff',
    imageId: overrides.imageId ?? null,
    size: overrides.size ?? 1,
    borderColor: overrides.borderColor ?? null,
    hp: overrides.hp ?? null,
    conditions: overrides.conditions ?? [],
    rotation: overrides.rotation ?? 0,
    losRadius: overrides.losRadius ?? null,
    light: overrides.light ?? null,  };
}

describe('computeContentBounds', () => {
  it('returns grid bounds when state has no tokens or background', () => {
    const state = createDefaultState();
    const bounds = computeContentBounds(state, () => null);
    expect(bounds).toEqual({
      x: 0,
      y: 0,
      w: state.grid.cols * state.grid.cellSize,
      h: state.grid.rows * state.grid.cellSize,
    });
  });

  it('expands to contain tokens outside the grid', () => {
    const state = createDefaultState();
    state.tokens.push(token({ id: 'a', x: -5, y: -3 }));
    state.tokens.push(token({ id: 'b', x: 40, y: 25 }));
    const bounds = computeContentBounds(state, () => null);
    expect(bounds.x).toBeLessThanOrEqual(-5 * state.grid.cellSize);
    expect(bounds.y).toBeLessThanOrEqual(-3 * state.grid.cellSize);
    expect(bounds.x + bounds.w).toBeGreaterThanOrEqual(
      (40 + 1) * state.grid.cellSize,
    );
    expect(bounds.y + bounds.h).toBeGreaterThanOrEqual(
      (25 + 1) * state.grid.cellSize,
    );
  });

  it('includes background image extent when image is loaded', () => {
    const state = createDefaultState();
    state.background.imageId = 'bg1';
    state.background.offsetX = -100;
    state.background.offsetY = -50;
    state.background.scaleX = 2;
    state.background.scaleY = 2;
    const img = {
      naturalWidth: 500,
      naturalHeight: 400,
    } as HTMLImageElement;
    const bounds = computeContentBounds(state, (id) => (id === 'bg1' ? img : null));
    expect(bounds.x).toBe(-100);
    expect(bounds.y).toBe(-50);
    // background extends to (-100 + 500*2, -50 + 400*2) = (900, 750)
    expect(bounds.x + bounds.w).toBeGreaterThanOrEqual(900);
    expect(bounds.y + bounds.h).toBeGreaterThanOrEqual(750);
  });

  it('ignores background when image is not yet loaded', () => {
    const state = createDefaultState();
    state.background.imageId = 'bg1';
    state.background.offsetX = -500;
    state.background.offsetY = -500;
    state.background.scaleX = 10;
    state.background.scaleY = 10;
    const bounds = computeContentBounds(state, () => null);
    // Without the loaded image we fall back to grid-only bounds
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
  });

  it('accounts for token size (2x2 token at edge)', () => {
    const state = createDefaultState();
    state.tokens.push(token({ x: state.grid.cols, y: 0, size: 2 }));
    const bounds = computeContentBounds(state, () => null);
    // Token's right edge should extend bounds by 2 * cellSize beyond grid
    expect(bounds.x + bounds.w).toBe((state.grid.cols + 2) * state.grid.cellSize);
  });
});
