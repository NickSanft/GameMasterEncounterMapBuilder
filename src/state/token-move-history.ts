/**
 * Phase 122 — token movement undo history.
 *
 * The store-wide undo (Ctrl+Z) walks back through every kind of patch
 * — annotations, fog reveals, AoEs, walls, conditions, the lot. Mid-
 * combat, a GM who just dragged a token to the wrong square wants to
 * pop ONLY that move without touching the unrelated state changes
 * that happened between then and now (auto-fog reveals, condition
 * timers ticking, etc.). Phase 122 adds a parallel, token-move-only
 * history fed off the store-subscribe stream and surfaced via the
 * plain `Z` key (no Ctrl).
 *
 * The history records each `(tokenId, fromX, fromY, toX, toY)` entry
 * in a ring buffer; `popLast()` returns + removes the most recent
 * entry. Multi-token moves (arrow-key WASD with multi-select) emit
 * one entry PER token, so pressing Z several times rewinds them
 * individually. That's a deliberate simplification — batching
 * across a single keystroke would need intent flags from the input
 * layer that aren't available cheaply. A small ergonomic price for
 * a much simpler module.
 *
 * Pure module — no DOM, no store coupling. The host wires it up in
 * the entry's store-subscribe handler.
 */

export interface TokenMoveEntry {
  tokenId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** ms since epoch. Useful for "your last move was 12s ago" UX. */
  timestamp: number;
}

export interface TokenMoveHistoryOptions {
  /** Cap on retained entries. Defaults to 100. */
  maxEntries?: number;
  /** Test seam — defaults to `Date.now()` when `record` doesn't carry a timestamp. */
  now?(): number;
}

export interface TokenMoveHistory {
  /**
   * Append a move. Same-position moves (`from == to`) are silently
   * ignored — Z would no-op anyway, and the noise pollutes the
   * "what was my last meaningful move" UX.
   */
  record(entry: Omit<TokenMoveEntry, 'timestamp'> & { timestamp?: number }): void;
  /** Pop + return the most recent entry, or `null` if empty. */
  popLast(): TokenMoveEntry | null;
  /** Read-only peek at the most recent entry. */
  peekLast(): TokenMoveEntry | null;
  /** Drop every entry. Call on scene switch / session-reset. */
  clear(): void;
  size(): number;
}

const DEFAULT_MAX_ENTRIES = 100;

export function createTokenMoveHistory(
  opts: TokenMoveHistoryOptions = {},
): TokenMoveHistory {
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const now = opts.now ?? (() => Date.now());
  const buffer: TokenMoveEntry[] = [];

  return {
    record(entry) {
      if (entry.fromX === entry.toX && entry.fromY === entry.toY) return;
      const filled: TokenMoveEntry = {
        tokenId: entry.tokenId,
        fromX: entry.fromX,
        fromY: entry.fromY,
        toX: entry.toX,
        toY: entry.toY,
        timestamp: entry.timestamp ?? now(),
      };
      buffer.push(filled);
      while (buffer.length > maxEntries) buffer.shift();
    },
    popLast() {
      return buffer.pop() ?? null;
    },
    peekLast() {
      if (buffer.length === 0) return null;
      return buffer[buffer.length - 1] ?? null;
    },
    clear() {
      buffer.length = 0;
    },
    size: () => buffer.length,
  };
}
