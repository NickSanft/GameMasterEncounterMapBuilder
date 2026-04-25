/**
 * Phase 82 — per-Spectator permissions.
 *
 * The GM can selectively revoke specific capabilities from individual
 * Spectators (e.g. "this player keeps spamming dice rolls in the
 * shared history; turn that off for them"). The default is FULL
 * permissions — the GM only needs to touch this UI when they want
 * to restrict someone.
 *
 * MVP scope: a single flag, `canRoll`. The Spectator-side dice panel
 * + slash-command input check it before broadcasting; the GM-side
 * channel handler drops incoming `dice-roll` messages from a sender
 * whose `canRoll` is false (server-side enforcement against tampered
 * builds).
 *
 * Deliberately NOT in MVP:
 *   - `canPing`: Spectators can't currently drop pings (right-click
 *     ping is GM-only). When that capability ships, this type gets a
 *     `canPing` field + the modal a second toggle.
 *   - `canMeasure`: the ruler is local-only; nothing crosses the wire
 *     to enforce.
 *   - Token ownership / per-player movable tokens — substantial
 *     separate feature requiring state changes + drag-permission
 *     wiring.
 *
 * Persistence: the GM stores the override map in localStorage under
 * `gm-encounter-maps-spectator-permissions`. Keyed by playerId, which
 * is regenerated per-tab-session — so a Spectator who reloads gets a
 * fresh playerId + the default permissions. The GM re-revokes if the
 * Spectator was previously restricted. Acceptable MVP tradeoff; a
 * stable cross-session player id is a much bigger lift.
 */

export interface SpectatorPermissions {
  canRoll: boolean;
}

export const DEFAULT_PERMISSIONS: SpectatorPermissions = {
  canRoll: true,
};

const STORAGE_KEY = 'gm-encounter-maps-spectator-permissions';

/**
 * Map of playerId → permissions. Only entries that DIFFER from
 * `DEFAULT_PERMISSIONS` are stored — the lookup helper falls back
 * to defaults for anyone not in the map. This keeps the store small
 * and means "I never touched this UI" → "everyone has defaults".
 */
export type PermissionsMap = Record<string, SpectatorPermissions>;

function read(): PermissionsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: PermissionsMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const p = v as Partial<SpectatorPermissions>;
      // Defensive default — `permissive on read` so a forward-compat
      // scenario (a future client that adds another field) doesn't
      // accidentally lock anyone out when read by an older client.
      out[k] = { canRoll: p.canRoll !== false };
    }
    return out;
  } catch {
    return {};
  }
}

function write(map: PermissionsMap): void {
  try {
    // Strip entries that match the default — keeps the blob small +
    // means a freshly-rejoined player picks up defaults rather than
    // a stale override.
    const compact: PermissionsMap = {};
    for (const [k, v] of Object.entries(map)) {
      if (v.canRoll !== DEFAULT_PERMISSIONS.canRoll) compact[k] = v;
    }
    if (Object.keys(compact).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    }
  } catch {
    /* quota / privacy mode — safely ignored */
  }
}

export interface SpectatorPermissionsStore {
  /**
   * Look up a Spectator's effective permissions. Returns
   * `DEFAULT_PERMISSIONS` for unknown ids — "not in the map" means
   * "GM never restricted this player".
   */
  get(playerId: string): SpectatorPermissions;
  /**
   * Replace the permissions for a single Spectator. Same-value writes
   * are no-ops (no listener fire, no localStorage churn).
   */
  set(playerId: string, perms: SpectatorPermissions): void;
  /**
   * Drop a Spectator's overrides — effectively "reset to defaults".
   */
  reset(playerId: string): void;
  /** Snapshot of the current map (for tests + UI mirroring). */
  snapshot(): PermissionsMap;
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export function createSpectatorPermissionsStore(): SpectatorPermissionsStore {
  let map = read();
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  function permissionsEqual(
    a: SpectatorPermissions,
    b: SpectatorPermissions,
  ): boolean {
    return a.canRoll === b.canRoll;
  }

  return {
    get(playerId: string): SpectatorPermissions {
      return map[playerId] ?? DEFAULT_PERMISSIONS;
    },
    set(playerId: string, perms: SpectatorPermissions): void {
      const current = this.get(playerId);
      if (permissionsEqual(current, perms)) return;
      map = { ...map, [playerId]: perms };
      write(map);
      notify();
    },
    reset(playerId: string): void {
      if (!(playerId in map)) return;
      const next = { ...map };
      delete next[playerId];
      map = next;
      write(map);
      notify();
    },
    snapshot(): PermissionsMap {
      return { ...map };
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Test-only: clear the localStorage key (used in vitest setup). */
export function _resetPermissionsStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignored */
  }
}
