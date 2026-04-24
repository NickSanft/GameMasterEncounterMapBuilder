import { describe, it, expect } from 'vitest';
import {
  CONCENTRATING_CONDITION_ID,
  concentrationDc,
  concentrationChecksForDamage,
} from './concentration.js';
import type { Token } from './types.js';

function token(partial: Partial<Token> & { id: string }): Token {
  return {
    id: partial.id,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    label: partial.label ?? partial.id,
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
  };
}

describe('concentrationDc', () => {
  it('floors at 10 for low damage', () => {
    expect(concentrationDc(1)).toBe(10);
    expect(concentrationDc(5)).toBe(10);
    expect(concentrationDc(19)).toBe(10);
    // Boundary: damage 20 → floor(20/2) = 10, max(10, 10) = 10.
    expect(concentrationDc(20)).toBe(10);
  });

  it('uses half damage when that exceeds 10', () => {
    expect(concentrationDc(21)).toBe(10);
    expect(concentrationDc(22)).toBe(11);
    expect(concentrationDc(50)).toBe(25);
    expect(concentrationDc(101)).toBe(50);
  });

  it('returns 0 for non-positive / non-finite damage', () => {
    // Used by callers as a "is a check needed?" predicate.
    expect(concentrationDc(0)).toBe(0);
    expect(concentrationDc(-5)).toBe(0);
    expect(concentrationDc(Number.NaN)).toBe(0);
    expect(concentrationDc(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('floors fractional damage', () => {
    // Damage in the dialog is integer (parseInt), but defensive.
    expect(concentrationDc(21.7)).toBe(10);
    expect(concentrationDc(23.4)).toBe(11);
  });
});

describe('concentrationChecksForDamage', () => {
  it('returns checks only for concentrating tokens that took damage', () => {
    const tokens = [
      token({ id: 'wizard', label: 'Wizard', conditions: [CONCENTRATING_CONDITION_ID] }),
      token({ id: 'fighter', label: 'Fighter' }),
      token({ id: 'cleric', label: 'Cleric', conditions: [CONCENTRATING_CONDITION_ID] }),
    ];
    const damage = new Map([
      ['wizard', 12],
      ['fighter', 7],
      ['cleric', 3],
    ]);
    const checks = concentrationChecksForDamage(tokens, damage);
    expect(checks).toHaveLength(2);
    expect(checks.map((c) => c.tokenId)).toEqual(['wizard', 'cleric']);
    expect(checks[0]?.dc).toBe(10); // 12 dmg → max(10, 6) = 10
    expect(checks[1]?.dc).toBe(10); // 3 dmg → max(10, 1) = 10
  });

  it('skips tokens that took 0 damage (or were healed)', () => {
    const tokens = [
      token({ id: 'a', conditions: [CONCENTRATING_CONDITION_ID] }),
      token({ id: 'b', conditions: [CONCENTRATING_CONDITION_ID] }),
    ];
    const damage = new Map([
      ['a', 0],   // no actual damage → no check
      ['b', -3],  // healing → no check
    ]);
    expect(concentrationChecksForDamage(tokens, damage)).toEqual([]);
  });

  it('skips tokens not flagged as concentrating', () => {
    const tokens = [token({ id: 'fighter', conditions: ['poisoned'] })];
    const damage = new Map([['fighter', 50]]);
    expect(concentrationChecksForDamage(tokens, damage)).toEqual([]);
  });

  it('skips tokens whose id is not in the damage map', () => {
    const tokens = [token({ id: 'wizard', conditions: [CONCENTRATING_CONDITION_ID] })];
    expect(concentrationChecksForDamage(tokens, new Map())).toEqual([]);
  });

  it('uses the token label at check-time (not a future rename)', () => {
    const tokens = [
      token({
        id: 'wizard',
        label: 'Mordenkainen',
        conditions: [CONCENTRATING_CONDITION_ID],
      }),
    ];
    const checks = concentrationChecksForDamage(tokens, new Map([['wizard', 8]]));
    expect(checks[0]?.label).toBe('Mordenkainen');
  });

  it('falls back to "Token" for unlabeled tokens', () => {
    const tokens = [
      token({ id: 'x', label: '', conditions: [CONCENTRATING_CONDITION_ID] }),
    ];
    const checks = concentrationChecksForDamage(tokens, new Map([['x', 5]]));
    expect(checks[0]?.label).toBe('Token');
  });
});
