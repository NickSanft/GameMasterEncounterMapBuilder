/**
 * Phase 75 — recently-activated scenes tracker.
 *
 * Backs the Ctrl+1..9 quick-switch shortcut. Tracks the timestamp at
 * which each scene was last MADE ACTIVE (not just edited). The Nth
 * most recent scene becomes the target of `Ctrl+N` in the GM entry.
 *
 * Why a separate tracker rather than reusing `SceneRecord.updatedAt`:
 *   - `updatedAt` ticks on every state save (every patch flushes the
 *     debounce → bumps the record). That makes the active scene
 *     ALWAYS the most recently updated, which would make Ctrl+1
 *     just "switch to current scene" — useless. We want the second-
 *     most-recent activation, not the most-recent edit.
 *   - The recents map is intentionally local-only (no sync to peers)
 *     because each user's switching pattern is their own UX state.
 *
 * Storage: a small JSON blob in localStorage under
 * `gm-encounter-maps-scene-recents`, shape `{[sceneId: string]: number}`
 * where the value is `Date.now()` at activation time. Pruned to the
 * top 32 entries on every write so an old graveyard of deleted
 * scenes can't bloat localStorage.
 */

const KEY = 'gm-encounter-maps-scene-recents';
const PRUNE_TO = 32;

export type RecentsMap = Record<string, number>;

function read(): RecentsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: RecentsMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(map: RecentsMap): void {
  try {
    // Prune: keep only the top PRUNE_TO entries by timestamp so
    // long-lived sessions don't grow the blob unboundedly when
    // scenes are created + deleted over time.
    const entries = Object.entries(map);
    if (entries.length > PRUNE_TO) {
      entries.sort((a, b) => b[1] - a[1]);
      entries.length = PRUNE_TO;
    }
    const pruned: RecentsMap = {};
    for (const [k, v] of entries) pruned[k] = v;
    localStorage.setItem(KEY, JSON.stringify(pruned));
  } catch {
    /* quota / privacy mode — safely ignored */
  }
}

/**
 * Record that scene `id` is now the active scene. Bumps its entry to
 * `Date.now()`. Idempotent on re-activation (just refreshes the timer).
 */
export function noteSceneActivated(id: string, now: number = Date.now()): void {
  if (!id) return;
  const map = read();
  map[id] = now;
  write(map);
}

/** Drop a scene from the recents map. Called on scene deletion. */
export function forgetScene(id: string): void {
  const map = read();
  if (!(id in map)) return;
  delete map[id];
  write(map);
}

/** Test-only: read the current map. */
export function _peekRecents(): RecentsMap {
  return read();
}

/** Test-only: clear the map (used in vitest setup). */
export function _resetRecents(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}

export interface SceneListItem {
  id: string;
  name: string;
}

/**
 * Order the given scenes by their last-activated timestamp,
 * descending. Scenes never activated fall to the bottom in their
 * original (caller-supplied) order — typically that's
 * `updatedAt` desc from `listScenes()`.
 *
 * The result has the same length as the input; ids that don't
 * appear in the recents map keep their input position relative to
 * each other.
 */
export function orderByRecency<T extends SceneListItem>(
  scenes: readonly T[],
  recents: RecentsMap = read(),
): T[] {
  const ranked: Array<{ scene: T; ts: number; idx: number }> = scenes.map(
    (s, idx) => ({
      scene: s,
      // 0 for never-activated; the .sort below puts those last.
      ts: recents[s.id] ?? 0,
      idx,
    }),
  );
  ranked.sort((a, b) => {
    if (a.ts !== b.ts) return b.ts - a.ts;
    // Same timestamp (both 0 → never activated) → preserve input order.
    return a.idx - b.idx;
  });
  return ranked.map((r) => r.scene);
}

/**
 * Pick the scene at slot `n` (1-based) in the recents-ordered list.
 * Used by the Ctrl+N hotkey: `pickRecent(scenes, 1)` returns the
 * most-recently-active OTHER scene (excluding the currently-active
 * one — see `excludeId`), `pickRecent(scenes, 2)` the second-most,
 * etc.
 *
 * Excluding the active scene matches user intent: pressing Ctrl+1
 * to "switch to recent #1" should NOT no-op on the current scene.
 * Returns `null` when the slot is empty (e.g. fewer recents than n).
 */
export function pickRecent<T extends SceneListItem>(
  scenes: readonly T[],
  n: number,
  excludeId: string | null = null,
  recents: RecentsMap = read(),
): T | null {
  if (!Number.isFinite(n) || n < 1) return null;
  const ordered = orderByRecency(scenes, recents).filter(
    (s) => s.id !== excludeId,
  );
  return ordered[n - 1] ?? null;
}
