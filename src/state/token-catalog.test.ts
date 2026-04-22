import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveTokenToLibrary,
  listLibraryTokens,
  getLibraryToken,
  deleteLibraryToken,
  tokenFromCatalogEntry,
} from './token-catalog.js';
import { _resetDBForTests } from './idb.js';
import type { Token } from './types.js';

const sample: Token = {
  id: 'tok-abc',
  x: 3,
  y: 4,
  label: 'Goblin',
  color: '#44cc66',
  imageId: 'img-1',
  size: 1,
  borderColor: '#ffaa00',
  hp: null,
  conditions: [],
  rotation: 0,
  losRadius: null,
};

beforeEach(() => {
  _resetDBForTests();
});

describe('token-catalog', () => {
  it('saves and lists a token', async () => {
    const id = await saveTokenToLibrary(sample);
    const list = await listLibraryTokens();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(id);
    expect(list[0]!.label).toBe('Goblin');
    expect(list[0]!.imageId).toBe('img-1');
    expect(list[0]!.borderColor).toBe('#ffaa00');
  });

  it('returns a newly created entry via getLibraryToken', async () => {
    const id = await saveTokenToLibrary(sample);
    const entry = await getLibraryToken(id);
    expect(entry?.color).toBe('#44cc66');
  });

  it('sorts entries newest first', async () => {
    const a = await saveTokenToLibrary({ ...sample, label: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await saveTokenToLibrary({ ...sample, label: 'B' });
    const list = await listLibraryTokens();
    expect(list.map((e) => e.id)).toEqual([b, a]);
  });

  it('deletes a token from the library', async () => {
    const id = await saveTokenToLibrary(sample);
    await deleteLibraryToken(id);
    const list = await listLibraryTokens();
    expect(list).toHaveLength(0);
    const missing = await getLibraryToken(id);
    expect(missing).toBeNull();
  });

  it('materializes a catalog entry into a new token at given cell', async () => {
    const id = await saveTokenToLibrary(sample);
    const entry = (await getLibraryToken(id))!;
    const placed = tokenFromCatalogEntry(entry, 7, 9);
    expect(placed.x).toBe(7);
    expect(placed.y).toBe(9);
    expect(placed.label).toBe('Goblin');
    expect(placed.size).toBe(1);
    expect(placed.imageId).toBe('img-1');
    expect(placed.borderColor).toBe('#ffaa00');
    // Fresh id, not the saved entry's id
    expect(placed.id).not.toBe(id);
    expect(placed.id).not.toBe(sample.id);
  });

  it('strips absolute position from persisted entries', async () => {
    await saveTokenToLibrary({ ...sample, x: 100, y: 200 });
    const [entry] = await listLibraryTokens();
    expect(entry).toBeDefined();
    // Absolute coords shouldn't appear on the catalog record.
    expect((entry as unknown as { x?: number }).x).toBeUndefined();
    expect((entry as unknown as { y?: number }).y).toBeUndefined();
  });
});
