import { describe, it, expect, beforeEach } from 'vitest';
import {
  noteSceneActivated,
  forgetScene,
  orderByRecency,
  pickRecent,
  _peekRecents,
  _resetRecents,
} from './scene-recents.js';

beforeEach(() => {
  _resetRecents();
});

describe('noteSceneActivated', () => {
  it('records the timestamp for a new scene', () => {
    noteSceneActivated('a', 100);
    expect(_peekRecents()).toEqual({ a: 100 });
  });

  it('overwrites the timestamp on re-activation', () => {
    noteSceneActivated('a', 100);
    noteSceneActivated('a', 200);
    expect(_peekRecents()).toEqual({ a: 200 });
  });

  it('preserves entries for other scenes', () => {
    noteSceneActivated('a', 100);
    noteSceneActivated('b', 150);
    noteSceneActivated('c', 200);
    expect(_peekRecents()).toEqual({ a: 100, b: 150, c: 200 });
  });

  it('ignores empty / falsy ids', () => {
    noteSceneActivated('', 100);
    expect(_peekRecents()).toEqual({});
  });

  it('prunes to 32 entries when the map grows past the cap', () => {
    // Insert 40 entries with monotonically increasing timestamps.
    for (let i = 0; i < 40; i++) {
      noteSceneActivated(`scene-${i}`, 100 + i);
    }
    const map = _peekRecents();
    expect(Object.keys(map).length).toBe(32);
    // The 8 oldest (scene-0 ... scene-7) should be evicted.
    for (let i = 0; i < 8; i++) {
      expect(map[`scene-${i}`]).toBeUndefined();
    }
    for (let i = 8; i < 40; i++) {
      expect(map[`scene-${i}`]).toBe(100 + i);
    }
  });
});

describe('forgetScene', () => {
  it('removes the entry for the given id', () => {
    noteSceneActivated('a', 100);
    noteSceneActivated('b', 200);
    forgetScene('a');
    expect(_peekRecents()).toEqual({ b: 200 });
  });

  it('is a no-op for an id that was never recorded', () => {
    noteSceneActivated('a', 100);
    forgetScene('nonexistent');
    expect(_peekRecents()).toEqual({ a: 100 });
  });
});

describe('orderByRecency', () => {
  const scenes = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
  ];

  it('orders by descending timestamp', () => {
    const recents = { a: 100, b: 300, c: 200 };
    const result = orderByRecency(scenes, recents);
    expect(result.map((s) => s.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('puts never-activated scenes at the end in input order', () => {
    const recents = { c: 100 };
    const result = orderByRecency(scenes, recents);
    // c (the only ranked one) first; a, b, d follow in input order.
    expect(result.map((s) => s.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('handles an empty recents map (input order preserved)', () => {
    const result = orderByRecency(scenes, {});
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles an empty scene list', () => {
    expect(orderByRecency([], { a: 100 })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const recents = { d: 999 };
    const before = scenes.map((s) => s.id);
    orderByRecency(scenes, recents);
    expect(scenes.map((s) => s.id)).toEqual(before);
  });
});

describe('pickRecent', () => {
  const scenes = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
  ];

  it('picks the Nth most-recent scene (1-indexed)', () => {
    const recents = { a: 100, b: 300, c: 200, d: 50 };
    expect(pickRecent(scenes, 1, null, recents)?.id).toBe('b');
    expect(pickRecent(scenes, 2, null, recents)?.id).toBe('c');
    expect(pickRecent(scenes, 3, null, recents)?.id).toBe('a');
    expect(pickRecent(scenes, 4, null, recents)?.id).toBe('d');
  });

  it('excludes the given excludeId (typically the current scene)', () => {
    const recents = { a: 100, b: 300, c: 200 };
    // Without excluding, slot 1 would be `b`. With excludeId='b', slot 1 should be `c`.
    expect(pickRecent(scenes, 1, 'b', recents)?.id).toBe('c');
    expect(pickRecent(scenes, 2, 'b', recents)?.id).toBe('a');
  });

  it('returns null when the slot is empty', () => {
    const recents = { a: 100 };
    expect(pickRecent([{ id: 'a', name: 'A' }], 1, 'a', recents)).toBeNull();
    expect(pickRecent(scenes, 99, null, recents)).toBeNull();
  });

  it('returns null for invalid n', () => {
    const recents = { a: 100 };
    expect(pickRecent(scenes, 0, null, recents)).toBeNull();
    expect(pickRecent(scenes, -1, null, recents)).toBeNull();
    expect(pickRecent(scenes, Number.NaN, null, recents)).toBeNull();
  });

  it('falls back to input order for never-activated slots', () => {
    // No recents → ordering matches input. With excludeId='a',
    // slot 1 should be 'b' (the next in input order).
    expect(pickRecent(scenes, 1, 'a', {})?.id).toBe('b');
    expect(pickRecent(scenes, 2, 'a', {})?.id).toBe('c');
    expect(pickRecent(scenes, 3, 'a', {})?.id).toBe('d');
  });
});
