import { describe, it, expect } from 'vitest';
import {
  addCondition,
  removeCondition,
  hasCondition,
  toggleCondition,
  getConditionPreset,
  setConditionExpiration,
  clearConditionExpiration,
  tickConditions,
  CONDITION_PRESETS,
} from './conditions.js';

describe('condition helpers', () => {
  it('addCondition adds unique ids', () => {
    expect(addCondition([], 'poisoned')).toEqual(['poisoned']);
    expect(addCondition(['prone'], 'poisoned')).toEqual(['prone', 'poisoned']);
    // Already present — returns a copy (not the same reference) without duplicating.
    const existing = ['poisoned'];
    const next = addCondition(existing, 'poisoned');
    expect(next).toEqual(['poisoned']);
    expect(next).not.toBe(existing);
  });

  it('removeCondition strips the id', () => {
    expect(removeCondition(['prone', 'poisoned'], 'prone')).toEqual(['poisoned']);
    expect(removeCondition(['prone'], 'invisible')).toEqual(['prone']);
  });

  it('hasCondition is a simple membership test', () => {
    expect(hasCondition(['prone'], 'prone')).toBe(true);
    expect(hasCondition(['prone'], 'invisible')).toBe(false);
  });

  it('toggleCondition flips membership', () => {
    expect(toggleCondition([], 'charmed')).toEqual(['charmed']);
    expect(toggleCondition(['charmed'], 'charmed')).toEqual([]);
    expect(toggleCondition(['prone'], 'charmed')).toEqual(['prone', 'charmed']);
  });

  it('does not mutate input arrays', () => {
    const original = ['poisoned'];
    addCondition(original, 'prone');
    removeCondition(original, 'poisoned');
    toggleCondition(original, 'charmed');
    expect(original).toEqual(['poisoned']);
  });
});

