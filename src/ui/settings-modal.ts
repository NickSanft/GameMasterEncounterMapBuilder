/**
 * Lazy stub for the Settings modal (Phase 65).
 *
 * The full implementation lives in `./settings-modal-content.ts` —
 * about 5.3 KB brotli of input wiring + tab markup. The stub
 * defers that load until the user actually opens Settings.
 *
 * The exposed `SettingsModalHandle` keeps its sync `open()` /
 * `close()` shape so existing call sites
 * (e.g. `onSettings: () => settingsModal.open()`) don't change.
 * `open()` returns `void` but does the dynamic import in the
 * background; the modal becomes visible one tick later on first
 * open, instantly thereafter.
 */

import type { PreferencesStore } from '../state/preferences.js';
import type { IdentityPrefsStore } from '../state/identity-prefs.js';
import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';

export interface SettingsModalHandle {
  open(): void;
  close(): void;
}

export interface SettingsModalOptions {
  viewMode: ViewMode;
  preferences: PreferencesStore;
  /** Phase 67 — per-role identity store, shared with the entry. */
  identityPrefs: IdentityPrefsStore;
  store: Store;
}

export function mountSettingsModal(
  opts: SettingsModalOptions,
): SettingsModalHandle {
  type RealHandle = import('./settings-modal-content.js').SettingsModalHandle;
  let real: RealHandle | null = null;
  let loadPromise: Promise<RealHandle> | null = null;

  function load(): Promise<RealHandle> {
    if (real) return Promise.resolve(real);
    if (!loadPromise) {
      loadPromise = import('./settings-modal-content.js').then((mod) => {
        real = mod.buildSettingsModal(opts);
        return real;
      });
    }
    return loadPromise;
  }

  return {
    open() {
      void load().then((handle) => handle.open());
    },
    close() {
      real?.close();
    },
  };
}
