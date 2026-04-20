import { describe, it, expect } from 'vitest';
import { exportSession, importSession } from './export.js';
import { createDefaultState, type Token } from './types.js';
import { putImage, getImage, deleteImage } from '../images/store.js';

function makeBlob(content: string, type = 'image/png'): Blob {
  return new Blob([content], { type });
}

function token(id: string, imageId: string | null = null, borderColor: string | null = null): Token {
  return {
    id,
    x: 0,
    y: 0,
    label: id,
    color: '#ffffff',
    imageId,
    size: 1,
    borderColor,
    hp: null,
    conditions: [],
    rotation: 0,
  };
}

describe('exportSession / importSession', () => {
  it('exports a session with no images', async () => {
    const state = createDefaultState();
    state.tokens.push(token('a'));
    const json = await exportSession(state);
    const doc = JSON.parse(json);
    expect(doc.version).toBe(1);
    expect(doc.images).toEqual([]);
    expect(doc.state.tokens).toHaveLength(1);
  });

  it('embeds referenced images as base64 data URLs', async () => {
    const imgId = await putImage(makeBlob('pixel-data'), 'image/png');
    const state = createDefaultState();
    state.tokens.push(token('a', imgId));

    const json = await exportSession(state);
    const doc = JSON.parse(json);
    expect(doc.images).toHaveLength(1);
    expect(doc.images[0].id).toBe(imgId);
    expect(doc.images[0].mimeType).toBe('image/png');
    expect(doc.images[0].dataUrl.startsWith('data:image/png')).toBe(true);
  });

  it('includes the background image when referenced', async () => {
    const bgId = await putImage(makeBlob('bg'), 'image/jpeg');
    const state = createDefaultState();
    state.background.imageId = bgId;
    const json = await exportSession(state);
    const doc = JSON.parse(json);
    const ids = doc.images.map((img: { id: string }) => img.id);
    expect(ids).toContain(bgId);
  });

  it('round-trips through import with images restored to IDB', async () => {
    const tokenImageId = await putImage(makeBlob('token-data'), 'image/png');
    const bgId = await putImage(makeBlob('bg-data'), 'image/jpeg');
    const state = createDefaultState();
    state.tokens.push(token('hero', tokenImageId, '#4caf50'));
    state.background.imageId = bgId;
    state.background.scaleX = 2;
    state.background.scaleY = 2;
    state.fog[0] = 1;
    state.fog[50] = 1;

    const json = await exportSession(state);
    // Simulate a fresh destination by dropping the images
    await deleteImage(tokenImageId);
    await deleteImage(bgId);
    expect(await getImage(tokenImageId)).toBeNull();
    expect(await getImage(bgId)).toBeNull();

    const { state: restored, imageIds } = await importSession(json);
    expect(imageIds.sort()).toEqual([tokenImageId, bgId].sort());
    // Records are back in IDB
    expect(await getImage(tokenImageId)).not.toBeNull();
    expect(await getImage(bgId)).not.toBeNull();
    expect(restored.tokens[0]!.borderColor).toBe('#4caf50');
    expect(restored.tokens[0]!.imageId).toBe(tokenImageId);
    expect(restored.background.scaleX).toBe(2);
    expect(restored.fog[0]).toBe(1);
    expect(restored.fog[50]).toBe(1);
  });

  it('rejects unsupported export versions', async () => {
    const bad = JSON.stringify({ version: 2, state: {}, images: [] });
    await expect(importSession(bad)).rejects.toThrow(/Unsupported/);
  });

  it('throws when the state field is missing', async () => {
    const bad = JSON.stringify({ version: 1, images: [] });
    await expect(importSession(bad)).rejects.toThrow(/Missing state/);
  });
});
