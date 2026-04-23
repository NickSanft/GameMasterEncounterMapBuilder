/**
 * Lazy stub for the Help overlay (Phase 65).
 *
 * The full implementation lives in `./help-overlay-content.ts` —
 * about 8.5 KB brotli of section text + modal markup. Most users
 * open the help overlay rarely (or never), so we defer that load
 * to the first click on the floating "?" button.
 *
 * This stub:
 *   - Mounts the floating "?" button at boot (small DOM, no copy).
 *   - On the first click, dynamic-imports the heavy module +
 *     constructs the modal + opens it.
 *   - Caches the loaded handle so subsequent toggles are instant.
 *
 * The exported `mountHelpOverlay(viewMode)` API is unchanged from
 * the pre-split signature; callers don't need to know the load
 * happens lazily. `open()` / `toggle()` return Promises (sub-
 * millisecond after the first call) — fire-and-forget at the call
 * site is fine since we never relied on synchronous open before.
 */

import type { ViewMode } from '../state/types.js';

export interface HelpOverlayHandle {
  open(): Promise<void>;
  close(): void;
  toggle(): Promise<void>;
}

export function mountHelpOverlay(viewMode: ViewMode): HelpOverlayHandle {
  // Floating "?" button (bottom-left corner). Sized + styled by the
  // existing `.help-button` CSS rule; the heavy module never sees
  // the button creation now.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-button';
  button.setAttribute('aria-label', 'Open quick tutorial');
  button.title = 'Quick tutorial — what does each button do?';
  button.textContent = '?';
  document.body.appendChild(button);

  type RealHandle = import('./help-overlay-content.js').HelpOverlayHandle;
  let real: RealHandle | null = null;
  let loadPromise: Promise<RealHandle> | null = null;

  function load(): Promise<RealHandle> {
    if (real) return Promise.resolve(real);
    if (!loadPromise) {
      loadPromise = import('./help-overlay-content.js').then((mod) => {
        real = mod.buildHelpOverlay(viewMode, button);
        return real;
      });
    }
    return loadPromise;
  }

  async function open(): Promise<void> {
    const handle = await load();
    handle.open();
  }
  function close(): void {
    real?.close();
  }
  async function toggle(): Promise<void> {
    const handle = await load();
    handle.toggle();
  }

  // Click handler stays in the stub so we control the lazy-load
  // trigger end-to-end. After the first click, `load()` resolves
  // synchronously (cache hit) so the perceived latency is just one
  // microtask + the toggle paint.
  button.addEventListener('click', () => {
    button.blur();
    void toggle();
  });

  return { open, close, toggle };
}
