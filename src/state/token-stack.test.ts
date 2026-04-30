import { describe, it, expect } from 'vitest';
import {
  stackKey,
  groupTokensByStack,
  tokensInStackAt,
  cycleStackSelection,
} from './token-stack.js';
import type { Token } from './types.js';

function tok(id: string, x: number, y: number, label = id): Token {
  return {
    id,
    x,
    y,
    label,
    color: '#888',
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
  };
}

describe('stackKey', () => {
  it('returns "x,y" for integer coords', () => {
    expect(stackKey(3, 4)).toBe('3,4');
    expect(stackKey(-1, 0)).toBe('-1,0');
  });
});

describe('groupTokensByStack', () => {
  it('returns an empty map for no input', () => {
    expect(groupTokensByStack([]).size).toBe(0);
  });

  it('puts lone tokens in singleton stacks', () => {
    const a = tok('a', 1, 1);
    const b = tok('b', 2, 3);
    const groups = groupTokensByStack([a, b]);
    expect(groups.size).toBe(2);
    expect(groups.get('1,1')?.tokens).toEqual([a]);
    expect(groups.get('2,3')?.tokens).toEqual([b]);
  });

  it('groups tokens sharing an origin cell in draw order', () => {
    const bot = tok('bot', 5, 5, 'Bottom');
    const mid = tok('mid', 5, 5, 'Middle');
    const top = tok('top', 5, 5, 'Top');
    const other = tok('other', 6, 5, 'Neighbor');
    const groups = groupTokensByStack([bot, mid, top, other]);
    expect(groups.size).toBe(2);
    expect(groups.get('5,5')?.tokens).toEqual([bot, mid, top]);
    expect(groups.get('6,5')?.tokens).toEqual([other]);
  });

  it('treats different x/y combos as separate stacks', () => {
    const a = tok('a', 3, 3);
    const b = tok('b', 3, 4);
    const groups = groupTokensByStack([a, b]);
    expect(groups.size).toBe(2);
  });
});

describe('tokensInStackAt', () => {
  const tokens = [
    tok('a', 2, 2),
    tok('b', 2, 2),
    tok('c', 3, 2),
    tok('d', 2, 3),
  ];

  it('returns all tokens matching the (x, y)', () => {
    expect(tokensInStackAt(tokens, 2, 2)).toEqual([tokens[0], tokens[1]]);
  });

  it('returns [] when nothing matches', () => {
    expect(tokensInStackAt(tokens, 9, 9)).toEqual([]);
  });

  it('preserves draw order', () => {
    const out = tokensInStackAt(tokens, 2, 2);
    expect(out.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('cycleStackSelection', () => {
  const stack = [tok('a', 1, 1), tok('b', 1, 1), tok('c', 1, 1)];

  it('returns null for empty stack', () => {
    expect(cycleStackSelection([], 'x')).toBeNull();
  });

  it('returns the only id for single-token stack', () => {
    expect(cycleStackSelection([stack[0]!], null)).toBe('a');
    expect(cycleStackSelection([stack[0]!], 'a')).toBe('a');
  });

  it('with no current selection, picks the top-most (last drawn)', () => {
    expect(cycleStackSelection(stack, null)).toBe('c');
  });

  it('cycles downward through the stack, wrapping at the bottom', () => {
    // top=c, middle=b, bottom=a
    expect(cycleStackSelection(stack, 'c')).toBe('b');
    expect(cycleStackSelection(stack, 'b')).toBe('a');
    expect(cycleStackSelection(stack, 'a')).toBe('c'); // wraps back to top
  });

  it('falls back to the top when the current id isn\u2019t in the stack', () => {
    expect(cycleStackSelection(stack, 'zzz')).toBe('c');
  });
});
