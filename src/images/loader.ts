import type { ID } from '../state/types.js';
import { getImage } from './store.js';

interface LoadEntry {
  status: 'loading' | 'loaded' | 'error';
  img: HTMLImageElement | null;
  /**
   * Phase 81 — true when the source MIME is `image/gif`. Used by the
   * canvas token renderer to SKIP `drawImage` (which only ever reads
   * frame 0 of an animated GIF in Chromium / Firefox / Safari) and
   * by the animated-token DOM overlay (`src/ui/animated-token-overlay.ts`)
   * to render a real, browser-animated `<img>` over the canvas instead.
   */
  isAnimated: boolean;
  /**
   * Cached object URL — needed by the DOM overlay to construct
   * standalone `<img>` elements for each animated token.
   */
  url: string | null;
}

export interface ImageLoader {
  get(id: ID): HTMLImageElement | null;
  /**
   * Phase 81 — true when the loaded image's MIME was `image/gif`.
   * Returns false for unknown ids (still loading, errored, or never
   * requested) so callers can use it as a "should I draw to canvas
   * or skip it for the overlay?" predicate without a separate guard.
   */
  isAnimated(id: ID): boolean;
  /**
   * Phase 81 — object URL for the loaded image, or null if not loaded.
   * Used by the animated-token DOM overlay to construct independent
   * `<img>` elements per visible animated token.
   */
  getUrl(id: ID): string | null;
  /**
   * Phase 145 — current load state for `id`. Returns `'unknown'` when
   * the id has never been requested (so callers can distinguish "not
   * loading yet" from "loading"); the act of querying does NOT
   * trigger a load (only `get()` does that). Used by the
   * scene-loading-overlay to show / hide the spinner without forcing
   * a fetch on a never-touched image id.
   */
  getStatus(id: ID): 'unknown' | 'loading' | 'loaded' | 'error';
  invalidate(id: ID): void;
}

export function createImageLoader(onReady: () => void): ImageLoader {
  const cache = new Map<ID, LoadEntry>();

  function load(id: ID) {
    cache.set(id, { status: 'loading', img: null, isAnimated: false, url: null });
    void getImage(id).then((record) => {
      if (!record) {
        cache.set(id, { status: 'error', img: null, isAnimated: false, url: null });
        onReady();
        return;
      }
      const url = URL.createObjectURL(record.blob);
      const img = new Image();
      const isAnimated = record.mimeType === 'image/gif';
      img.onload = () => {
        cache.set(id, { status: 'loaded', img, isAnimated, url });
        onReady();
      };
      img.onerror = () => {
        cache.set(id, { status: 'error', img: null, isAnimated: false, url: null });
        onReady();
      };
      img.src = url;
    });
  }

  return {
    get(id: ID): HTMLImageElement | null {
      const entry = cache.get(id);
      if (!entry) {
        load(id);
        return null;
      }
      return entry.img;
    },
    isAnimated(id: ID): boolean {
      return cache.get(id)?.isAnimated ?? false;
    },
    getUrl(id: ID): string | null {
      return cache.get(id)?.url ?? null;
    },
    getStatus(id: ID): 'unknown' | 'loading' | 'loaded' | 'error' {
      const entry = cache.get(id);
      return entry ? entry.status : 'unknown';
    },
    invalidate(id: ID) {
      cache.delete(id);
    },
  };
}