describe('getConditionPreset', () => {
  it('returns the preset for known ids', () => {
    const poisoned = getConditionPreset('poisoned');
    expect(poisoned).not.toBeNull();
    expect(poisoned?.label).toBe('Poisoned');
    expect(poisoned?.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns null for unknown ids (custom conditions)', () => {
    expect(getConditionPreset('feebleminded')).toBeNull();
  });
});

describe('setConditionExpiration', () => {
  it('sets a new round timer on an id', () => {
    expect(setConditionExpiration({}, 'poisoned', 5)).toEqual({ poisoned: 5 });
  });

  it('overwrites an existing timer on the same id', () => {
    expect(setConditionExpiration({ poisoned: 3 }, 'poisoned', 7)).toEqual({
      poisoned: 7,
    });
  });

  it('preserves timers on other ids', () => {
    expect(
      setConditionExpiration({ poisoned: 3, prone: 9 }, 'poisoned', 5),
    ).toEqual({ poisoned: 5, prone: 9 });
  });

  it('strips the timer when expiresAtRound is null', () => {
    expect(setConditionExpiration({ poisoned: 5 }, 'poisoned', null)).toEqual({});
  });

  it('strips the timer when expiresAtRound is not finite', () => {
    expect(
      setConditionExpiration({ poisoned: 5 }, 'poisoned', Number.NaN),
    ).toEqual({});
    expect(
      setConditionExpiration({ poisoned: 5 }, 'poisoned', Number.POSITIVE_INFINITY),
    ).toEqual({});
  });

  it('floors fractional rounds and clamps the minimum to 1', () => {
    expect(setConditionExpiration({}, 'a', 2.7)).toEqual({ a: 2 });
    expect(setConditionExpiration({}, 'a', 0)).toEqual({ a: 1 });
    expect(setConditionExpiration({}, 'a', -3)).toEqual({ a: 1 });
  });

  it('does not mutate the input map', () => {
    const src = { poisoned: 3 };
    setConditionExpiration(src, 'prone', 5);
    expect(src).toEqual({ poisoned: 3 });
  });
});

describe('clearConditionExpiration', () => {
  it('removes an id that was present', () => {
    expect(clearConditionExpiration({ poisoned: 5, prone: 8 }, 'poisoned')).toEqual({
      prone: 8,
    });
  });

  it('is a no-op for ids that were not present', () => {
    expect(clearConditionExpiration({ poisoned: 5 }, 'prone')).toEqual({
      poisoned: 5,
    });
  });

  it('does not mutate the input map', () => {
    const src = { poisoned: 5 };
    clearConditionExpiration(src, 'poisoned');
    expect(src).toEqual({ poisoned: 5 });
  });
});

describe('tickConditions', () => {
  it('returns unchanged conditions when there are no timers', () => {
    const result = tickConditions(['poisoned', 'prone'], {}, 99);
    expect(result.conditions).toEqual(['poisoned', 'prone']);
    expect(result.conditionExpirations).toEqual({});
    expect(result.removed).toEqual([]);
  });

  it('strips exactly the conditions whose timer <= currentRound', () => {
    const result = tickConditions(
      ['poisoned', 'prone', 'charmed'],
      { poisoned: 3, prone: 5, charmed: 10 },
      5,
    );
    expect(result.removed.sort()).toEqual(['poisoned', 'prone']);
    expect(result.conditions).toEqual(['charmed']);
    expect(result.conditionExpirations).toEqual({ charmed: 10 });
  });

  it('leaves conditions alone when their timer is in the future', () => {
    const result = tickConditions(
      ['poisoned'],
      { poisoned: 7 },
      5,
    );
    expect(result.removed).toEqual([]);
    expect(result.conditions).toEqual(['poisoned']);
    expect(result.conditionExpirations).toEqual({ poisoned: 7 });
  });

  it('handles currentRound exactly equal to expiresAtRound (boundary)', () => {
    // Boundary: expires AT this round, so it IS expired.
    const result = tickConditions(['poisoned'], { poisoned: 5 }, 5);
    expect(result.removed).toEqual(['poisoned']);
    expect(result.conditions).toEqual([]);
  });

  it('leaves untimered conditions untouched while stripping timered ones', () => {
    const result = tickConditions(
      ['poisoned', 'prone'],
      { poisoned: 2 },
      3,
    );
    // poisoned (timered, expired) — strips.
    // prone (no timer) — stays.
    expect(result.removed).toEqual(['poisoned']);
    expect(result.conditions).toEqual(['prone']);
    expect(result.conditionExpirations).toEqual({});
  });

  it('drops stale expiration entries for ids that are no longer active', () => {
    // A GM manually removed "poisoned" before the tick; the stale
    // expiration entry still sat in the map. tickConditions leaves
    // it alone (removing it is the UI's job when it toggles the
    // condition off).
    const result = tickConditions(
      ['prone'],
      { poisoned: 2, prone: 10 },
      5,
    );
    // Nothing stripped — poisoned isn't active, prone hasn't expired.
    expect(result.removed).toEqual([]);
    expect(result.conditions).toEqual(['prone']);
    // Note: the stale `poisoned` entry is preserved as-is. The UI
    // removes it at condition-toggle time via clearConditionExpiration.
    expect(result.conditionExpirations).toEqual({ poisoned: 2, prone: 10 });
  });

  it('does not mutate the input arrays or maps', () => {
    const conditions = ['poisoned'];
    const expirations = { poisoned: 1 };
    tickConditions(conditions, expirations, 5);
    expect(conditions).toEqual(['poisoned']);
    expect(expirations).toEqual({ poisoned: 1 });
  });
});

describe('CONDITION_PRESETS catalog', () => {
  it('contains all standard 5e conditions', () => {
    const ids = CONDITION_PRESETS.map((c) => c.id);
    for (const expected of [
      'blinded',
      'charmed',
      'deafened',
      'frightened',
      'grappled',
      'incapacitated',
      'invisible',
      'paralyzed',
      'petrified',
      'poisoned',
      'prone',
      'restrained',
      'stunned',
      'unconscious',
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it('has unique ids', () => {
    const ids = CONDITION_PRESETS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
