import { describe, it, expect } from 'vitest';
import {
  advanceInitiative,
  retreatInitiative,
  sortByValue,
  findEntryForToken,
} from './initiative.js';
import type { InitiativeEntry, InitiativeState } from './types.js';

function entry(partial: Partial<InitiativeEntry> & { id: string }): InitiativeEntry {
  return {
    id: partial.id,
    tokenId: partial.tokenId ?? null,
    label: partial.label ?? partial.id,
    value: partial.value ?? 10,
  };
}

function state(partial: Partial<InitiativeState>): InitiativeState {
  return {
    order: partial.order ?? [],
    activeId: partial.activeId ?? null,
    round: partial.round ?? 0,
  };
}

describe('sortByValue', () => {
  it('sorts descending by value', () => {
    const a = entry({ id: 'a', value: 10 });
    const b = entry({ id: 'b', value: 20 });
    const c = entry({ id: 'c', value: 15 });
    expect(sortByValue([a, b, c]).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('is stable on ties', () => {
    const a = entry({ id: 'a', value: 10 });
    const b = entry({ id: 'b', value: 10 });
    const c = entry({ id: 'c', value: 10 });
    expect(sortByValue([a, b, c]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const a = entry({ id: 'a', value: 10 });
    const b = entry({ id: 'b', value: 20 });
    const input = [a, b];
    sortByValue(input);
    expect(input.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('advanceInitiative', () => {
  it('returns null when the order is empty', () => {
    expect(advanceInitiative(state({}))).toEqual({
      activeId: null,
      round: 0,
      wrapped: false,
    });
  });

  it('starts combat on the first entry when activeId is null', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = advanceInitiative(state({ order: [a, b] }));
    expect(result.activeId).toBe('a');
    expect(result.round).toBe(1);
  });

  it('advances to the next entry without wrapping', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = advanceInitiative(
      state({ order: [a, b], activeId: 'a', round: 1 }),
    );
    expect(result.activeId).toBe('b');
    expect(result.round).toBe(1);
    expect(result.wrapped).toBe(false);
  });

  it('wraps to the first entry and increments round', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = advanceInitiative(
      state({ order: [a, b], activeId: 'b', round: 1 }),
    );
    expect(result.activeId).toBe('a');
    expect(result.round).toBe(2);
    expect(result.wrapped).toBe(true);
  });

  it('recovers when activeId is stale', () => {
    const a = entry({ id: 'a', value: 20 });
    const result = advanceInitiative(
      state({ order: [a], activeId: 'gone', round: 3 }),
    );
    expect(result.activeId).toBe('a');
    expect(result.round).toBeGreaterThanOrEqual(1);
  });
});

describe('retreatInitiative', () => {
  it('returns null when the order is empty', () => {
    expect(retreatInitiative(state({}))).toEqual({
      activeId: null,
      round: 0,
      wrapped: false,
    });
  });

  it('moves to the previous entry without wrapping', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = retreatInitiative(
      state({ order: [a, b], activeId: 'b', round: 2 }),
    );
    expect(result.activeId).toBe('a');
    expect(result.round).toBe(2);
    expect(result.wrapped).toBe(false);
  });

  it('wraps to the last entry and decrements round (floor at 1)', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = retreatInitiative(
      state({ order: [a, b], activeId: 'a', round: 3 }),
    );
    expect(result.activeId).toBe('b');
    expect(result.round).toBe(2);
    expect(result.wrapped).toBe(true);
  });

  it('does not go below round 1', () => {
    const a = entry({ id: 'a', value: 20 });
    const b = entry({ id: 'b', value: 10 });
    const result = retreatInitiative(
      state({ order: [a, b], activeId: 'a', round: 1 }),
    );
    expect(result.round).toBe(1);
  });
});

describe('findEntryForToken', () => {
  it('returns the first entry linked to the token', () => {
    const a = entry({ id: 'a', tokenId: 'tok-1' });
    const b = entry({ id: 'b', tokenId: null });
    expect(findEntryForToken(state({ order: [a, b] }), 'tok-1')?.id).toBe('a');
  });

  it('returns null when no entry is linked', () => {
    const a = entry({ id: 'a', tokenId: null });
    expect(findEntryForToken(state({ order: [a] }), 'tok-1')).toBeNull();
  });
});
