/**
 * Phase 156 — token-relations helper tests.
 */
import { describe, it, expect } from 'vitest';
import {
  descendantsOf,
  wouldCreateCycle,
  expandWithDescendants,
} from './token-relations.js';
import type { Token } from './types.js';

function token(id: string, parentId: string | null = null): Token {
  return {
    id,
    x: 0,
    y: 0,
    label: id,
    color: '#ffffff',
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ownerId: null,
    auras: [],
    speedFt: 30,
    parentId,
  };
}

describe('descendantsOf (Phase 156)', () => {
  it('returns [] when the root has no children', () => {
    const tokens = [token('a'), token('b')];
    expect(descendantsOf(tokens, 'a')).toEqual([]);
  });

  it('returns immediate children', () => {
    const tokens = [
      token('cart'),
      token('barrel-1', 'cart'),
      token('barrel-2', 'cart'),
    ];
    expect(descendantsOf(tokens, 'cart').sort()).toEqual([
      'barrel-1',
      'barrel-2',
    ]);
  });

  it('recurses through grandchildren (BFS order)', () => {
    const tokens = [
      token('ship'),
      token('crew', 'ship'),
      token('captain', 'crew'),
      token('parrot', 'captain'),
    ];
    expect(descendantsOf(tokens, 'ship')).toEqual([
      'crew',
      'captain',
      'parrot',
    ]);
  });

  it('does NOT include ancestors', () => {
    const tokens = [token('grandpa'), token('parent', 'grandpa'), token('kid', 'parent')];
    expect(descendantsOf(tokens, 'parent')).toEqual(['kid']);
  });

  it('returns [] for an unknown root id', () => {
    expect(descendantsOf([token('a')], 'ghost')).toEqual([]);
  });

  it('handles malformed cycles without infinite-looping (defensive)', () => {
    // a → b → a (impossible via the editor, but the wire format
    // could carry it).
    const tokens = [token('a', 'b'), token('b', 'a')];
    const result = descendantsOf(tokens, 'a');
    // Should terminate. Output is deterministic but the exact set is
    // implementation-defined for cycles — assert it doesn't loop.
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('wouldCreateCycle (Phase 156)', () => {
  it('is true when the candidate is the token itself', () => {
    expect(wouldCreateCycle([token('a')], 'a', 'a')).toBe(true);
  });

  it('is true when the candidate is a direct descendant', () => {
    const tokens = [token('cart'), token('barrel', 'cart')];
    // Trying to make `cart` a child of `barrel` would close the loop.
    expect(wouldCreateCycle(tokens, 'cart', 'barrel')).toBe(true);
  });

  it('is true for grandchildren too', () => {
    const tokens = [
      token('ship'),
      token('crew', 'ship'),
      token('captain', 'crew'),
    ];
    expect(wouldCreateCycle(tokens, 'ship', 'captain')).toBe(true);
  });

  it('is false for an unrelated token', () => {
    const tokens = [token('a'), token('b'), token('c')];
    expect(wouldCreateCycle(tokens, 'a', 'b')).toBe(false);
  });

  it('is false for the token-without-children case', () => {
    expect(wouldCreateCycle([token('a'), token('b')], 'a', 'b')).toBe(false);
  });
});

describe('expandWithDescendants (Phase 156)', () => {
  it('returns the input when nothing has descendants', () => {
    const tokens = [token('a'), token('b')];
    expect(expandWithDescendants(tokens, ['a'])).toEqual(['a']);
  });

  it('adds direct descendants after the parent', () => {
    const tokens = [
      token('cart'),
      token('barrel-1', 'cart'),
      token('barrel-2', 'cart'),
    ];
    const out = expandWithDescendants(tokens, ['cart']);
    expect(out[0]).toBe('cart');
    expect(out.slice(1).sort()).toEqual(['barrel-1', 'barrel-2']);
  });

  it('de-duplicates when a child is also explicitly selected', () => {
    const tokens = [
      token('cart'),
      token('barrel', 'cart'),
    ];
    const out = expandWithDescendants(tokens, ['cart', 'barrel']);
    expect(out).toEqual(['cart', 'barrel']);
  });

  it('handles multiple roots with separate trees', () => {
    const tokens = [
      token('cart-1'),
      token('barrel', 'cart-1'),
      token('cart-2'),
      token('crate', 'cart-2'),
    ];
    const out = expandWithDescendants(tokens, ['cart-1', 'cart-2']);
    expect(out.includes('barrel')).toBe(true);
    expect(out.includes('crate')).toBe(true);
    expect(out.length).toBe(4);
  });

  it('returns [] for empty input', () => {
    expect(expandWithDescendants([], [])).toEqual([]);
  });
});
