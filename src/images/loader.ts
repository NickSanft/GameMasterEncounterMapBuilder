import type { ID } from '../state/types.js';
import { getImageURL } from './store.js';

interface LoadEntry {
  status: 'loading' | 'loaded' | 'error';
  img: HTMLImageElement | null;
}

export interface ImageLoader {
  get(id: ID): HTMLImageElement | null;
  invalidate(id: ID): void;
}

export function createImageLoader(onReady: () => void): ImageLoader {
  const cache = new Map<ID, LoadEntry>();

  function load(id: ID) {
    cache.set(id, { status: 'loading', img: null });
    void getImageURL(id).then((url) => {
      if (!url) {
        cache.set(id, { status: 'error', img: null });
        onReady();
        return;
      }
      const img = new Image();
      img.onload = () => {
        cache.set(id, { status: 'loaded', img });
        onReady();
      };
      img.onerror = () => {
        cache.set(id, { status: 'error', img: null });
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
    invalidate(id: ID) {
      cache.delete(id);
    },
  };
}
