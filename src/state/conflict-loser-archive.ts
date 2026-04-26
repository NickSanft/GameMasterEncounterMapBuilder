/**
 * Phase 99 — conflict-loser archive.
 *
 * When the GM resolves a Phase 84 conflict by adopting the OTHER tab's
 * state ("Use other tab" → `gm-takeover` apply), the local-tab's
 * about-to-be-overwritten state was previously just dropped. If the
 * GM then realized they picked the wrong winner ("oh, that other tab
 * was missing the wall I drew 5 minutes ago"), there was no recovery
 * path — they'd have to manually rebuild the lost edits.
 *
 * Phase 99 archives that losing state for 1 hour so the GM can
 * Restore it if needed. Storage:
 *   - localStorage-backed (sync access, no async race during the
 *     synchronous gm-takeover apply path)
 *   - Cap of MAX_ARCHIVED entries (5); FIFO eviction
 *   - 1-hour TTL — entries older than that are filtered out by
 *     `listFresh()` and lazily evicted on the next write
 *
 * Pure module — no DOM, no UI. The recovery affordance lives in the
 * palette + session menu (separately wired in `gm.ts`).
 */

import type { SerializedSessionState } from '../sync/messages.js';
import { nid } from '../util/id.js';

export const KEY = 'gm-encounter-maps-conflict-loser-archive';
export const MAX_ARCHIVED = 5;
export const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface LoserSnapshot {
  id: string;
  recordedAt: number;
  state: SerializedSessionState;
  /** Human-friendly source — currently always "Adopted other tab's state". */
  reason: string;
}

export interface ConflictLoserArchive {
  /**
   * Push the losing state into the archive. Returns the recorded
   * snapshot. Older entries past the cap or past the TTL are
   * evicted as a side effect.
   */
  record(state: SerializedSessionState, opts?: { now?: number; reason?: string }): LoserSnapshot;
  /** Snapshots with `recordedAt > now - TTL_MS`, newest-first. */
  listFresh(now?: number): LoserSnapshot[];
  /** Look up a single archived snapshot by id (regardless of TTL). */
  get(id: string): LoserSnapshot | null;
  /** Drop a single entry (e.g. after the user restored from it). */
  remove(id: string): void;
  /** Forget every entry. */
  clear(): void;
}

interface ArchiveBlob {
  version: 1;
  entries: LoserSnapshot[];
}

interface CreateOptions {
  /**
   * Test seam — defaults to `globalThis.localStorage`. Pass a stub
   * for unit isolation (the storage is small enough that a Map-backed
   * shim is trivial; see the test file).
   */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

export function createConflictLoserArchive(
  opts: CreateOptions = {},
): ConflictLoserArchive {
  const storage = opts.storage ?? safeLocalStorage();

  function loadAll(): LoserSnapshot[] {
    if (!storage) return [];
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ArchiveBlob;
      if (!parsed || typeof parsed !== 'object') return [];
      if (parsed.version !== 1) return [];
      if (!Array.isArray(parsed.entries)) return [];
      // Defensive — drop entries missing required fields.
      return parsed.entries.filter(
        (e): e is LoserSnapshot =>
          !!e &&
          typeof e.id === 'string' &&
          e.id.length > 0 &&
          typeof e.recordedAt === 'number' &&
          Number.isFinite(e.recordedAt) &&
          !!e.state,
      );
    } catch {
      return [];
    }
  }

  function persist(entries: LoserSnapshot[]): void {
    if (!storage) return;
    try {
      const blob: ArchiveBlob = { version: 1, entries };
      storage.setItem(KEY, JSON.stringify(blob));
    } catch {
      // Quota exhausted — drop oldest until it fits, or wipe entirely
      // as a last resort. Loser archive is opt-in recovery; we don't
      // fail the takeover apply on persistence failure.
      try {
        storage.removeItem(KEY);
      } catch {
        /* nothing more to do */
      }
    }
  }

  return {
    record(state, options = {}) {
      const now = options.now ?? Date.now();
      const reason = options.reason ?? "Adopted other tab's state";
      const snapshot: LoserSnapshot = {
        id: nid(),
        recordedAt: now,
        state,
        reason,
      };
      // Read → trim TTL'd → push → cap → write.
      const all = loadAll();
      const fresh = all.filter((e) => now - e.recordedAt <= TTL_MS);
      fresh.unshift(snapshot); // newest first
      const capped = fresh.slice(0, MAX_ARCHIVED);
      persist(capped);
      return snapshot;
    },
    listFresh(now = Date.now()) {
      const all = loadAll();
      const fresh = all.filter((e) => now - e.recordedAt <= TTL_MS);
      // Newest-first.
      return fresh.sort((a, b) => b.recordedAt - a.recordedAt);
    },
    get(id) {
      const all = loadAll();
      return all.find((e) => e.id === id) ?? null;
    },
    remove(id) {
      const all = loadAll();
      const next = all.filter((e) => e.id !== id);
      if (next.length === all.length) return;
      persist(next);
    },
    clear() {
      if (!storage) return;
      try {
        storage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
