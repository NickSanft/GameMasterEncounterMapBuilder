import { describe, it, expect } from 'vitest';
import {
  advanceInitiative,
  retreatInitiative,
  sortByValue,
  findEntryForToken,
  rollInitiativeForToken,
  rollInitiativeForUnlinkedTokens,
} from './initiative.js';
import type { InitiativeEntry, InitiativeState, Token } from './types.js';

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
    ownerId: partial.ownerId ?? null,
    auras: partial.auras ?? [],
  };
}

/** Deterministic RNG: yields the given fractional values in order, then loops. */
function seededRng(values: number[]) {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i++;
    return v;
  };
}

describe('rollInitiativeForToken', () => {
  it('produces 1d20 + initiativeMod', () => {
    // rng=0.95 → floor(0.95*20)+1 = 20; +mod 3 = 23.
    const t = token({ id: 'a', label: 'Rogue', initiativeMod: 3 });
    const e = rollInitiativeForToken(t, seededRng([0.95]));
    expect(e.value).toBe(23);
  });

  it('handles a negative modifier', () => {
    // rng=0.0 → floor(0.0*20)+1 = 1; +mod -2 = -1.
    const t = token({ id: 'a', initiativeMod: -2 });
    const e = rollInitiativeForToken(t, seededRng([0.0]));
    expect(e.value).toBe(-1);
  });

  it('defaults a missing initiativeMod to 0', () => {
    // Tokens loaded from a pre-Phase-69 save can have undefined here.
    const t = token({ id: 'a' });
    // @ts-expect-error — simulate a stale wire payload
    delete t.initiativeMod;
    const e = rollInitiativeForToken(t, seededRng([0.5]));
    // floor(0.5*20)+1 = 11, +0 = 11
    expect(e.value).toBe(11);
  });

  it('links the entry to the token id and copies the label', () => {
    const t = token({ id: 'tok-x', label: 'Goblin', initiativeMod: 1 });
    const e = rollInitiativeForToken(t, seededRng([0.5]));
    expect(e.tokenId).toBe('tok-x');
    expect(e.label).toBe('Goblin');
  });

  it('mints a fresh entry id every call (no collisions)', () => {
    const t = token({ id: 'a' });
    const e1 = rollInitiativeForToken(t, seededRng([0.5]));
    const e2 = rollInitiativeForToken(t, seededRng([0.5]));
    expect(e1.id).not.toBe(e2.id);
  });
});

describe('rollInitiativeForUnlinkedTokens', () => {
  it('rolls one entry per token NOT already in the order', () => {
    const tokens = [
      token({ id: 'tok-1', initiativeMod: 2 }),
      token({ id: 'tok-2', initiativeMod: -1 }),
      token({ id: 'tok-3', initiativeMod: 5 }),
    ];
    // tok-2 is already linked — skip it.
    const init = state({
      order: [entry({ id: 'e-2', tokenId: 'tok-2', value: 12 })],
    });
    // 0.05 → 2,  0.5 → 11,  0.95 → 20
    const fresh = rollInitiativeForUnlinkedTokens(
      tokens,
      init,
      seededRng([0.05, 0.95]),
    );
    expect(fresh).toHaveLength(2);
    expect(fresh[0]?.tokenId).toBe('tok-1'); // 2 + 2 = 4
    expect(fresh[0]?.value).toBe(4);
    expect(fresh[1]?.tokenId).toBe('tok-3'); // 20 + 5 = 25
    expect(fresh[1]?.value).toBe(25);
  });

  it('returns an empty array when every token is already linked', () => {
    const tokens = [token({ id: 'tok-1' })];
    const init = state({
      order: [entry({ id: 'e-1', tokenId: 'tok-1', value: 7 })],
    });
    expect(rollInitiativeForUnlinkedTokens(tokens, init)).toEqual([]);
  });

  it('returns an empty array when there are no tokens', () => {
    expect(rollInitiativeForUnlinkedTokens([], state({}))).toEqual([]);
  });

  it('ignores custom (non-token-linked) initiative entries', () => {
    // A custom "Lair action" entry has tokenId: null — that shouldn't
    // make any token count as "already linked".
    const tokens = [token({ id: 'tok-1' })];
    const init = state({
      order: [entry({ id: 'e-lair', tokenId: null, label: 'Lair', value: 20 })],
    });
    const fresh = rollInitiativeForUnlinkedTokens(
      tokens,
      init,
      seededRng([0.5]),
    );
    expect(fresh).toHaveLength(1);
    expect(fresh[0]?.tokenId).toBe('tok-1');
  });
});
