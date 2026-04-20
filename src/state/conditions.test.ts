import { describe, it, expect } from 'vitest';
import {
  addCondition,
  removeCondition,
  hasCondition,
  toggleCondition,
  getConditionPreset,
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
