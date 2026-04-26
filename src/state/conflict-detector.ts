/**
 * Tracks heartbeats from other GM tabs so the UI can show a conflict
 * banner when two tabs are live at once. A heartbeat is a `{ tabId }`
 * ping each GM broadcasts over the sync channel every ~2 s. A conflict
 * is declared the moment we see a heartbeat with a *different* tabId
 * than our own, and cleared when no conflicting heartbeat has arrived
 * within the staleness window.
 *
 * Phase 84 — heartbeats now also carry an optional `summary` (last
 * edit timestamp + token count + scene name) so the conflict-merge
 * modal can show a meaningful side-by-side comparison ("My tab — 12
 * tokens, last edit 14:32:08" vs "Other tab — 9 tokens, last edit
 * 14:30:51"). Pre-84 GMs that don't send the summary still trigger
 * the conflict-detected branch — the modal just displays "(no info)"
 * for that peer.
 *
 * Pure logic — no timers, no side effects. The caller owns `Date.now()`
 * (or a mock) and ticks the detector manually so everything is easy to
 * unit-test.
 */

export interface PeerSummary {
  /** Wall-clock ms of the last state-mutating event on the peer. */
  lastModified: number;
  /** Token count at the time the heartbeat was sent. */
  tokenCount: number;
  /** Display name of the active scene on the peer (for UX context). */
  sceneName: string;
}

export interface ConflictDetectorOptions {
  /** How fresh a remote heartbeat must be, in ms. Stale ones are ignored. */
  stalenessMs?: number;
}

export interface PeerEntry {
  tabId: string;
  /** Wall-clock ms of the most recent heartbeat seen from this peer. */
  lastSeen: number;
  /** Latest summary from this peer, or null if pre-84 / never sent. */
  summary: PeerSummary | null;
}

export interface ConflictDetector {
  /**
   * Record an inbound heartbeat from some other tab. The optional
   * `summary` is captured per-peer; passing `undefined` leaves the
   * previously-known summary in place (so a pre-84 heartbeat doesn't
   * wipe a freshly-received one — same direction, opposite case).
   */
  noteHeartbeat(tabId: string, now: number, summary?: PeerSummary | null): void;
  /** Forget all heartbeats (e.g. when channel closes). */
  reset(): void;
  /**
   * True if any *other* tab's most recent heartbeat is newer than
   * `now - stalenessMs`.
   */
  hasConflict(now: number): boolean;
  /** Debug / test helper — list every remembered peer tab id. */
  peers(): string[];
  /**
   * Return one entry per peer whose heartbeat is still fresh as of
   * `now`. Stable sort: by `tabId` ascending so the modal lists are
   * deterministic across renders.
   */
  freshPeers(now: number): PeerEntry[];
}

export function createConflictDetector(
  ownTabId: string,
  opts: ConflictDetectorOptions = {},
): ConflictDetector {
  const stalenessMs = opts.stalenessMs ?? 6000;
  const peers = new Map<string, PeerEntry>();

  return {
    noteHeartbeat(tabId, now, summary) {
      if (tabId === ownTabId) return;
      const prev = peers.get(tabId);
      const nextSummary =
        summary === undefined ? (prev ? prev.summary : null) : summary ?? null;
      peers.set(tabId, { tabId, lastSeen: now, summary: nextSummary });
    },
    reset() {
      peers.clear();
    },
    hasConflict(now) {
      for (const p of peers.values()) {
        if (now - p.lastSeen <= stalenessMs) return true;
      }
      return false;
    },
    peers() {
      return Array.from(peers.keys());
    },
    freshPeers(now) {
      const out: PeerEntry[] = [];
      for (const p of peers.values()) {
        if (now - p.lastSeen <= stalenessMs) out.push({ ...p });
      }
      out.sort((a, b) => a.tabId.localeCompare(b.tabId));
      return out;
    },
  };
}
