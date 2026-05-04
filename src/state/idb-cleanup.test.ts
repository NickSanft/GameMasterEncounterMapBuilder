import { describe, it, expect, beforeEach } from 'vitest';
import { scanUnusedImages, removeUnusedImages } from './idb-cleanup.js';
import { putImageAs, listImageIds } from '../images/store.js';
import { saveTokenToLibrary } from './token-catalog.js';
import { saveTemplateToLibrary } from './template-catalog.js';
import { _resetDBForTests } from './idb.js';
import { createDefaultState } from './types.js';
import type { SessionState, Token } from './types.js';

function makeBlob(): Blob {
  return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
}

function tok(imageId: string | null, x = 0, y = 0): Token {
  return {
    id: 'tok-' + Math.random().toString(36).slice(2, 7),
    x,
    y,
    label: 'T',
    color: '#888',
    imageId,
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
  };
}

beforeEach(() => {
  _resetDBForTests();
});

describe('idb-cleanup', () => {
  it('reports zero orphans when every image is referenced', async () => {
    await putImageAs('bg', makeBlob(), 'image/png');
    await putImageAs('tok', makeBlob(), 'image/png');

    const state: SessionState = {
      ...createDefaultState(),
      background: {
        imageId: 'bg',
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      },
      tokens: [tok('tok')],
    };

    const report = await scanUnusedImages(state);
    expect(report.total).toBe(2);
    expect(report.referenced).toBe(2);
    expect(report.orphans).toEqual([]);
  });

  it('finds orphaned images that no state references', async () => {
    await putImageAs('keeper', makeBlob(), 'image/png');
    await putImageAs('orphan-1', makeBlob(), 'image/png');
    await putImageAs('orphan-2', makeBlob(), 'image/png');

    const state: SessionState = {
      ...createDefaultState(),
      tokens: [tok('keeper')],
    };

    const report = await scanUnusedImages(state);
    expect(report.total).toBe(3);
    expect(report.referenced).toBe(1);
    expect(report.orphans.sort()).toEqual(['orphan-1', 'orphan-2']);
  });

  it('counts token-library images as referenced', async () => {
    await putImageAs('lib-img', makeBlob(), 'image/png');
    await saveTokenToLibrary({
      id: 'x',
      x: 0,
      y: 0,
      label: 'L',
      color: '#fff',
      size: 1,
      borderColor: null,
      imageId: 'lib-img',
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
    });

    const state = createDefaultState();
    const report = await scanUnusedImages(state);
    expect(report.orphans).toEqual([]);
    expect(report.referenced).toBe(1);
  });

  it('counts template-library images as referenced', async () => {
    await putImageAs('tmpl-img', makeBlob(), 'image/png');
    await saveTemplateToLibrary('Pack', [tok('tmpl-img')]);

    const state = createDefaultState();
    const report = await scanUnusedImages(state);
    expect(report.orphans).toEqual([]);
    expect(report.referenced).toBe(1);
  });

  it('removeUnusedImages deletes orphans and returns the count', async () => {
    await putImageAs('keep', makeBlob(), 'image/png');
    await putImageAs('orphan-1', makeBlob(), 'image/png');
    await putImageAs('orphan-2', makeBlob(), 'image/png');

    const removed = await removeUnusedImages(['orphan-1', 'orphan-2']);
    expect(removed).toBe(2);
    const ids = await listImageIds();
    expect(ids).toEqual(['keep']);
  });
});
