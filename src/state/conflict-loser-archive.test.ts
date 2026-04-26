import { describe, it, expect } from 'vitest';
import {
  createConflictLoserArchive,
  KEY,
  MAX_ARCHIVED,
  TTL_MS,
} from './conflict-loser-archive.js';
import { createDefaultState } from './types.js';
import { serializeState } from '../sync/messages.js';

function makeMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    /** Test inspector. */
    _peek: (k: string) => map.get(k),
    _size: () => map.size,
  };
}

function sampleState() {
  return serializeState(createDefaultState());
}

describe('createConflictLoserArchive', () => {
  it('starts with no entries on a fresh storage', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    expect(archive.listFresh()).toEqual([]);
  });

  it('record() pushes + persists to storage', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    const recorded = archive.record(sampleState(), { now: 1000 });
    expect(recorded.id).toBeTruthy();
    expect(recorded.recordedAt).toBe(1000);
    // Persisted to the right key.
    const raw = storage._peek(KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).entries).toHaveLength(1);
  });

  it('listFresh() returns entries newest-first', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    archive.record(sampleState(), { now: 1000 });
    archive.record(sampleState(), { now: 2000 });
    archive.record(sampleState(), { now: 3000 });
    const list = archive.listFresh(3500);
    expect(list.map((e) => e.recordedAt)).toEqual([3000, 2000, 1000]);
  });

  it('listFresh() filters out entries past TTL', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    archive.record(sampleState(), { now: 1000 });
    archive.record(sampleState(), { now: 1000 + TTL_MS + 1 });
    // At "now = 1000 + TTL + 100", the first entry is past TTL but
    // the second is still fresh.
    const list = archive.listFresh(1000 + TTL_MS + 100);
    expect(list.length).toBe(1);
    expect(list[0]!.recordedAt).toBe(1000 + TTL_MS + 1);
  });

  it('record() evicts past-TTL entries on write', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    archive.record(sampleState(), { now: 1000 });
    // After TTL elapses + a new record, the old one is gone from disk.
    archive.record(sampleState(), { now: 1000 + TTL_MS + 1 });
    const persisted = JSON.parse(storage._peek(KEY)!).entries;
    expect(persisted.length).toBe(1);
    expect(persisted[0].recordedAt).toBe(1000 + TTL_MS + 1);
  });

  it('record() caps at MAX_ARCHIVED, evicting oldest first', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    for (let i = 0; i <= MAX_ARCHIVED; i++) {
      archive.record(sampleState(), { now: 1000 + i });
    }
    const list = archive.listFresh(2000);
    expect(list.length).toBe(MAX_ARCHIVED);
    // Newest is the last we recorded.
    expect(list[0]!.recordedAt).toBe(1000 + MAX_ARCHIVED);
    // Oldest still present is the SECOND we recorded (the very first
    // got evicted).
    expect(list[list.length - 1]!.recordedAt).toBe(1001);
  });

  it('uses the provided reason / falls back to a default', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    const a = archive.record(sampleState());
    expect(a.reason).toBe("Adopted other tab's state");
    const b = archive.record(sampleState(), { reason: 'Custom path' });
    expect(b.reason).toBe('Custom path');
  });

  it('get() looks up by id (regardless of TTL)', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    const a = archive.record(sampleState(), { now: 1000 });
    expect(archive.get(a.id)?.recordedAt).toBe(1000);
    expect(archive.get('ghost')).toBeNull();
  });

  it('remove() drops a single entry', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    const a = archive.record(sampleState(), { now: 1000 });
    archive.record(sampleState(), { now: 2000 });
    archive.remove(a.id);
    const list = archive.listFresh(2500);
    expect(list.length).toBe(1);
    expect(list[0]!.recordedAt).toBe(2000);
  });

  it('remove() of an unknown id is a no-op', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    archive.record(sampleState(), { now: 1000 });
    archive.remove('ghost');
    expect(archive.listFresh(1500).length).toBe(1);
  });

  it('clear() forgets every entry', () => {
    const storage = makeMemoryStorage();
    const archive = createConflictLoserArchive({ storage });
    archive.record(sampleState());
    archive.record(sampleState());
    archive.clear();
    expect(archive.listFresh()).toEqual([]);
    expect(storage._peek(KEY)).toBeUndefined();
  });

  it('drops malformed persisted state on read', () => {
    const storage = makeMemoryStorage();
    storage.setItem(KEY, '{not json');
    const archive = createConflictLoserArchive({ storage });
    expect(archive.listFresh()).toEqual([]);
  });

  it('drops a wrong-version blob (forward-compat safety)', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      KEY,
      JSON.stringify({ version: 99, entries: [{}, {}] }),
    );
    const archive = createConflictLoserArchive({ storage });
    expect(archive.listFresh()).toEqual([]);
  });

  it('drops entries missing required fields', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        entries: [
          { id: 'ok', recordedAt: 1000, state: {}, reason: 'x' },
          { id: '', recordedAt: 1000, state: {} }, // empty id → dropped
          { id: 'no-recordedAt', state: {} }, // missing recordedAt → dropped
          { id: 'no-state', recordedAt: 1000 }, // missing state → dropped
        ],
      }),
    );
    const archive = createConflictLoserArchive({ storage });
    const list = archive.listFresh(2000);
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe('ok');
  });
});
