/**
 * Tracks heartbeats from other GM tabs so the UI can show a conflict
 * banner when two tabs are live at once. A heartbeat is a `{ tabId }`
 * ping each GM broadcasts over the sync channel every ~2 s. A conflict
 * is declared the moment we see a heartbeat with a *different* tabId
 * than our own, and cleared when no conflicting heartbeat has arrived
 * within the staleness window.
 *
 * Pure logic — no timers, no side effects. The caller owns `Date.now()`
 * (or a mock) and ticks the detector manually so everything is easy to
 * unit-test.
 */

export interface ConflictDetectorOptions {
  /** How fresh a remote heartbeat must be, in ms. Stale ones are ignored. */
  stalenessMs?: number;
}

export interface ConflictDetector {
  /** Record an inbound heartbeat from some other tab. */
  noteHeartbeat(tabId: string, now: number): void;
  /** Forget all heartbeats (e.g. when channel closes). */
  reset(): void;
  /**
   * True if any *other* tab's most recent heartbeat is newer than
   * `now - stalenessMs`.
   */
  hasConflict(now: number): boolean;
  /** Debug / test helper — list every remembered peer tab id. */
  peers(): string[];
}

export function createConflictDetector(
  ownTabId: string,
  opts: ConflictDetectorOptions = {},
): ConflictDetector {
  const stalenessMs = opts.stalenessMs ?? 6000;
  const lastSeen = new Map<string, number>();

  return {
    noteHeartbeat(tabId, now) {
      if (tabId === ownTabId) return;
      lastSeen.set(tabId, now);
    },
    reset() {
      lastSeen.clear();
    },
    hasConflict(now) {
      for (const t of lastSeen.values()) {
        if (now - t <= stalenessMs) return true;
      }
      return false;
    },
    peers() {
      return Array.from(lastSeen.keys());
    },
  };
}
