import { describe, it, expect } from 'vitest';
import {
  tokensInSelectionOrder,
  cycleIndex,
  cycleTo,
} from './token-editor-cycle.js';
import type { Token } from '../state/types.js';

function tok(id: string, x = 0, y = 0): Token {
  return {
    id,
    x,
    y,
    label: id,
    color: '#888',
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
  };
}

describe('tokensInSelectionOrder', () => {
  it('returns an empty array when nothing is selected', () => {
    const tokens = [tok('a'), tok('b'), tok('c')];
    expect(tokensInSelectionOrder(tokens, new Set())).toEqual([]);
  });

  it('preserves the canonical token order, not insertion order of the set', () => {
    const tokens = [tok('a'), tok('b'), tok('c'), tok('d')];
    const sel = new Set(['c', 'a']);
    // Even though 'c' was inserted first, canonical order (a before c) wins.
    expect(tokensInSelectionOrder(tokens, sel)).toEqual(['a', 'c']);
  });

  it('ignores selection ids that are not tokens (annotations, AoEs)', () => {
    const tokens = [tok('a'), tok('b')];
    const sel = new Set(['a', 'annot-1', 'aoe-9']);
    expect(tokensInSelectionOrder(tokens, sel)).toEqual(['a']);
  });
});

describe('cycleIndex', () => {
  it('returns -1 on empty length', () => {
    expect(cycleIndex(0, 0, 1)).toBe(-1);
  });

  it('wraps past the end', () => {
    expect(cycleIndex(4, 3, 1)).toBe(0);
    expect(cycleIndex(4, 3, 2)).toBe(1);
  });

  it('wraps past zero with negative delta', () => {
    expect(cycleIndex(4, 0, -1)).toBe(3);
    expect(cycleIndex(4, 0, -5)).toBe(3);
  });

  it('handles long positive deltas', () => {
    expect(cycleIndex(3, 0, 100)).toBe(1);
  });
});

describe('cycleTo', () => {
  const order = ['a', 'b', 'c'];

  it('returns null for empty order', () => {
    expect(cycleTo([], 'a', 1)).toBeNull();
  });

  it('cycles forward', () => {
    expect(cycleTo(order, 'a', 1)).toBe('b');
    expect(cycleTo(order, 'b', 1)).toBe('c');
    expect(cycleTo(order, 'c', 1)).toBe('a');
  });

  it('cycles backward', () => {
    expect(cycleTo(order, 'a', -1)).toBe('c');
    expect(cycleTo(order, 'c', -1)).toBe('b');
  });

  it('falls back to the first id when currentId is unknown and delta >= 0', () => {
    expect(cycleTo(order, 'zzz', 1)).toBe('a');
    expect(cycleTo(order, null, 1)).toBe('a');
  });

  it('falls back to the last id when currentId is unknown and delta < 0', () => {
    expect(cycleTo(order, null, -1)).toBe('c');
  });
});
