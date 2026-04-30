import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  clearSnapshots,
  formatRelativeTime,
  MAX_SNAPSHOTS_PER_SCENE,
  MIN_INTERVAL_MS,
  _resetRateLimitForTests,
} from './snapshot-history.js';
import { _resetDBForTests } from './idb.js';
import { createDefaultState } from './types.js';
import { serializeState } from '../sync/messages.js';

beforeEach(() => {
  _resetDBForTests();
  _resetRateLimitForTests();
});

function makeSerializedState(label = 'A') {
  const state = createDefaultState();
  state.tokens.push({
    id: `t-${label}`,
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
  });
  return serializeState(state);
}

describe('recordSnapshot', () => {
  it('records the first snapshot for a scene', async () => {
    const s = makeSerializedState('A');
    const result = await recordSnapshot('scene-1', s, { now: 1000 });
    expect(result).not.toBeNull();
    expect(result!.sceneId).toBe('scene-1');
    expect(result!.takenAt).toBe(1000);
    expect(result!.id).toBeTruthy();
  });

  it('returns null when called too soon after the previous snapshot (rate-limit)', async () => {
    const s = makeSerializedState('A');
    await recordSnapshot('scene-1', s, { now: 1000 });
    const s2 = makeSerializedState('B'); // different state
    const result = await recordSnapshot('scene-1', s2, {
      now: 1000 + MIN_INTERVAL_MS - 1,
    });
    expect(result).toBeNull();
  });

  it('records again once MIN_INTERVAL_MS has elapsed', async () => {
    const s = makeSerializedState('A');
    await recordSnapshot('scene-1', s, { now: 1000 });
    const s2 = makeSerializedState('B');
    const result = await recordSnapshot('scene-1', s2, {
      now: 1000 + MIN_INTERVAL_MS,
    });
    expect(result).not.toBeNull();
  });

  it('returns null when state is byte-identical to the last (dedup)', async () => {
    const s = makeSerializedState('A');
    await recordSnapshot('scene-1', s, { now: 1000 });
    const result = await recordSnapshot('scene-1', s, {
      now: 1000 + MIN_INTERVAL_MS + 1,
    });
    expect(result).toBeNull();
  });

  it('rate-limits per-scene independently', async () => {
    const sA = makeSerializedState('A');
    const sB = makeSerializedState('B');
    await recordSnapshot('scene-1', sA, { now: 1000 });
    // scene-2 is fresh — even though `1500` is within MIN_INTERVAL_MS
    // of scene-1's snapshot, scene-2 has no prior snapshot, so it
    // records normally.
    const result = await recordSnapshot('scene-2', sB, { now: 1500 });
    expect(result).not.toBeNull();
  });

  it('evicts the oldest snapshot once over MAX_SNAPSHOTS_PER_SCENE', async () => {
    const interval = MIN_INTERVAL_MS;
    // Record one more than the cap, varying the state each time so
    // dedup doesn't drop them.
    for (let i = 0; i <= MAX_SNAPSHOTS_PER_SCENE; i++) {
      const distinct = makeSerializedState(`S${i}`);
      await recordSnapshot('scene-1', distinct, { now: 1000 + i * interval });
    }
    const list = await listSnapshots('scene-1');
    expect(list.length).toBe(MAX_SNAPSHOTS_PER_SCENE);
    // Oldest (S0) was evicted; newest (S{MAX}) is at the front.
    const labels = list.map((snap) => snap.state.tokens[0]!.label);
    expect(labels[0]).toBe(`S${MAX_SNAPSHOTS_PER_SCENE}`);
    expect(labels).not.toContain('S0');
  });
});

