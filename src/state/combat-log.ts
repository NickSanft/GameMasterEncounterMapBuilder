/**
 * Phase 94 — combat log.
 *
 * Auto-records the events that happen during combat — damage / heal,
 * condition adds + removes, death-save changes, turn advances — into
 * a ring buffer surfaced via a toggleable side panel. Pre-94 the GM's
 * only record was their own scratch notes (or memory). The combat log
 * gives a chronological, filterable, exportable record without any
 * extra GM effort: the events fire automatically off the same paths
 * the floating-number animations and the live-region announcer
 * already hook into.
 *
 * Storage is in-memory only — the log is "live commentary" rather
 * than durable history. A future polish could persist to localStorage
 * with a per-session key. For Phase 94 the panel survives a tab
 * session but resets on reload (matching the existing Phase 73 dice
 * roll history behavior).
 *
 * Pure module — events are pushed in by the entry's observer; the
 * ring buffer just holds them, fans out subscribe notifications, and
 * formats for display + export.
 */

import type { ID } from './types.js';

/** Discriminated union of every event the log knows how to record. */
export type CombatLogEvent =
  | {
      kind: 'damage';
      tokenId: ID;
      tokenLabel: string;
      /** Positive = damage taken, negative = healed. Matches Phase 77's
       * `damage-fx.amount` wire convention so the source paths can fire
       * the same value into both surfaces. */
      amount: number;
      /** Optional new HP / max for context. Omitted if HP isn't tracked. */
      hpAfter?: { current: number; max: number };
    }
  | {
      kind: 'condition-added';
      tokenId: ID;
      tokenLabel: string;
      condition: string;
    }
  | {
      kind: 'condition-removed';
      tokenId: ID;
      tokenLabel: string;
      condition: string;
    }
  | {
      kind: 'death-save';
      tokenId: ID;
      tokenLabel: string;
      /** What changed — one of failure / success / stable / dead / reset. */
      change: 'failure' | 'success' | 'stable' | 'dead' | 'reset';
      successes: number;
      failures: number;
    }
  | {
      kind: 'turn';
      round: number;
      tokenId: ID | null;
      tokenLabel: string;
    };

export interface CombatLogEntry {
  /** Wall-clock ms when the event was recorded. */
  timestamp: number;
  event: CombatLogEvent;
}

export interface CombatLogOptions {
  /** Max retained entries; older ones evict FIFO. Defaults to 250. */
  maxEntries?: number;
  /** Test seam — defaults to `Date.now()`. */
  now?(): number;
}

export interface CombatLog {
  /** Append an event with the current timestamp. Evicts oldest if full. */
  add(event: CombatLogEvent): void;
  /**
   * Snapshot of all retained entries, oldest-first. Returns a fresh
   * array — caller mutation is local.
   */
  entries(): CombatLogEntry[];
  /** Number of retained entries. */
  size(): number;
  /** Forget every entry. */
  clear(): void;
  /**
   * Subscribe to changes (add / clear). Returns an unsubscribe fn.
   * Listener fires after every mutation.
   */
  subscribe(listener: () => void): () => void;
  /** Plain-text export, oldest first, `[HH:MM:SS] message` per line. */
  exportText(): string;
}

const DEFAULT_MAX_ENTRIES = 250;

export function createCombatLog(opts: CombatLogOptions = {}): CombatLog {
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const now = opts.now ?? (() => Date.now());
  const buffer: CombatLogEntry[] = [];
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  return {
    add(event) {
      buffer.push({ timestamp: now(), event });
      // Trim from the front when over capacity. Splice on the head is
      // cheap for small N (we cap at 250); fancier ring-buffer is
      // overkill for an in-session log.
      while (buffer.length > maxEntries) buffer.shift();
      notify();
    },
    entries() {
      return buffer.slice();
    },
    size: () => buffer.length,
    clear() {
      if (buffer.length === 0) return;
      buffer.length = 0;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    exportText() {
      return buffer
        .map((e) => `[${formatClock(e.timestamp)}] ${formatLogEvent(e.event)}`)
        .join('\n');
    },
  };
}

/**
 * Format a single event as a one-line human string. Used both by the
 * panel UI and by `exportText()`.
 *
 * Examples:
 *   "Goblin took 7 damage (3/10 HP)"
 *   "Cleric healed 5 HP (8/12 HP)"
 *   "Bandit gained Poisoned"
 *   "Bandit lost Stunned"
 *   "Bard death save failure (1/3 succ, 2/3 fail)"
 *   "Round 3 — Goblin's turn"
 */
export function formatLogEvent(e: CombatLogEvent): string {
  switch (e.kind) {
    case 'damage': {
      const name = e.tokenLabel || 'Token';
      const hpStr = e.hpAfter
        ? ` (${e.hpAfter.current}/${e.hpAfter.max} HP)`
        : '';
      if (e.amount > 0) {
        return `${name} took ${e.amount} damage${hpStr}`;
      }
      const heal = -e.amount;
      return `${name} healed ${heal} HP${hpStr}`;
    }
    case 'condition-added':
      return `${e.tokenLabel || 'Token'} gained ${e.condition}`;
    case 'condition-removed':
      return `${e.tokenLabel || 'Token'} lost ${e.condition}`;
    case 'death-save': {
      const name = e.tokenLabel || 'Token';
      const counts = `(${e.successes}/3 succ, ${e.failures}/3 fail)`;
      switch (e.change) {
        case 'failure':
          return `${name} death save failure ${counts}`;
        case 'success':
          return `${name} death save success ${counts}`;
        case 'stable':
          return `${name} stabilized ${counts}`;
        case 'dead':
          return `${name} died ${counts}`;
        case 'reset':
          return `${name} death-save tracker reset`;
      }
    }
    // eslint-disable-next-line no-fallthrough — TS exhaustiveness handles this
    case 'turn': {
      const name = e.tokenLabel || '—';
      return `Round ${e.round} — ${name}'s turn`;
    }
  }
}

/** Format a `Date.now()` ms as `HH:MM:SS` (24-hour, locale-independent). */
export function formatClock(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
