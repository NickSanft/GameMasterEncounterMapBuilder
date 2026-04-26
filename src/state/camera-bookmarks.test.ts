/**
 * Phase 102 — camera bookmarks store tests.
 *
 * Pure module + localStorage-backed; the test setup wipes
 * localStorage between cases so each test starts clean.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addBookmark,
  updateBookmark,
  removeBookmark,
  forgetScene,
  listBookmarks,
  pickBookmarkSlot,
  MAX_BOOKMARKS_PER_SCENE,
  _resetAll,
} from './camera-bookmarks.js';

beforeEach(() => {
  _resetAll();
});

const cam = (x: number, y: number, zoom = 1) => ({ x, y, zoom });

describe('camera-bookmarks: add + list', () => {
  it('starts empty for any scene', () => {
    expect(listBookmarks('scene-a')).toEqual([]);
  });

  it('persists a new bookmark + returns it', () => {
    const entry = addBookmark('scene-a', 'Throne room', cam(100, 200, 1.5));
    expect(entry.id).toBeTruthy();
    expect(entry.sceneId).toBe('scene-a');
    expect(entry.name).toBe('Throne room');
    expect(entry.camera).toEqual({ x: 100, y: 200, zoom: 1.5 });
    expect(listBookmarks('scene-a')).toHaveLength(1);
  });

  it('orders newest-first', () => {
    addBookmark('scene-a', 'First', cam(1, 1), 1000);
    addBookmark('scene-a', 'Second', cam(2, 2), 2000);
    addBookmark('scene-a', 'Third', cam(3, 3), 3000);
    expect(listBookmarks('scene-a').map((e) => e.name)).toEqual([
      'Third',
      'Second',
      'First',
    ]);
  });

  it('scopes by scene — bookmarks for scene-a do not appear in scene-b', () => {
    addBookmark('scene-a', 'A1', cam(1, 1), 1000);
    addBookmark('scene-a', 'A2', cam(2, 2), 2000);
    addBookmark('scene-b', 'B1', cam(10, 10), 3000);
    expect(listBookmarks('scene-a').map((e) => e.name)).toEqual(['A2', 'A1']);
    expect(listBookmarks('scene-b').map((e) => e.name)).toEqual(['B1']);
  });

  it('falls back to "Untitled bookmark" when name is blank', () => {
    const entry = addBookmark('scene-a', '   ', cam(0, 0));
    expect(entry.name).toBe('Untitled bookmark');
  });

  it('trims whitespace from supplied names', () => {
    const entry = addBookmark('scene-a', '  Library  ', cam(0, 0));
    expect(entry.name).toBe('Library');
  });
});

describe('camera-bookmarks: update + remove', () => {
  it('renames a bookmark', () => {
    const entry = addBookmark('scene-a', 'Old name', cam(0, 0));
    updateBookmark(entry.id, { name: 'New name' });
    expect(listBookmarks('scene-a')[0]!.name).toBe('New name');
  });

  it('updates the camera', () => {
    const entry = addBookmark('scene-a', 'Bookmark', cam(0, 0));
    updateBookmark(entry.id, { camera: cam(99, 99, 4) });
    expect(listBookmarks('scene-a')[0]!.camera).toEqual({
      x: 99,
      y: 99,
      zoom: 4,
    });
  });

  it('keeps existing name when the new name is empty / whitespace', () => {
    const entry = addBookmark('scene-a', 'Keep me', cam(0, 0));
    updateBookmark(entry.id, { name: '   ' });
    expect(listBookmarks('scene-a')[0]!.name).toBe('Keep me');
  });

  it('update on unknown id is a silent no-op', () => {
    addBookmark('scene-a', 'Real', cam(0, 0));
    expect(() => updateBookmark('nope', { name: 'X' })).not.toThrow();
    expect(listBookmarks('scene-a')[0]!.name).toBe('Real');
  });

  it('removeBookmark drops the entry', () => {
    const a = addBookmark('scene-a', 'A', cam(0, 0));
    addBookmark('scene-a', 'B', cam(1, 1));
    removeBookmark(a.id);
    expect(listBookmarks('scene-a').map((e) => e.name)).toEqual(['B']);
  });

  it('remove on unknown id is a silent no-op', () => {
    addBookmark('scene-a', 'A', cam(0, 0));
    expect(() => removeBookmark('nope')).not.toThrow();
    expect(listBookmarks('scene-a')).toHaveLength(1);
  });
});

describe('camera-bookmarks: forgetScene', () => {
  it('drops all bookmarks for a scene + leaves others alone', () => {
    addBookmark('scene-a', 'A1', cam(0, 0));
    addBookmark('scene-a', 'A2', cam(1, 1));
    addBookmark('scene-b', 'B1', cam(2, 2));
    forgetScene('scene-a');
    expect(listBookmarks('scene-a')).toEqual([]);
    expect(listBookmarks('scene-b').map((e) => e.name)).toEqual(['B1']);
  });

  it('forgetScene with no matches is a silent no-op', () => {
    addBookmark('scene-a', 'A', cam(0, 0));
    expect(() => forgetScene('does-not-exist')).not.toThrow();
    expect(listBookmarks('scene-a')).toHaveLength(1);
  });
});

describe('camera-bookmarks: pickBookmarkSlot', () => {
  it('returns the Nth newest bookmark for the scene', () => {
    addBookmark('scene-a', 'First', cam(1, 1), 1000);
    addBookmark('scene-a', 'Second', cam(2, 2), 2000);
    addBookmark('scene-a', 'Third', cam(3, 3), 3000);
    expect(pickBookmarkSlot('scene-a', 1)!.name).toBe('Third');
    expect(pickBookmarkSlot('scene-a', 2)!.name).toBe('Second');
    expect(pickBookmarkSlot('scene-a', 3)!.name).toBe('First');
  });

  it('returns null for empty slots', () => {
    addBookmark('scene-a', 'Only', cam(0, 0));
    expect(pickBookmarkSlot('scene-a', 2)).toBeNull();
  });

  it('returns null for invalid slot numbers', () => {
    addBookmark('scene-a', 'Only', cam(0, 0));
    expect(pickBookmarkSlot('scene-a', 0)).toBeNull();
    expect(pickBookmarkSlot('scene-a', -1)).toBeNull();
    expect(pickBookmarkSlot('scene-a', NaN)).toBeNull();
  });

  it('only considers the requested scene', () => {
    addBookmark('scene-a', 'A', cam(0, 0));
    addBookmark('scene-b', 'B', cam(1, 1));
    expect(pickBookmarkSlot('scene-a', 1)!.name).toBe('A');
    expect(pickBookmarkSlot('scene-b', 1)!.name).toBe('B');
  });
});

describe('camera-bookmarks: cap eviction', () => {
  it('evicts oldest entries past MAX_BOOKMARKS_PER_SCENE per scene', () => {
    for (let i = 0; i < MAX_BOOKMARKS_PER_SCENE + 5; i++) {
      addBookmark('scene-a', `B${i}`, cam(i, i), 1000 + i);
    }
    const list = listBookmarks('scene-a');
    expect(list).toHaveLength(MAX_BOOKMARKS_PER_SCENE);
    // Newest is B(N+4), oldest kept is B5 (B0..B4 evicted).
    expect(list[0]!.name).toBe(`B${MAX_BOOKMARKS_PER_SCENE + 4}`);
    expect(list[list.length - 1]!.name).toBe('B5');
  });

  it('eviction is per-scene (other scenes are not touched)', () => {
    for (let i = 0; i < MAX_BOOKMARKS_PER_SCENE + 3; i++) {
      addBookmark('scene-a', `A${i}`, cam(0, 0), 1000 + i);
    }
    addBookmark('scene-b', 'B-only', cam(0, 0));
    expect(listBookmarks('scene-a')).toHaveLength(MAX_BOOKMARKS_PER_SCENE);
    expect(listBookmarks('scene-b')).toHaveLength(1);
  });
});

describe('camera-bookmarks: defensive parsing', () => {
  it('returns empty when localStorage holds malformed JSON', () => {
    localStorage.setItem('gm-encounter-maps-camera-bookmarks', '{not json');
    expect(listBookmarks('scene-a')).toEqual([]);
  });

  it('returns empty when version mismatch', () => {
    localStorage.setItem(
      'gm-encounter-maps-camera-bookmarks',
      JSON.stringify({ version: 999, entries: [] }),
    );
    expect(listBookmarks('scene-a')).toEqual([]);
  });

  it('drops entries missing required fields', () => {
    localStorage.setItem(
      'gm-encounter-maps-camera-bookmarks',
      JSON.stringify({
        version: 1,
        entries: [
          { id: 'good', sceneId: 'scene-a', name: 'OK', createdAt: 1, camera: { x: 0, y: 0, zoom: 1 } },
          { id: 'bad-no-camera', sceneId: 'scene-a', name: 'X', createdAt: 1 },
          { id: 'bad-bad-zoom', sceneId: 'scene-a', name: 'X', createdAt: 1, camera: { x: 0, y: 0, zoom: 0 } },
          { id: 'bad-non-finite', sceneId: 'scene-a', name: 'X', createdAt: 1, camera: { x: NaN, y: 0, zoom: 1 } },
          'not-an-object',
        ],
      }),
    );
    const list = listBookmarks('scene-a');
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe('good');
  });
});
