/**
 * Per-view identity preferences (Phase 67).
 *
 * Phase 63 added `playerName` + `playerColor` to the global
 * `Preferences` blob. The 0.63.1 hotfix split them per role
 * (`playerNameGm`, `playerNameSpectator`, etc.) when the user
 * reported that renaming one tab also renamed the other —
 * cross-tab `storage` events were syncing every preference, but
 * the player identity is inherently per-view.
 *
 * That patch put four player-* fields into a blob that's supposed
 * to hold *shared* settings (theme, fog color, label size). This
 * phase takes the next step: pull identity into its own dedicated
 * store with its own localStorage key per role, so the
 * `Preferences` interface goes back to being purely "things both
 * tabs should agree on."
 *
 * One-time migration: on first construction, if the legacy
 * `playerName{Gm,Spectator}` / `playerColor{Gm,Spectator}` fields
 * are present in `Preferences` localStorage, copy them into the new
 * scoped key + remove them from the prefs blob. After this phase,
 * subsequent boots use the new store directly + the migration is
 * a no-op.
 */

import {
  IDENTITY_PREFS_GM_KEY,
  IDENTITY_PREFS_SPECTATOR_KEY,
  PREFERENCES_KEY,
} from '../util/constants.js';
import type { ViewMode } from './types.js';

export interface IdentityPrefs {
  /** Display name; empty = the resolveName() role-default fallback. */
  name: string;
  /** Hex color; empty = the colorForName() hash-based default. */
  color: string;
}

export const DEFAULT_IDENTITY_PREFS: IdentityPrefs = {
  name: '',
  color: '',
};

export interface IdentityPrefsStore {
  get(): IdentityPrefs;
  update(changes: Partial<IdentityPrefs>): void;
  subscribe(listener: (prefs: IdentityPrefs) => void): () => void;
}

function storageKeyFor(viewMode: ViewMode): string {
  return viewMode === 'gm' ? IDENTITY_PREFS_GM_KEY : IDENTITY_PREFS_SPECTATOR_KEY;
}

/**
 * Read the legacy player-* fields out of the preferences blob (if
 * any), strip them, and return the migration result + any cleanup
 * write needed. We do this inline at first-load instead of as a
 * separate script so the path is naturally idempotent — once the
 * fields are gone, subsequent calls find nothing to migrate.
 */
function migrateFromPreferences(viewMode: ViewMode): IdentityPrefs | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const nameKey =
      viewMode === 'gm' ? 'playerNameGm' : 'playerNameSpectator';
    const colorKey =
      viewMode === 'gm' ? 'playerColorGm' : 'playerColorSpectator';
    const name = typeof parsed[nameKey] === 'string' ? (parsed[nameKey] as string) : '';
    const color =
      typeof parsed[colorKey] === 'string' ? (parsed[colorKey] as string) : '';
    if (!(nameKey in parsed) && !(colorKey in parsed)) {
      // Nothing to migrate; either the user is on a fresh install
      // or migration has already run.
      return null;
    }
    // Strip both legacy fields from the prefs blob so they don't
    // round-trip back via the cross-tab `storage` event.
    delete parsed[nameKey];
    delete parsed[colorKey];
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(parsed));
    } catch {
      /* quota / OOM — non-fatal, the migration still returned data */
    }
    return { name, color };
  } catch {
    return null;
  }
}

function loadFromStorage(viewMode: ViewMode): IdentityPrefs {
  // Try the new store first; fall back to migration; then defaults.
  try {
    const raw = localStorage.getItem(storageKeyFor(viewMode));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IdentityPrefs>;
      return { ...DEFAULT_IDENTITY_PREFS, ...parsed };
    }
  } catch {
    /* malformed JSON or storage blocked; fall through to migration */
  }
  const migrated = migrateFromPreferences(viewMode);
  if (migrated) {
    // Persist the migrated value into the new store so the
    // migration only runs once per install.
    try {
      localStorage.setItem(storageKeyFor(viewMode), JSON.stringify(migrated));
    } catch {
      /* non-fatal */
    }
    return migrated;
  }
  return { ...DEFAULT_IDENTITY_PREFS };
}

export function createIdentityPrefs(viewMode: ViewMode): IdentityPrefsStore {
  let prefs = loadFromStorage(viewMode);
  const listeners = new Set<(p: IdentityPrefs) => void>();

  function save(): void {
    try {
      localStorage.setItem(storageKeyFor(viewMode), JSON.stringify(prefs));
    } catch (err) {
      console.warn('[identity-prefs] save failed', err);
    }
  }

  function notify(): void {
    for (const l of listeners) l(prefs);
  }

  // Cross-tab sync — different from `preferences.subscribe` because
  // here the key is role-scoped. A GM tab editing identity-gm fires
  // a `storage` event in OTHER GM tabs (rare but possible) without
  // touching the Spectator tab's identity-spectator key.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== storageKeyFor(viewMode)) return;
      const next = loadFromStorage(viewMode);
      if (JSON.stringify(prefs) === JSON.stringify(next)) return;
      prefs = next;
      notify();
    });
  }

  return {
    get: () => prefs,
    update(changes) {
      prefs = { ...prefs, ...changes };
      save();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
