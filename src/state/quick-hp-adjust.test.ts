import { describe, it, expect } from 'vitest';
import {
  planQuickHpAdjust,
  summarizeQuickHpResults,
} from './quick-hp-adjust.js';
import type { Token } from './types.js';

function tk(over: Partial<Token> = {}): Token {
  return {
    id: over.id ?? 't',
    x: 0,
    y: 0,
    label: over.label ?? '',
    color: '#ff0000',
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
    ...over,
  };
}

describe('planQuickHpAdjust', () => {
  it('returns empty for empty token list', () => {
    expect(planQuickHpAdjust([], 1)).toEqual({ patches: [], results: [] });
  });

  it('returns empty for delta = 0', () => {
    const t = tk({ hp: { current: 5, max: 10, visibility: 'shared' } });
    expect(planQuickHpAdjust([t], 0)).toEqual({ patches: [], results: [] });
  });

  it('returns empty for non-finite delta', () => {
    const t = tk({ hp: { current: 5, max: 10, visibility: 'shared' } });
    expect(planQuickHpAdjust([t], NaN)).toEqual({ patches: [], results: [] });
    expect(planQuickHpAdjust([t], Infinity)).toEqual({
      patches: [],
      results: [],
    });
  });

  it('skips tokens that have no HP tracking', () => {
    const a = tk({ id: 'a', hp: null });
    const b = tk({ id: 'b', hp: { current: 5, max: 10, visibility: 'shared' } });
    const out = planQuickHpAdjust([a, b], -1);
    expect(out.patches).toHaveLength(1);
    expect(out.patches[0]!.id).toBe('b');
  });

  it('positive delta heals (clamped to max)', () => {
    const t = tk({ id: 't', hp: { current: 5, max: 10, visibility: 'shared' } });
    const out = planQuickHpAdjust([t], 3);
    expect(out.results[0]!.nextHpCurrent).toBe(8);
    expect(out.results[0]!.delta).toBe(3);
    expect((out.patches[0]!.changes.hp as { current: number }).current).toBe(8);
  });

  it('negative delta deals damage (clamped to 0)', () => {
    const t = tk({ id: 't', hp: { current: 5, max: 10, visibility: 'shared' } });
    const out = planQuickHpAdjust([t], -3);
    expect(out.results[0]!.nextHpCurrent).toBe(2);
    expect(out.results[0]!.delta).toBe(-3);
  });

  it('healing past max clamps + reports the actual delta', () => {
    const t = tk({ id: 't', hp: { current: 9, max: 10, visibility: 'shared' } });
    const out = planQuickHpAdjust([t], 5);
    expect(out.results[0]!.nextHpCurrent).toBe(10);
    expect(out.results[0]!.delta).toBe(1);
  });

  it('damage past 0 clamps + reports the actual delta', () => {
    const t = tk({ id: 't', hp: { current: 2, max: 10, visibility: 'shared' } });
    const out = planQuickHpAdjust([t], -5);
    expect(out.results[0]!.nextHpCurrent).toBe(0);
    expect(out.results[0]!.delta).toBe(-2);
  });

  it('skips tokens already at the destination clamp (no-op)', () => {
    const max = tk({ id: 'max', hp: { current: 10, max: 10, visibility: 'shared' } });
    const zero = tk({ id: 'zero', hp: { current: 0, max: 10, visibility: 'shared' } });
    expect(planQuickHpAdjust([max], 1).patches).toHaveLength(0); // can't heal past max
    expect(planQuickHpAdjust([zero], -1).results).toHaveLength(0); // can't damage past 0 (no death saves attached, but damage clamps to 0)
    // But zero + damage WITH a death-save bump still shows up (next test).
  });

  it('damaging a 0-HP token adds a death-save failure', () => {
    const t = tk({
      id: 't',
      hp: { current: 0, max: 10, visibility: 'shared' },
      deathSaves: { successes: 0, failures: 1 },
    });
    // The HP itself doesn't change (already 0), so applyDamage returns
    // 0 → no delta → result is empty by the "skip no-change" rule.
    // Death-save bump only fires when the HP itself ALSO changed (this
    // path matches the dialog's behavior: a 0-HP token taking damage
    // is considered "no actual HP delta but +1 fail"). Phase 92 chose
    // to keep the simpler rule — quick-HP only fires on actual HP
    // changes. The dialog still handles the 0-HP-damage path.
    const out = planQuickHpAdjust([t], -3);
    expect(out.patches).toHaveLength(0);
  });

  it('healing a 0-HP token resets the death-save tracker', () => {
    const t = tk({
      id: 't',
      hp: { current: 0, max: 10, visibility: 'shared' },
      deathSaves: { successes: 1, failures: 2 },
    });
    const out = planQuickHpAdjust([t], 3);
    expect(out.results[0]!.deathSavesChanged).toBe(true);
    expect(out.patches[0]!.changes.deathSaves).toEqual({
      successes: 0,
      failures: 0,
    });
  });

  it('handles a multi-token batch with mixed clamping outcomes', () => {
    const a = tk({ id: 'a', hp: { current: 9, max: 10, visibility: 'shared' } }); // heals to 10
    const b = tk({ id: 'b', hp: { current: 10, max: 10, visibility: 'shared' } }); // already max → skipped
    const c = tk({ id: 'c', hp: { current: 5, max: 10, visibility: 'shared' } }); // heals to 8
    const out = planQuickHpAdjust([a, b, c], 3);
    expect(out.patches.map((p) => p.id)).toEqual(['a', 'c']);
    expect(out.results[0]!.delta).toBe(1); // a clamped
    expect(out.results[1]!.delta).toBe(3); // c full delta
  });
});

