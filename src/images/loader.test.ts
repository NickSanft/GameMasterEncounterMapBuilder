/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the store so we can drive the loader synchronously without
// the IDB round-trip + browser image decode. The loader itself just
// receives an `ImageRecord` from `getImage` and constructs an
// `<img>`; we control both ends here.
vi.mock('./store.js', () => ({
  getImage: vi.fn(),
}));

import { createImageLoader } from './loader.js';
import { getImage } from './store.js';

beforeEach(() => {
  document.body.innerHTML = '';
  // Patch the global Image constructor: return a REAL jsdom <img>
  // element (so appendChild + parentElement work natively), but
  // override its `src` setter so assigning it fires onload on the
  // next microtask. jsdom's native Image doesn't decode blob URLs
  // and never fires onload on its own.
  function StubImage(): HTMLImageElement {
    const el = document.createElement('img');
    Object.defineProperty(el, 'src', {
      set(_value: string) {
        Promise.resolve().then(() => {
          const cb = (el as unknown as { onload: (() => void) | null }).onload;
          cb?.();
        });
      },
      get() {
        return '';
      },
      configurable: true,
    });
    return el;
  }
  (globalThis as unknown as { Image: unknown }).Image = StubImage;
});

function makeRecord(mimeType: string) {
  return {
    id: 'rec',
    blob: new Blob(['data'], { type: mimeType }),
    mimeType,
    createdAt: 0,
  };
}

async function flush() {
  // Two microtasks: getImage promise → image src setter promise →
  // onload. setTimeout(0) flushes both microtask + macrotask queues.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createImageLoader — Phase 81 GIF detection', () => {
  it('starts empty — isAnimated returns false for any id', () => {
    const loader = createImageLoader(() => {});
    expect(loader.isAnimated('never-loaded')).toBe(false);
    expect(loader.getUrl('never-loaded')).toBeNull();
  });

  it('marks an image/gif source as animated + exposes its object URL', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/gif'));
    const onReady = vi.fn();
    const loader = createImageLoader(onReady);
    loader.get('anim');
    await flush();
    expect(loader.isAnimated('anim')).toBe(true);
    expect(loader.getUrl('anim')).toMatch(/^blob:/);
  });

  it('does NOT flag a static PNG as animated', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/png'));
    const loader = createImageLoader(() => {});
    loader.get('static');
    await flush();
    expect(loader.isAnimated('static')).toBe(false);
    expect(loader.getUrl('static')).toMatch(/^blob:/);
  });

  it('returns the loaded HTMLImageElement via get(id)', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/png'));
    const loader = createImageLoader(() => {});
    expect(loader.get('img')).toBeNull(); // first call kicks off the load
    await flush();
    const img = loader.get('img');
    expect(img).not.toBeNull();
    expect(img!.tagName).toBe('IMG');
  });

  it('invalidate clears the cache so the next get() reloads', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/gif'));
    const loader = createImageLoader(() => {});
    loader.get('anim');
    await flush();
    expect(loader.isAnimated('anim')).toBe(true);

    loader.invalidate('anim');
    expect(loader.isAnimated('anim')).toBe(false);
    expect(loader.getUrl('anim')).toBeNull();
  });

  it('handles invalidate on an unknown id without crashing', () => {
    const loader = createImageLoader(() => {});
    expect(() => loader.invalidate('never-loaded')).not.toThrow();
  });

  it('an error result (record not found) leaves isAnimated/getUrl as null', async () => {
    vi.mocked(getImage).mockResolvedValue(null);
    const loader = createImageLoader(() => {});
    loader.get('missing');
    await flush();
    expect(loader.isAnimated('missing')).toBe(false);
    expect(loader.getUrl('missing')).toBeNull();
  });
});
