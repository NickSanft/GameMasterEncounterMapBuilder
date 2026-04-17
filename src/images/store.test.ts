import { describe, it, expect } from 'vitest';
import {
  putImage,
  putImageAs,
  getImage,
  getImageURL,
  deleteImage,
  listImages,
  blobToDataURL,
  dataURLToBlob,
} from './store.js';

function makeBlob(content: string, type = 'image/png'): Blob {
  return new Blob([content], { type });
}

describe('images/store', () => {
  it('putImage + getImage round-trips the record', async () => {
    const id = await putImage(makeBlob('data'), 'image/png');
    const record = await getImage(id);
    expect(record).not.toBeNull();
    expect(record!.id).toBe(id);
    expect(record!.mimeType).toBe('image/png');
  });

  it('putImageAs uses the supplied id', async () => {
    await putImageAs('custom-id', makeBlob('x'), 'image/jpeg');
    const record = await getImage('custom-id');
    expect(record?.id).toBe('custom-id');
    expect(record?.mimeType).toBe('image/jpeg');
  });

  it('getImage returns null for missing ids', async () => {
    expect(await getImage('does-not-exist')).toBeNull();
  });

  it('getImageURL caches per id and returns the same URL', async () => {
    const id = await putImage(makeBlob('abc'), 'image/png');
    const a = await getImageURL(id);
    const b = await getImageURL(id);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });

  it('getImageURL returns null for missing ids', async () => {
    expect(await getImageURL('nope')).toBeNull();
  });

  it('deleteImage removes the record', async () => {
    const id = await putImage(makeBlob('data'), 'image/png');
    await deleteImage(id);
    expect(await getImage(id)).toBeNull();
  });

  it('listImages returns every stored record', async () => {
    const id1 = await putImage(makeBlob('a'), 'image/png');
    const id2 = await putImage(makeBlob('b'), 'image/jpeg');
    const all = await listImages();
    const ids = all.map((r) => r.id);
    expect(ids).toContain(id1);
    expect(ids).toContain(id2);
  });
});

describe('blobToDataURL / dataURLToBlob', () => {
  it('produces a data URL with the expected mime prefix', async () => {
    const blob = makeBlob('pixel', 'image/png');
    const dataUrl = await blobToDataURL(blob, 'image/png');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('honours the mimeType override parameter', async () => {
    const blob = makeBlob('x');
    const dataUrl = await blobToDataURL(blob, 'image/webp');
    expect(dataUrl.startsWith('data:image/webp;base64,')).toBe(true);
  });

  it('base64-encodes the payload', async () => {
    const original = makeBlob('original-content', 'image/png');
    const dataUrl = await blobToDataURL(original, 'image/png');
    const prefix = 'data:image/png;base64,';
    expect(dataUrl.startsWith(prefix)).toBe(true);
    const decoded = atob(dataUrl.slice(prefix.length));
    expect(decoded).toBe('original-content');
  });

  it('dataURLToBlob produces a blob of matching size', async () => {
    const base64 = btoa('abcdef');
    const blob = await dataURLToBlob(`data:text/plain;base64,${base64}`);
    expect(blob.size).toBe(6);
  });
});
