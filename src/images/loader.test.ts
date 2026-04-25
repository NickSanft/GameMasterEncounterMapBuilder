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
        // Don't store the value anywhere — the test doesn't read it.
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

describe('createImageLoader — Phase 81 GIF tracking', () => {
  it('starts with zero animated images loaded', () => {
    const loader = createImageLoader(() => {});
    expect(loader._animatedCount()).toBe(0);
  });

  it('does NOT bump the animated count for a static PNG', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/png'));
    const onReady = vi.fn();
    const loader = createImageLoader(onReady);
    loader.get('img-static');
    // Wait for the load chain to settle (mock resolves via microtasks).
    // Flush all pending microtasks (getImage promise → image src
    // setter promise → onload).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader._animatedCount()).toBe(0);
  });

  it('bumps the animated count for an image/gif and appends to a hidden host', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/gif'));
    const onReady = vi.fn();
    const loader = createImageLoader(onReady);
    loader.get('img-anim');
    // Flush all pending microtasks (getImage promise → image src
    // setter promise → onload).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader._animatedCount()).toBe(1);
    // The hidden host should now contain the loaded <img>.
    const host = document.querySelector('.animated-token-host');
    expect(host).not.toBeNull();
    expect(host!.children.length).toBe(1);
  });

  it('decrements the count + detaches from host on invalidate', async () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/gif'));
    const loader = createImageLoader(() => {});
    loader.get('anim');
    // Flush all pending microtasks (getImage promise → image src
    // setter promise → onload).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader._animatedCount()).toBe(1);
    loader.invalidate('anim');
    expect(loader._animatedCount()).toBe(0);
    const host = document.querySelector('.animated-token-host');
    expect(host?.children.length ?? 0).toBe(0);
  });

  it('handles invalidate on an unknown id without crashing', () => {
    const loader = createImageLoader(() => {});
    expect(() => loader.invalidate('never-loaded')).not.toThrow();
  });

  it('handles invalidate on a loading-but-not-yet-loaded entry', () => {
    vi.mocked(getImage).mockResolvedValue(makeRecord('image/gif'));
    const loader = createImageLoader(() => {});
    loader.get('mid-load');
    // Don't await the load chain — invalidate while still loading.
    expect(() => loader.invalidate('mid-load')).not.toThrow();
    // The promise will still resolve; that's fine — the cache entry
    // is gone so the load just no-ops on completion.
  });

  it('an error result does NOT bump the animated count (even for GIF MIME)', async () => {
    vi.mocked(getImage).mockResolvedValue(null); // simulate "not found"
    const loader = createImageLoader(() => {});
    loader.get('missing');
    // Flush all pending microtasks (getImage promise → image src
    // setter promise → onload).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader._animatedCount()).toBe(0);
  });
});