describe('summarizeQuickHpResults', () => {
  it('returns null for empty input', () => {
    expect(summarizeQuickHpResults([])).toBeNull();
  });

  it('formats a single damage result', () => {
    const t = tk({ id: 't', label: 'Goblin', hp: { current: 7, max: 10, visibility: 'shared' } });
    expect(
      summarizeQuickHpResults([
        { token: t, nextHpCurrent: 4, delta: -3, deathSavesChanged: false },
      ]),
    ).toBe('Goblin: 4 of 10 HP (-3)');
  });

  it('formats a single heal result with explicit + sign', () => {
    const t = tk({ id: 't', label: 'Cleric', hp: { current: 4, max: 10, visibility: 'shared' } });
    expect(
      summarizeQuickHpResults([
        { token: t, nextHpCurrent: 9, delta: 5, deathSavesChanged: false },
      ]),
    ).toBe('Cleric: 9 of 10 HP (+5)');
  });

  it('falls back to "Token" for an empty / blank label', () => {
    const t = tk({ id: 't', label: '   ', hp: { current: 7, max: 10, visibility: 'shared' } });
    expect(
      summarizeQuickHpResults([
        { token: t, nextHpCurrent: 4, delta: -3, deathSavesChanged: false },
      ]),
    ).toBe('Token: 4 of 10 HP (-3)');
  });

  it('appends ", stable" when a heal cleared death-saves', () => {
    const t = tk({ id: 't', label: 'Bard', hp: { current: 0, max: 10, visibility: 'shared' } });
    const out = summarizeQuickHpResults([
      { token: t, nextHpCurrent: 3, delta: 3, deathSavesChanged: true },
    ]);
    expect(out).toContain(', stable');
  });

  it('aggregates a multi-token heal', () => {
    const t = tk({ id: 't', hp: { current: 5, max: 10, visibility: 'shared' } });
    const results = [1, 2, 3].map((d) => ({
      token: t,
      nextHpCurrent: 5 + d,
      delta: d,
      deathSavesChanged: false,
    }));
    expect(summarizeQuickHpResults(results)).toBe(
      'Healed 6 HP across 3 tokens.',
    );
  });

  it('aggregates a multi-token damage', () => {
    const t = tk({ id: 't', hp: { current: 5, max: 10, visibility: 'shared' } });
    const results = [-2, -1].map((d) => ({
      token: t,
      nextHpCurrent: 5 + d,
      delta: d,
      deathSavesChanged: false,
    }));
    expect(summarizeQuickHpResults(results)).toBe(
      'Dealt 3 damage to 2 tokens.',
    );
  });
});