describe('listSnapshots', () => {
  it('returns empty for a scene with no snapshots', async () => {
    expect(await listSnapshots('scene-empty')).toEqual([]);
  });

  it('returns snapshots sorted newest-first', async () => {
    const interval = MIN_INTERVAL_MS;
    await recordSnapshot('scene-1', makeSerializedState('A'), { now: 1000 });
    await recordSnapshot('scene-1', makeSerializedState('B'), {
      now: 1000 + interval,
    });
    await recordSnapshot('scene-1', makeSerializedState('C'), {
      now: 1000 + 2 * interval,
    });
    const list = await listSnapshots('scene-1');
    expect(list.map((s) => s.state.tokens[0]!.label)).toEqual(['C', 'B', 'A']);
  });

  it('returns only snapshots for the requested scene', async () => {
    await recordSnapshot('scene-1', makeSerializedState('A'), { now: 1000 });
    await recordSnapshot('scene-2', makeSerializedState('B'), { now: 1500 });
    const list1 = await listSnapshots('scene-1');
    expect(list1.length).toBe(1);
    expect(list1[0]!.sceneId).toBe('scene-1');
  });
});

describe('getSnapshot + deleteSnapshot', () => {
  it('getSnapshot returns null for an unknown id', async () => {
    expect(await getSnapshot('missing')).toBeNull();
  });

  it('round-trips through put + get + delete', async () => {
    const recorded = await recordSnapshot('scene-1', makeSerializedState('A'), {
      now: 1000,
    });
    expect(recorded).not.toBeNull();
    const fetched = await getSnapshot(recorded!.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.sceneId).toBe('scene-1');

    await deleteSnapshot(recorded!.id);
    expect(await getSnapshot(recorded!.id)).toBeNull();
  });
});

describe('clearSnapshots', () => {
  it('removes every snapshot for a scene', async () => {
    const interval = MIN_INTERVAL_MS;
    await recordSnapshot('scene-1', makeSerializedState('A'), { now: 1000 });
    await recordSnapshot('scene-1', makeSerializedState('B'), {
      now: 1000 + interval,
    });
    await recordSnapshot('scene-2', makeSerializedState('Z'), { now: 1500 });
    await clearSnapshots('scene-1');
    expect(await listSnapshots('scene-1')).toEqual([]);
    // scene-2 untouched.
    expect((await listSnapshots('scene-2')).length).toBe(1);
  });

  it('is a no-op when the scene has no snapshots', async () => {
    await expect(clearSnapshots('empty-scene')).resolves.not.toThrow();
  });

  it('clears the per-scene rate-limit memo (next save records again)', async () => {
    await recordSnapshot('scene-1', makeSerializedState('A'), { now: 1000 });
    await clearSnapshots('scene-1');
    // Even though it's only 1 ms later, the memo was wiped, so the
    // next save records.
    const result = await recordSnapshot('scene-1', makeSerializedState('B'), {
      now: 1001,
    });
    expect(result).not.toBeNull();
  });
});

describe('formatRelativeTime', () => {
  it('< 30 s reads "just now"', () => {
    expect(formatRelativeTime(1000, 1000)).toBe('just now');
    expect(formatRelativeTime(1000, 5000)).toBe('just now');
  });

  it('30 s – 60 s reads "N seconds ago"', () => {
    expect(formatRelativeTime(1000, 31_000)).toBe('30 seconds ago');
    expect(formatRelativeTime(1000, 50_000)).toBe('49 seconds ago');
  });

  it('1 – 60 minutes', () => {
    expect(formatRelativeTime(0, 60_000)).toBe('1 minute ago');
    expect(formatRelativeTime(0, 5 * 60_000)).toBe('5 minutes ago');
    expect(formatRelativeTime(0, 59 * 60_000)).toBe('59 minutes ago');
  });

  it('1 – 24 hours', () => {
    expect(formatRelativeTime(0, 60 * 60_000)).toBe('1 hour ago');
    expect(formatRelativeTime(0, 3 * 60 * 60_000)).toBe('3 hours ago');
  });

  it('> 24 hours reads in days', () => {
    expect(formatRelativeTime(0, 24 * 60 * 60_000)).toBe('1 day ago');
    expect(formatRelativeTime(0, 3 * 24 * 60 * 60_000)).toBe('3 days ago');
  });

  it('future / NaN returns "—"', () => {
    expect(formatRelativeTime(1000, 500)).toBe('—');
    expect(formatRelativeTime(NaN, 1000)).toBe('—');
  });
});
