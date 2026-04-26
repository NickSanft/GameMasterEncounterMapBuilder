/**
 * Phase 96 — first-use hints persistence.
 *
 * Tracks which one-time tips the user has seen so each hint shows
 * at most once across the lifetime of an install. Backed by
 * localStorage so dismissals survive reloads + tab restarts.
 *
 * Pure-state, DOM-free helpers. The hint UI imports `wasShown` to
 * decide whether to render at all and `markShown` after the user
 * dismisses. A `reset()` clears the shown set — useful for the
 * Settings → "Reset preferences" path so users who want to see the
 * tour again can opt back in.
 */

const DEFAULT_KEY = 'gm-encounter-maps-first-use-hints';

export interface FirstUseHintsStore {
  /** True iff `markShown(id)` has been called previously (or persisted). */
  wasShown(id: string): boolean;
  /** Persist that the hint with this id has been seen. Idempotent. */
  markShown(id: string): void;
  /** Forget every shown hint (Settings reset path). */
  reset(): void;
  /** Test helper — list every recorded id. */
  listShown(): string[];
}

export interface FirstUseHintsOptions {
  /** localStorage key. Defaults to a stable name shared by GM + Spectator. */
  key?: string;
  /**
   * Test seam — pass a stub when the test environment doesn't have
   * `localStorage` (jsdom does, but unit isolation is easier with a
   * fake). Defaults to `globalThis.localStorage`.
   */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

export function createFirstUseHintsStore(
  opts: FirstUseHintsOptions = {},
): FirstUseHintsStore {
  const key = opts.key ?? DEFAULT_KEY;
  const storage = opts.storage ?? safeLocalStorage();

  // In-memory cache so wasShown is a hash lookup, not a JSON parse.
  const shown = new Set<string>(loadShownIds(storage, key));

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(Array.from(shown).sort()));
    } catch {
      // Quota exhausted / privacy mode / no storage. Hint set lives
      // in-memory for this tab session only — acceptable degradation.
    }
  }

  return {
    wasShown: (id) => shown.has(id),
    markShown(id) {
      if (shown.has(id)) return;
      shown.add(id);
      persist();
    },
    reset() {
      if (shown.size === 0) return;
      shown.clear();
      try {
        storage?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
    listShown: () => Array.from(shown).sort(),
  };
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // SecurityError in some embedded contexts.
    return null;
  }
}

function loadShownIds(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  key: string,
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive — drop anything that isn't a non-empty string.
    return parsed.filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
  } catch {
    return [];
  }
}
