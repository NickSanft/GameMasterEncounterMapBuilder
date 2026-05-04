/**
 * Phase 123 — bulk-token-edit helper tests.
 */
import { describe, it, expect } from 'vitest';
import {
  bulkSetHpMax,
  bulkAddCondition,
  bulkRemoveCondition,
  countAffected,
} from './bulk-token-edit.js';
import type { Token } from './types.js';

function tk(over: Partial<Token> = {}): Token {
  return {
    id: over.id ?? 't-' + Math.random().toString(36).slice(2),
    x: over.x ?? 0,
    y: over.y ?? 0,
    label: over.label ?? '',
    color: over.color ?? '#888',
    imageId: over.imageId ?? null,
    size: over.size ?? 1,
    borderColor: over.borderColor ?? null,
    hp: over.hp ?? null,
    conditions: over.conditions ?? [],
    rotation: over.rotation ?? 0,
    losRadius: over.losRadius ?? null,
    light: over.light ?? null,
    initiativeMod: over.initiativeMod ?? 0,
    conditionExpirations: over.conditionExpirations ?? {},
    deathSaves: over.deathSaves ?? { successes: 0, failures: 0 },
    ownerId: over.ownerId ?? null,
    auras: over.auras ?? [],
  };
}

describe('bulkSetHpMax', () => {
  it('sets max for every selected hp-bearing token', () => {
    const tokens = [
      tk({ id: 'a', hp: { current: 8, max: 10, visibility: 'shared' } }),
      tk({ id: 'b', hp: { current: 5, max: 10, visibility: 'shared' } }),
      tk({ id: 'c', hp: { current: 3, max: 4, visibility: 'shared' } }),
    ];
    const ops = bulkSetHpMax(tokens, new Set(['a', 'b']), 12);
    expect(ops).toHaveLength(2);
    expect(ops[0]!.changes.hp).toEqual({ current: 8, max: 12, visibility: 'shared' });
    expect(ops[1]!.changes.hp).toEqual({ current: 5, max: 12, visibility: 'shared' });
  });

  it('clamps current down when new max is below it', () => {
    const tokens = [
      tk({ id: 'a', hp: { current: 8, max: 10, visibility: 'shared' } }),
    ];
    const ops = bulkSetHpMax(tokens, new Set(['a']), 6);
    expect(ops[0]!.changes.hp).toEqual({ current: 6, max: 6, visibility: 'shared' });
  });

  it('skips tokens without HP tracking', () => {
    const tokens = [
      tk({ id: 'a', hp: null }),
      tk({ id: 'b', hp: { current: 5, max: 5, visibility: 'shared' } }),
    ];
    const ops = bulkSetHpMax(tokens, new Set(['a', 'b']), 10);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.tokenId).toBe('b');
  });

  it('skips tokens already at the target max with current <= target', () => {
    const tokens = [
      tk({ id: 'a', hp: { current: 5, max: 10, visibility: 'shared' } }),
      tk({ id: 'b', hp: { current: 7, max: 10, visibility: 'shared' } }),
    ];
    const ops = bulkSetHpMax(tokens, new Set(['a', 'b']), 10);
    expect(ops).toHaveLength(0);
  });

  it('skips unselected tokens entirely', () => {
    const tokens = [
      tk({ id: 'a', hp: { current: 5, max: 10, visibility: 'shared' } }),
      tk({ id: 'b', hp: { current: 5, max: 10, visibility: 'shared' } }),
    ];
    const ops = bulkSetHpMax(tokens, new Set(['a']), 12);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.tokenId).toBe('a');
  });

  it('rejects non-finite or negative max', () => {
    const tokens = [
      tk({ id: 'a', hp: { current: 5, max: 10, visibility: 'shared' } }),
    ];
    expect(bulkSetHpMax(tokens, new Set(['a']), NaN)).toEqual([]);
    expect(bulkSetHpMax(tokens, new Set(['a']), -1)).toEqual([]);
  });
});

describe('bulkAddCondition', () => {
  it('adds the condition to selected tokens that do not yet have it', () => {
    const tokens = [
      tk({ id: 'a', conditions: [] }),
      tk({ id: 'b', conditions: ['poisoned'] }),
      tk({ id: 'c', conditions: [] }),
    ];
    const ops = bulkAddCondition(tokens, new Set(['a', 'b']), 'poisoned');
    expect(ops).toHaveLength(1);
    expect(ops[0]!.tokenId).toBe('a');
    expect(ops[0]!.changes.conditions).toEqual(['poisoned']);
  });

  it('skips empty conditionId', () => {
    const tokens = [tk({ id: 'a' })];
    expect(bulkAddCondition(tokens, new Set(['a']), '')).toEqual([]);
  });

  it('skips unselected tokens', () => {
    const tokens = [tk({ id: 'a' }), tk({ id: 'b' })];
    const ops = bulkAddCondition(tokens, new Set(['a']), 'stunned');
    expect(ops).toHaveLength(1);
    expect(ops[0]!.tokenId).toBe('a');
  });
});

describe('bulkRemoveCondition', () => {
  it('removes the condition + clears its expiration timer when set', () => {
    const tokens = [
      tk({
        id: 'a',
        conditions: ['poisoned', 'stunned'],
        conditionExpirations: { poisoned: 5, stunned: 7 },
      }),
      tk({ id: 'b', conditions: ['poisoned'], conditionExpirations: {} }),
      tk({ id: 'c', conditions: [], conditionExpirations: {} }),
    ];
    const ops = bulkRemoveCondition(tokens, new Set(['a', 'b', 'c']), 'poisoned');
    expect(ops).toHaveLength(2);

    const aOp = ops.find((o) => o.tokenId === 'a')!;
    expect(aOp.changes.conditions).toEqual(['stunned']);
    expect(aOp.changes.conditionExpirations).toEqual({ stunned: 7 });

    const bOp = ops.find((o) => o.tokenId === 'b')!;
    expect(bOp.changes.conditions).toEqual([]);
    // No expiration was set for poisoned on 'b'; the changes should
    // NOT include conditionExpirations.
    expect(bOp.changes.conditionExpirations).toBeUndefined();
  });

  it('skips tokens that do not have the condition', () => {
    const tokens = [tk({ id: 'a', conditions: [] })];
    expect(bulkRemoveCondition(tokens, new Set(['a']), 'poisoned')).toEqual([]);
  });

  it('skips empty conditionId', () => {
    const tokens = [tk({ id: 'a', conditions: ['poisoned'] })];
    expect(bulkRemoveCondition(tokens, new Set(['a']), '')).toEqual([]);
  });
});

describe('countAffected', () => {
  it('returns the ops length', () => {
    expect(countAffected([])).toBe(0);
    expect(
      countAffected([
        { tokenId: 'a', changes: {} },
        { tokenId: 'b', changes: {} },
      ]),
    ).toBe(2);
  });
});
