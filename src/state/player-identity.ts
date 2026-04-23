/**
 * Per-tab player identity (Phase 63).
 *
 * Every open tab (GM or Spectator) has a stable `playerId` chosen at
 * boot (tab-session random — not persisted across reloads, by design:
 * reloading = new session in the conflict-detector model). A
 * user-chosen display `name` + `color` live in `preferences` so they
 * round-trip through localStorage.
 *
 * When two peers are connected (BroadcastChannel OR WebRTC), they
 * exchange `identity` sync messages carrying `{id, name, color,
 * role}`. Each side maintains a map of known identities keyed by id.
 * The GM side renders a "Connected players" panel; everyone uses the
 * attribution to label pings + dice rolls.
 *
 * Why a pure module: the reducer + the color-from-name hash are
 * trivially unit-testable, and keeping them off the entries means
 * neither gm.ts nor spectator.ts needs to duplicate the logic.
 */

import type { ID } from './types.js';

export interface PlayerIdentity {
  /** Stable per-tab id (generated at boot). */
  id: ID;
  /** Display name chosen by the user. Empty = anonymous. */
  name: string;
  /** Hex color for the dot / border. */
  color: string;
  /** Which view this tab is running. */
  role: 'gm' | 'spectator';
}

/**
 * Default palette used when the user hasn't picked a color. We hash
 * the name into a stable index so the same name always picks the
 * same color — makes re-joining after a reload look consistent
 * even without the color round-tripping through prefs.
 */
const DEFAULT_COLORS: readonly string[] = [
  '#e57373', // red
  '#ba68c8', // purple
  '#64b5f6', // blue
  '#4db6ac', // teal
  '#81c784', // green
  '#ffd54f', // yellow
  '#ff8a65', // coral
  '#a1887f', // tan
  '#9fa8da', // lavender
  '#f06292', // pink
];

/**
 * Stable color pick based on the name. Hash is simple FNV-ish —
 * quality doesn't matter, we just want the same name to consistently
 * map to the same slot. Empty / falsy names fall back to a gray.
 */
export function colorForName(name: string): string {
  if (!name) return '#9e9e9e';
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  }
  // `hash >>> 0` turns the signed 32-bit result back into unsigned
  // before the modulo. Without it, negative values would land on the
  // wrong bucket.
  const idx = (hash >>> 0) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[idx]!;
}

/**
 * Resolve a display-safe name. Empty + whitespace-only inputs turn
 * into a sensible role-based default so the GM panel doesn't show
 * blank entries while a user is mid-typing their name.
 */
export function resolveName(raw: string, role: 'gm' | 'spectator'): string {
  const trimmed = raw.trim();
  if (trimmed) return trimmed;
  return role === 'gm' ? 'GM' : 'Spectator';
}

/**
 * Validate a user-supplied hex color. Accepts `#rgb`, `#rrggbb`,
 * case-insensitive. Rejects everything else (returns null) so the
 * caller can fall back to the hashed default.
 */
export function validateColor(raw: string): string | null {
  const s = raw.trim();
  if (/^#[0-9a-f]{3}$/i.test(s) || /^#[0-9a-f]{6}$/i.test(s)) return s;
  return null;
}

/**
 * Minimal store for the "known peers" list. GM + Spectator both
 * maintain one (the GM cares more — it drives the connected-players
 * panel — but Spectators can use it too for ping-attribution).
 *
 * `update(identity)` upserts by id. `forget(id)` removes a disconnect.
 * `list()` returns a stable-ordered snapshot sorted by join order so
 * the panel doesn't reshuffle on every tick.
 */
export interface IdentityRegistry {
  update(identity: PlayerIdentity): void;
  forget(id: ID): void;
  get(id: ID): PlayerIdentity | undefined;
  list(): readonly PlayerIdentity[];
  /**
   * Subscribe to changes (after update + forget). Returns an
   * unsubscribe fn.
   */
  subscribe(listener: (snapshot: readonly PlayerIdentity[]) => void): () => void;
  /** Clear all entries. */
  clear(): void;
}

export function createIdentityRegistry(): IdentityRegistry {
  // Map iterator preserves insertion order, which is what we want:
  // "peers listed in the order they joined" is stable + predictable.
  const byId = new Map<ID, PlayerIdentity>();
  const listeners = new Set<(snapshot: readonly PlayerIdentity[]) => void>();

  function notify(): void {
    const snap = Array.from(byId.values());
    for (const l of listeners) l(snap);
  }

  return {
    update(identity) {
      const existing = byId.get(identity.id);
      if (
        existing &&
        existing.name === identity.name &&
        existing.color === identity.color &&
        existing.role === identity.role
      ) {
        return; // no-op update — skip the notify to avoid re-renders.
      }
      byId.set(identity.id, { ...identity });
      notify();
    },
    forget(id) {
      if (!byId.delete(id)) return;
      notify();
    },
    get: (id) => byId.get(id),
    list: () => Array.from(byId.values()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear() {
      if (byId.size === 0) return;
      byId.clear();
      notify();
    },
  };
}
