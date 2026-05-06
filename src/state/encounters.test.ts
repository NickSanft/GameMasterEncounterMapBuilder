/**
 * Phase 180 — saved-encounter library tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveEncounter,
  listEncounters,
  getEncounter,
  deleteEncounter,
  instantiateEncounter,
  type EncounterPayload,
} from './encounters.js';
import { _resetDBForTests } from './idb.js';
import type { Token, Wall } from './types.js';

beforeEach(() => {
  _resetDBForTests();
});

function makeToken(id: string, label: string): Token {
  return {
    id,
    x: 0,
    y: 0,
    label,
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
  };
}

function makeWall(id: string): Wall {
  return {
    id,
    kind: 'segment',
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 0,
    blocksSight: true,
    blocksMovement: true,
  };
}

describe('saveEncounter / listEncounters (Phase 180)', () => {
  it('saves a new encounter with generated id + createdAt = updatedAt', async () => {
    const now = 1_700_000_000_000;
    const record = await saveEncounter(
      {
        name: 'Goblin Ambush',
        payload: { tokens: [makeToken('t1', 'Goblin')] },
      },
      { now },
    );
    expect(record.id).toBeTruthy();
    expect(record.name).toBe('Goblin Ambush');
    expect(record.createdAt).toBe(now);
    expect(record.updatedAt).toBe(now);
    expect(record.payload.tokens).toHaveLength(1);
  });

  it('updating an existing encounter preserves createdAt + bumps updatedAt', async () => {
    const created = await saveEncounter(
      { name: 'A', payload: { tokens: [] } },
      { now: 1_000_000 },
    );
    const updated = await saveEncounter(
      {
        id: created.id,
        name: 'A renamed',
        payload: { tokens: [makeToken('t1', 'X')] },
      },
      { now: 2_000_000 },
    );
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(1_000_000);
    expect(updated.updatedAt).toBe(2_000_000);
    expect(updated.name).toBe('A renamed');
  });

  it('listEncounters returns newest-first by updatedAt', async () => {
    await saveEncounter(
      { name: 'oldest', payload: { tokens: [] } },
      { now: 1_000 },
    );
    await saveEncounter(
      { name: 'middle', payload: { tokens: [] } },
      { now: 2_000 },
    );
    await saveEncounter(
      { name: 'newest', payload: { tokens: [] } },
      { now: 3_000 },
    );
    const list = await listEncounters();
    expect(list.map((e) => e.name)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('falls back to "Untitled encounter" for empty / whitespace name', async () => {
    const record = await saveEncounter({
      name: '   ',
      payload: { tokens: [] },
    });
    expect(record.name).toBe('Untitled encounter');
  });

  it('deep-copies tokens so caller mutations do not leak into storage', async () => {
    const tok = makeToken('t1', 'Goblin');
    const record = await saveEncounter({
      name: 'A',
      payload: { tokens: [tok] },
    });
    tok.label = 'Mutated';
    const fetched = await getEncounter(record.id);
    expect(fetched?.payload.tokens[0]!.label).toBe('Goblin');
  });

  it('persists optional walls when present', async () => {
    const record = await saveEncounter({
      name: 'with walls',
      payload: {
        tokens: [makeToken('t1', 'A')],
        walls: [makeWall('w1')],
      },
    });
    const fetched = await getEncounter(record.id);
    expect(fetched?.payload.walls).toHaveLength(1);
  });
});

describe('getEncounter / deleteEncounter (Phase 180)', () => {
  it('getEncounter returns null for an unknown id', async () => {
    expect(await getEncounter('not-a-real-id')).toBeNull();
  });

  it('deleteEncounter removes the record + leaves others intact', async () => {
    const a = await saveEncounter({ name: 'A', payload: { tokens: [] } });
    await saveEncounter({ name: 'B', payload: { tokens: [] } });
    await deleteEncounter(a.id);
    const remaining = await listEncounters();
    expect(remaining.map((e) => e.name)).toEqual(['B']);
  });

  it('deleteEncounter is a silent no-op for an unknown id', async () => {
    await saveEncounter({ name: 'A', payload: { tokens: [] } });
    await expect(deleteEncounter('ghost')).resolves.toBeUndefined();
    expect(await listEncounters()).toHaveLength(1);
  });
});

describe('instantiateEncounter (Phase 180)', () => {
  it('returns the same token shapes with fresh ids', () => {
    const payload: EncounterPayload = {
      tokens: [makeToken('orig-1', 'A'), makeToken('orig-2', 'B')],
    };
    const out = instantiateEncounter(payload);
    expect(out.tokens).toHaveLength(2);
    expect(out.tokens[0]!.id).not.toBe('orig-1');
    expect(out.tokens[1]!.id).not.toBe('orig-2');
    expect(out.tokens[0]!.label).toBe('A');
    expect(out.tokens[1]!.label).toBe('B');
  });

  it('does not include walls when payload has none', () => {
    const out = instantiateEncounter({ tokens: [makeToken('t1', 'X')] });
    expect(out.walls).toBeUndefined();
  });

  it('includes walls with fresh ids when payload has them', () => {
    const out = instantiateEncounter({
      tokens: [makeToken('t1', 'X')],
      walls: [makeWall('w-orig')],
    });
    expect(out.walls).toHaveLength(1);
    expect(out.walls![0]!.id).not.toBe('w-orig');
  });

  it('does NOT mutate the input payload (defensive copy)', () => {
    const payload: EncounterPayload = {
      tokens: [makeToken('t1', 'X')],
    };
    const originalId = payload.tokens[0]!.id;
    instantiateEncounter(payload);
    expect(payload.tokens[0]!.id).toBe(originalId);
  });

  it('produces unique ids across two consecutive instantiations', () => {
    const payload: EncounterPayload = {
      tokens: [makeToken('t1', 'X')],
    };
    const a = instantiateEncounter(payload);
    const b = instantiateEncounter(payload);
    expect(a.tokens[0]!.id).not.toBe(b.tokens[0]!.id);
  });
});
