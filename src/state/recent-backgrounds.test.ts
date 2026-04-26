/**
 * Phase 108 — recent backgrounds tracker tests.
 *
 * Pure helper + localStorage-backed; the test setup wipes
 * localStorage between cases so each test starts clean.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordBackground,
  listRecent,
  forgetBackground,
  MAX_RECENT_BACKGROUNDS,
  _resetAll,
} from './recent-backgrounds.js';

beforeEach(() => {
  _resetAll();
});

describe('recent-backgrounds: record + list', () => {
  it('starts empty', () => {
    expect(listRecent()).toEqual([]);
  });

  it('records a single entry', () => {
    recordBackground('img-1', 'image/png', { name: 'map.png', now: 1000 });
    expect(listRecent()).toEqual([
      { imageId: 'img-1', mimeType: 'image/png', name: 'map.png', lastUsedAt: 1000 },
    ]);
  });

  it('orders newest-first', () => {
    recordBackground('a', 'image/png', { now: 1000 });
    recordBackground('b', 'image/png', { now: 2000 });
    recordBackground('c', 'image/png', { now: 3000 });
    expect(listRecent().map((e) => e.imageId)).toEqual(['c', 'b', 'a']);
  });

  it('returns a fresh array (caller mutations do not affect the store)', () => {
    recordBackground('img-1', 'image/png', { now: 1000 });
    const list = listRecent();
    list.push({
      imageId: 'mutate',
      mimeType: 'image/png',
      lastUsedAt: 0,
    });
    expect(listRecent()).toHaveLength(1);
  });

  it('records without a name when none is supplied', () => {
    recordBackground('img-1', 'image/png', { now: 1000 });
    const entry = listRecent()[0]!;
    expect(entry.name).toBeUndefined();
  });
});

describe('recent-backgrounds: deduplication', () => {
  it('moves an existing entry to the front instead of duplicating', () => {
    recordBackground('a', 'image/png', { now: 1000 });
    recordBackground('b', 'image/png', { now: 2000 });
    recordBackground('a', 'image/png', { now: 3000 });
    const ids = listRecent().map((e) => e.imageId);
    expect(ids).toEqual(['a', 'b']);
    // The newer record should also have the bumped lastUsedAt.
    expect(listRecent()[0]!.lastUsedAt).toBe(3000);
  });

  it('preserves the existing name when re-recording without a new name', () => {
    recordBackground('a', 'image/png', { name: 'castle.png', now: 1000 });
    recordBackground('a', 'image/png', { now: 2000 }); // no name on re-record
    expect(listRecent()[0]!.name).toBe('castle.png');
  });

  it('overrides the existing name when a new one is supplied', () => {
    recordBackground('a', 'image/png', { name: 'old.png', now: 1000 });
    recordBackground('a', 'image/png', { name: 'new.png', now: 2000 });
    expect(listRecent()[0]!.name).toBe('new.png');
  });
});

describe('recent-backgrounds: cap eviction', () => {
  it('caps at MAX_RECENT_BACKGROUNDS entries (oldest evicted)', () => {
    for (let i = 0; i < MAX_RECENT_BACKGROUNDS + 5; i++) {
      recordBackground(`img-${i}`, 'image/png', { now: 1000 + i });
    }
    const list = listRecent();
    expect(list).toHaveLength(MAX_RECENT_BACKGROUNDS);
    expect(list[0]!.imageId).toBe(`img-${MAX_RECENT_BACKGROUNDS + 4}`);
    expect(list[list.length - 1]!.imageId).toBe('img-5');
  });
});

describe('recent-backgrounds: forgetBackground', () => {
  it('drops the entry with the matching imageId', () => {
    recordBackground('a', 'image/png', { now: 1000 });
    recordBackground('b', 'image/png', { now: 2000 });
    forgetBackground('a');
    expect(listRecent().map((e) => e.imageId)).toEqual(['b']);
  });

  it('is a silent no-op for unknown ids', () => {
    recordBackground('a', 'image/png', { now: 1000 });
    expect(() => forgetBackground('does-not-exist')).not.toThrow();
    expect(listRecent().map((e) => e.imageId)).toEqual(['a']);
  });
});

describe('recent-backgrounds: edge cases', () => {
  it('ignores empty imageId', () => {
    recordBackground('', 'image/png', { now: 1000 });
    expect(listRecent()).toEqual([]);
  });
});

describe('recent-backgrounds: defensive parsing', () => {
  it('returns empty when localStorage holds malformed JSON', () => {
    localStorage.setItem('gm-encounter-maps-recent-backgrounds', '{not json');
    expect(listRecent()).toEqual([]);
  });

  it('returns empty when version mismatch', () => {
    localStorage.setItem(
      'gm-encounter-maps-recent-backgrounds',
      JSON.stringify({ version: 999, entries: [] }),
    );
    expect(listRecent()).toEqual([]);
  });

  it('drops entries missing required fields', () => {
    localStorage.setItem(
      'gm-encounter-maps-recent-backgrounds',
      JSON.stringify({
        version: 1,
        entries: [
          { imageId: 'good', mimeType: 'image/png', lastUsedAt: 1 },
          { mimeType: 'image/png', lastUsedAt: 1 }, // missing imageId
          { imageId: 'no-mime', lastUsedAt: 1 }, // missing mimeType
          { imageId: 'bad-name', mimeType: 'image/png', lastUsedAt: 1, name: 42 },
          'not-an-object',
        ],
      }),
    );
    const list = listRecent();
    expect(list).toHaveLength(1);
    expect(list[0]!.imageId).toBe('good');
  });
});
