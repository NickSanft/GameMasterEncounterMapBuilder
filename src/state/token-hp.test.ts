import { describe, it, expect } from 'vitest';
import {
  applyDamage,
  applyHealing,
  setHpCurrent,
  setHpMax,
  normalizeHp,
  hpBarColor,
  hpFraction,
  isBloodied,
  isDown,
} from './token-hp.js';
import type { TokenHp } from './types.js';

const hp = (current: number, max: number): TokenHp => ({
  current,
  max,
  visibility: 'shared',
});

describe('normalizeHp', () => {
  it('clamps current to [0, max]', () => {
    expect(normalizeHp(hp(-5, 10))).toEqual(hp(0, 10));
    expect(normalizeHp(hp(25, 10))).toEqual(hp(10, 10));
    expect(normalizeHp(hp(7, 10))).toEqual(hp(7, 10));
  });

  it('floors fractional values', () => {
    expect(normalizeHp(hp(3.7, 10.9))).toEqual(hp(3, 10));
  });

  it('treats negative max as 0', () => {
    expect(normalizeHp(hp(5, -10))).toEqual(hp(0, 0));
  });

  it('preserves visibility', () => {
    const base: TokenHp = { current: 5, max: 10, visibility: 'gm' };
    expect(normalizeHp(base).visibility).toBe('gm');
  });
});

describe('applyDamage / applyHealing', () => {
  it('reduces HP by the damage amount', () => {
    expect(applyDamage(hp(10, 10), 3).current).toBe(7);
  });

  it('clamps damage to 0 (no negative HP)', () => {
    expect(applyDamage(hp(5, 10), 100).current).toBe(0);
  });

  it('healing increases HP up to max', () => {
    expect(applyHealing(hp(3, 10), 5).current).toBe(8);
    expect(applyHealing(hp(3, 10), 100).current).toBe(10);
  });

  it('negative damage = healing (and vice-versa)', () => {
    expect(applyDamage(hp(3, 10), -4)).toEqual(applyHealing(hp(3, 10), 4));
  });

  it('ignores non-finite amounts', () => {
    expect(applyDamage(hp(5, 10), NaN).current).toBe(5);
    expect(applyDamage(hp(5, 10), Infinity).current).toBe(5);
  });

  it('does not mutate the input', () => {
    const before = hp(5, 10);
    applyDamage(before, 3);
    expect(before.current).toBe(5);
  });
});

describe('setHpCurrent / setHpMax', () => {
  it('setHpCurrent clamps to [0, max]', () => {
    expect(setHpCurrent(hp(5, 10), 15).current).toBe(10);
    expect(setHpCurrent(hp(5, 10), -3).current).toBe(0);
  });

  it('setHpMax shrinks current if it exceeds the new max', () => {
    expect(setHpMax(hp(10, 10), 6).current).toBe(6);
  });

  it('setHpMax leaves current alone when widened', () => {
    expect(setHpMax(hp(3, 10), 20).current).toBe(3);
  });
});

describe('hpFraction + hpBarColor + isBloodied + isDown', () => {
  it('hpFraction returns current/max clamped', () => {
    expect(hpFraction(hp(5, 10))).toBe(0.5);
    expect(hpFraction(hp(0, 10))).toBe(0);
    expect(hpFraction(hp(12, 10))).toBe(1);
    expect(hpFraction(hp(5, 0))).toBe(0);
  });

  it('hpBarColor transitions green → yellow → orange → red', () => {
    expect(hpBarColor(1.0)).toBe('#4caf50');
    expect(hpBarColor(0.7)).toBe('#4caf50');
    expect(hpBarColor(0.5)).toBe('#f1c40f');
    expect(hpBarColor(0.2)).toBe('#e67e22');
    expect(hpBarColor(0)).toBe('#c0392b');
  });

  it('isBloodied returns true at or below half HP', () => {
    expect(isBloodied(hp(10, 10))).toBe(false);
    expect(isBloodied(hp(5, 10))).toBe(true);
    expect(isBloodied(hp(4, 10))).toBe(true);
  });

  it('isDown returns true only when current <= 0', () => {
    expect(isDown(hp(0, 10))).toBe(true);
    expect(isDown(hp(1, 10))).toBe(false);
  });
});
