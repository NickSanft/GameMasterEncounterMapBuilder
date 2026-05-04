/**
 * Phase 145 — scene-switch loading overlay.
 *
 * During the ~50–200ms gap between a scene switch (or a fresh
 * background-image upload) and the IDB-fetched image landing, the
 * canvas paints the theme's fallback color slab. Pre-145 that
 * looked like a "did the app crash?" flash. The overlay covers the
 * canvas with a thin dimmed layer + a small spinner while the
 * background's image is in `'loading'` state.
 *
 * Lightweight by design — pure DOM, no canvas. Visibility is
 * driven by polling: the host calls `update()` on every store
 * change + every image-loader `onReady` tick. If the polling
 * frequency feels too low for fast IDB hits, a future polish can
 * add an explicit subscribe-on-loader-events hook.
 */
import type { ImageLoader } from '../images/loader.js';

export interface SceneLoadingOverlayHandle {
  /**
   * Re-evaluate visibility from the current state. Called from
   * the host whenever a render-relevant signal fires (store
   * subscribe, loader onReady tick).
   */
  update(currentBackgroundImageId: string | null): void;
  destroy(): void;
}

/**
 * Pure visibility computer — given the current background image id
 * and the loader's status for that id, decide whether the overlay
 * should be visible. Exported for testability.
 */
export function shouldShowOverlay(
  currentBackgroundImageId: string | null,
  loaderStatus: 'unknown' | 'loading' | 'loaded' | 'error',
): boolean {
  // No background image set → nothing to wait on.
  if (currentBackgroundImageId === null) return false;
  // Loaded or errored → nothing to wait on (an errored image just
  // shows the fallback fill; better than a perpetual spinner).
  if (loaderStatus === 'loaded' || loaderStatus === 'error') return false;
  // 'unknown' = never requested yet (the loader's `get()` call is
  // what triggers the fetch). The renderer calls `get()` on every
  // frame, so 'unknown' will flip to 'loading' within one frame.
  // Show the overlay so the GM doesn't see the fallback slab during
  // that single-frame gap.
  return loaderStatus === 'loading' || loaderStatus === 'unknown';
}

export function mountSceneLoadingOverlay(
  container: HTMLElement,
  imageLoader: ImageLoader,
): SceneLoadingOverlayHandle {
  const el = document.createElement('div');
  el.className = 'scene-loading-overlay';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading scene background…');

  const spinner = document.createElement('div');
  spinner.className = 'scene-loading-spinner';
  el.appendChild(spinner);

  const label = document.createElement('div');
  label.className = 'scene-loading-label';
  label.textContent = 'Loading scene…';
  el.appendChild(label);

  container.appendChild(el);

  function update(currentBackgroundImageId: string | null) {
    const status = currentBackgroundImageId
      ? imageLoader.getStatus(currentBackgroundImageId)
      : 'loaded';
    const visible = shouldShowOverlay(currentBackgroundImageId, status);
    el.hidden = !visible;
  }

  return {
    update,
    destroy() {
      el.remove();
    },
  };
}
