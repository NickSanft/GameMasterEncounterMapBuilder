/**
 * Phase 82 — per-Spectator permissions.
 * Phase 109 — extends with `hiddenTokenIds` for per-spectator
 * token visibility ("hide this NPC from Jordan").
 *
 * The GM can selectively revoke specific capabilities from individual
 * Spectators (e.g. "this player keeps spamming dice rolls in the
 * shared history; turn that off for them"). The default is FULL
 * permissions — the GM only needs to touch this UI when they want
 * to restrict someone.
 *
 * Phase 82 fields: `canRoll`. The Spectator-side dice panel +
 * slash-command input check it before broadcasting; the GM-side
 * channel handler drops incoming `dice-roll` messages from a sender
 * whose `canRoll` is false (server-side enforcement against tampered
 * builds).
 *
 * Phase 109 field: `hiddenTokenIds`. The Spectator's renderer skips
 * any token whose id is in this list — and the LoS / light collectors
 * also skip them, so a hidden NPC's vision / torch doesn't betray
 * its existence indirectly. The GM uses the new "Visible to" section
 * in the token editor to add / remove ids.
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
  /**
   * Phase 109 — token ids that the GM has hidden FROM this specific
   * Spectator. The Spectator's renderer + LoS / light collectors skip
   * these tokens entirely; the rest of the world sees them normally.
   *
   * Default: empty array (every token visible to every Spectator).
   * The store helpers below dedupe + sort to keep the JSON deterministic
   * across writes (no spurious diffs when toggling a token off-on-off).
   */
  hiddenTokenIds: string[];
}

export const DEFAULT_PERMISSIONS: SpectatorPermissions = {
  canRoll: true,
  hiddenTokenIds: [],
};

/**
 * Phase 109 — equality check on `hiddenTokenIds`. Both lists are kept
 * sorted (the helpers below ensure it on every write) so a simple
 * length + element comparison suffices.
 */
function hiddenTokenIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Phase 109 — produce a deduplicated + sorted snapshot of token ids.
 * Sorting + deduping at the store boundary keeps the persisted JSON
 * deterministic + makes equality checks cheap.
 */
function normalizeTokenIds(ids: readonly string[]): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && id.length > 0) set.add(id);
  }
  return Array.from(set).sort();
}

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
      // Phase 109 — `hiddenTokenIds` may be missing from pre-109
      // blobs; default to empty (no tokens hidden).
      const hiddenTokenIds = Array.isArray(p.hiddenTokenIds)
        ? normalizeTokenIds(p.hiddenTokenIds)
        : [];
      out[k] = { canRoll: p.canRoll !== false, hiddenTokenIds };
    }
    return out;
  } catch {
    return {};
  }
}

function isDefault(p: SpectatorPermissions): boolean {
  return p.canRoll === DEFAULT_PERMISSIONS.canRoll && p.hiddenTokenIds.length === 0;
}

function write(map: PermissionsMap): void {
  try {
    // Strip entries that match the default — keeps the blob small +
    // means a freshly-rejoined player picks up defaults rather than
    // a stale override.
    const compact: PermissionsMap = {};
    for (const [k, v] of Object.entries(map)) {
      if (!isDefault(v)) compact[k] = v;
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
  /**
   * Phase 109 — convenience wrappers for the per-token visibility
   * toggle. The token editor + the per-token rename helpers all need
   * the same "is this token hidden from this spectator?" + "set this
   * token's hidden state for this spectator" pair, so we expose them
   * directly rather than making every caller re-derive from `get()`.
   */
  isTokenHidden(playerId: string, tokenId: string): boolean;
  setTokenHidden(playerId: string, tokenId: string, hidden: boolean): void;
  /**
   * Phase 109 — drop a token id from EVERY spectator's hidden list.
   * Called when a token is deleted, to keep the persisted blob from
   * accumulating ghost ids of long-gone tokens.
   */
  forgetToken(tokenId: string): void;
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
    return (
      a.canRoll === b.canRoll &&
      hiddenTokenIdsEqual(a.hiddenTokenIds, b.hiddenTokenIds)
    );
  }

  return {
    get(playerId: string): SpectatorPermissions {
      return map[playerId] ?? DEFAULT_PERMISSIONS;
    },
    set(playerId: string, perms: SpectatorPermissions): void {
      const normalized: SpectatorPermissions = {
        canRoll: perms.canRoll,
        hiddenTokenIds: normalizeTokenIds(perms.hiddenTokenIds),
      };
      const current = this.get(playerId);
      if (permissionsEqual(current, normalized)) return;
      map = { ...map, [playerId]: normalized };
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
    isTokenHidden(playerId: string, tokenId: string): boolean {
      const perms = map[playerId];
      if (!perms) return false;
      return perms.hiddenTokenIds.includes(tokenId);
    },
    setTokenHidden(playerId: string, tokenId: string, hidden: boolean): void {
      const current = map[playerId] ?? DEFAULT_PERMISSIONS;
      const has = current.hiddenTokenIds.includes(tokenId);
      if (has === hidden) return;
      const nextIds = hidden
        ? [...current.hiddenTokenIds, tokenId]
        : current.hiddenTokenIds.filter((id) => id !== tokenId);
      this.set(playerId, { ...current, hiddenTokenIds: nextIds });
    },
    forgetToken(tokenId: string): void {
      let touched = false;
      const next: PermissionsMap = {};
      for (const [pid, perms] of Object.entries(map)) {
        if (perms.hiddenTokenIds.includes(tokenId)) {
          touched = true;
          next[pid] = {
            ...perms,
            hiddenTokenIds: perms.hiddenTokenIds.filter((id) => id !== tokenId),
          };
        } else {
          next[pid] = perms;
        }
      }
      if (!touched) return;
      map = next;
      write(map);
      notify();
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
