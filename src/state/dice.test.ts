import { describe, it, expect } from 'vitest';
import {
  parseDiceExpression,
  rollDice,
  formatRoll,
  DiceParseError,
  type Rng,
} from './dice.js';

/** Sequential RNG — returns the next value from the given array. */
function seq(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i++];
    if (v === undefined) throw new Error('sequential RNG ran out of values');
    return v;
  };
}

/** Force a specific rolled face for a die of `sides`. `rollOne` computes
 * `Math.floor(rng() * sides) + 1`, so we invert: `rng = (face - 1) / sides`.
 * Using `(face - 0.5) / sides` gives a safe mid-bucket value.
 */
function forFace(face: number, sides: number): number {
  return (face - 0.5) / sides;
}

describe('parseDiceExpression', () => {
  it('parses a bare die group', () => {
    const expr = parseDiceExpression('1d20');
    expect(expr.groups).toEqual([{ count: 1, sides: 20, sign: 1 }]);
    expect(expr.modifier).toBe(0);
  });

  it('parses a die group with a flat modifier', () => {
    const expr = parseDiceExpression('1d20+5');
    expect(expr.groups).toEqual([{ count: 1, sides: 20, sign: 1 }]);
    expect(expr.modifier).toBe(5);
  });

  it('accepts negative modifiers', () => {
    const expr = parseDiceExpression('2d6-2');
    expect(expr.modifier).toBe(-2);
  });

  it('parses multiple dice groups', () => {
    const expr = parseDiceExpression('1d20+1d4+3');
    expect(expr.groups).toEqual([
      { count: 1, sides: 20, sign: 1 },
      { count: 1, sides: 4, sign: 1 },
    ]);
    expect(expr.modifier).toBe(3);
  });

  it('parses leading-minus groups', () => {
    const expr = parseDiceExpression('-1d4');
    expect(expr.groups).toEqual([{ count: 1, sides: 4, sign: -1 }]);
  });

  it('parses "keep highest" (advantage, stat rolls)', () => {
    const expr = parseDiceExpression('4d6kh3');
    expect(expr.groups[0]?.keep).toEqual({ n: 3, mode: 'highest' });
  });

  it('parses "keep lowest" (disadvantage)', () => {
    const expr = parseDiceExpression('2d20kl1');
    expect(expr.groups[0]?.keep).toEqual({ n: 1, mode: 'lowest' });
  });

  it('ignores whitespace and case', () => {
    const expr = parseDiceExpression(' 1 D 20  +  5 ');
    expect(expr.groups[0]?.sides).toBe(20);
    expect(expr.modifier).toBe(5);
  });

  it('throws on empty input', () => {
    expect(() => parseDiceExpression('')).toThrow(DiceParseError);
    expect(() => parseDiceExpression('   ')).toThrow(DiceParseError);
  });

  it('throws when no dice groups are present', () => {
    expect(() => parseDiceExpression('5')).toThrow(/at least one die group/);
  });

  it('throws on nonsense characters', () => {
    expect(() => parseDiceExpression('1d20!')).toThrow(DiceParseError);
  });

  it('throws when keep count exceeds die count', () => {
    expect(() => parseDiceExpression('2d6kh3')).toThrow(/Cannot keep/);
  });

  it('rejects zero-sided dice', () => {
    expect(() => parseDiceExpression('1d0')).toThrow(DiceParseError);
  });
});

describe('rollDice', () => {
  it('produces deterministic totals when fed a sequential RNG', () => {
    const expr = parseDiceExpression('2d6+3');
    const rng = seq([forFace(4, 6), forFace(5, 6)]);
    const result = rollDice(expr, rng);
    expect(result.groups[0]!.rolls).toEqual([4, 5]);
    expect(result.groups[0]!.subtotal).toBe(9);
    expect(result.total).toBe(12);
  });

  it('subtracts subtotals for negative-sign groups', () => {
    const expr = parseDiceExpression('1d8-1d4');
    const rng = seq([forFace(5, 8), forFace(2, 4)]);
    const result = rollDice(expr, rng);
    expect(result.groups[0]!.subtotal).toBe(5);
    expect(result.groups[1]!.subtotal).toBe(-2);
    expect(result.total).toBe(3);
  });

  it('honors "keep highest" by masking the lowest rolls', () => {
    const expr = parseDiceExpression('4d6kh3');
    const rng = seq([forFace(2, 6), forFace(5, 6), forFace(3, 6), forFace(6, 6)]);
    const result = rollDice(expr, rng);
    const g = result.groups[0]!;
    expect(g.rolls).toEqual([2, 5, 3, 6]);
    // The `2` should be dropped; 5 + 3 + 6 = 14
    expect(g.kept).toEqual([false, true, true, true]);
    expect(g.subtotal).toBe(14);
  });

  it('honors "keep lowest" (disadvantage)', () => {
    const expr = parseDiceExpression('2d20kl1');
    const rng = seq([forFace(17, 20), forFace(4, 20)]);
    const result = rollDice(expr, rng);
    const g = result.groups[0]!;
    expect(g.rolls).toEqual([17, 4]);
    expect(g.kept).toEqual([false, true]);
    expect(g.subtotal).toBe(4);
  });

  it('does not mutate the expression argument', () => {
    const expr = parseDiceExpression('1d6');
    const copy = JSON.parse(JSON.stringify(expr));
    rollDice(expr, seq([forFace(3, 6)]));
    expect(expr).toEqual(copy);
  });

  it('defaults to Math.random when no rng is supplied', () => {
    const expr = parseDiceExpression('1d6');
    const r = rollDice(expr);
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.total).toBeLessThanOrEqual(6);
  });
});

describe('formatRoll', () => {
  it('renders a simple d20+5', () => {
    const expr = parseDiceExpression('1d20+5');
    const rng = seq([forFace(15, 20)]);
    const result = rollDice(expr, rng);
    expect(formatRoll(result)).toBe('[15] +5 = 20');
  });

  it('marks dropped dice with tildes', () => {
    const expr = parseDiceExpression('4d6kh3');
    const rng = seq([forFace(2, 6), forFace(5, 6), forFace(3, 6), forFace(6, 6)]);
    const result = rollDice(expr, rng);
    expect(formatRoll(result)).toContain('~2~');
  });

  it('uses a minus sign for negative-sign groups', () => {
    const expr = parseDiceExpression('1d8-1d4');
    const rng = seq([forFace(5, 8), forFace(2, 4)]);
    const result = rollDice(expr, rng);
    expect(formatRoll(result)).toBe('[5] −[2] = 3');
  });
});
