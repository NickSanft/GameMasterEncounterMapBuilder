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
  clampDeathSaves,
  isStable,
  isDead,
  addDeathSaveFailures,
  addDeathSaveSuccesses,
  DEFAULT_DEATH_SAVES,
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

describe('death-save helpers (Phase 72)', () => {
  it('DEFAULT_DEATH_SAVES is {0, 0}', () => {
    expect(DEFAULT_DEATH_SAVES).toEqual({ successes: 0, failures: 0 });
  });

  it('clampDeathSaves clamps to [0, 3] and floors fractions', () => {
    expect(clampDeathSaves({ successes: -2, failures: 5 })).toEqual({
      successes: 0,
      failures: 3,
    });
    expect(clampDeathSaves({ successes: 1.7, failures: 2.4 })).toEqual({
      successes: 1,
      failures: 2,
    });
  });

  it('isStable / isDead recognize the terminal states', () => {
    expect(isStable({ successes: 3, failures: 0 })).toBe(true);
    expect(isStable({ successes: 2, failures: 0 })).toBe(false);
    expect(isDead({ successes: 0, failures: 3 })).toBe(true);
    expect(isDead({ successes: 0, failures: 2 })).toBe(false);
    // Both cap at 3 so reaching either side is final per the SRD;
    // the GM is welcome to override by clicking dots in the editor.
  });

  it('addDeathSaveFailures bumps failures, clamps to 3', () => {
    expect(addDeathSaveFailures({ successes: 1, failures: 0 })).toEqual({
      successes: 1,
      failures: 1,
    });
    expect(addDeathSaveFailures({ successes: 0, failures: 2 }, 5)).toEqual({
      successes: 0,
      failures: 3,
    });
  });

  it('addDeathSaveSuccesses bumps successes, clamps to 3', () => {
    expect(addDeathSaveSuccesses({ successes: 0, failures: 1 })).toEqual({
      successes: 1,
      failures: 1,
    });
    expect(addDeathSaveSuccesses({ successes: 2, failures: 0 }, 10)).toEqual({
      successes: 3,
      failures: 0,
    });
  });

  it('add helpers do not mutate the input', () => {
    const src = { successes: 1, failures: 1 };
    addDeathSaveFailures(src, 1);
    addDeathSaveSuccesses(src, 1);
    expect(src).toEqual({ successes: 1, failures: 1 });
  });

  it('add helpers ignore negative / non-finite amounts', () => {
    const src = { successes: 1, failures: 1 };
    expect(addDeathSaveFailures(src, -5)).toEqual(src);
    expect(addDeathSaveSuccesses(src, NaN)).toEqual(src);
  });
});
