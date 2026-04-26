/**
 * Phase 106 — scene search / filter helpers.
 *
 * The Scenes modal grows quickly: a long-running campaign can easily
 * accumulate 30+ scenes (one per encounter, dungeon room, set piece).
 * Scrolling a wall of cards to find "the dragon's lair" is slow.
 *
 * `filterScenes(scenes, query)` does case-insensitive substring matching
 * with the same 3-tier ranking the command palette uses (Phase 95):
 *
 *   - **Rank 0 — prefix**: query matches the start of the scene name.
 *     Most useful for "type the first few letters" muscle memory.
 *   - **Rank 1 — word-boundary**: query appears after whitespace
 *     somewhere inside the name. So "ditch" matches "Roadside Ditch"
 *     but not "Switch Room".
 *   - **Rank 2 — substring**: query appears anywhere in the name as a
 *     plain substring. Catches partial matches that don't fall on
 *     word boundaries (e.g. typos like "ragon" matching "Dragon").
 *
 * Within a rank, results are ordered by the original list order — the
 * caller (the Scenes modal) passes `listScenes()` which is already
 * `updatedAt desc`, so most-recently-edited matches come first.
 *
 * Pure module — no DOM, no IDB. Trivially testable with a synthetic
 * scene list.
 */

export interface SceneFilterItem {
  /** Stable identity (used for keyed re-render). Anything string. */
  id: string;
  /** Display name — what the user types against. */
  name: string;
}

/**
 * Return scenes whose name matches the query, ranked best-first.
 *
 * - Empty / whitespace query returns the input list unchanged.
 * - Match is case-insensitive (both name + query are lowercased once).
 * - Stable within a rank — preserves caller-supplied order so the modal
 *   gets newest-edited-first behavior for free.
 */
export function filterScenes<T extends SceneFilterItem>(
  scenes: readonly T[],
  query: string,
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return scenes.slice();

  const ranked: Array<{ scene: T; rank: number; idx: number }> = [];
  for (let idx = 0; idx < scenes.length; idx++) {
    const scene = scenes[idx]!;
    const nameLower = scene.name.toLowerCase();
    if (!nameLower.includes(trimmed)) continue;
    ranked.push({ scene, rank: rankFor(nameLower, trimmed), idx });
  }
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.idx - b.idx; // preserve input ordering within a rank
  });
  return ranked.map((r) => r.scene);
}

/**
 * 0 = prefix match on name; 1 = word-boundary match (preceded by
 * whitespace); 2 = anywhere-substring match. Same convention the
 * command palette uses so users get consistent ranking everywhere.
 */
function rankFor(nameLower: string, query: string): number {
  if (nameLower.startsWith(query)) return 0;
  if (nameLower.includes(` ${query}`)) return 1;
  return 2;
}
