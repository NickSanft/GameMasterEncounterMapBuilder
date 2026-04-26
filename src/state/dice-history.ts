/**
 * Phase 107 — dice expression history recall.
 *
 * The slash-command input (Phase 74) is a fire-and-forget one-liner;
 * the dice panel keeps a roll log, but neither tracks the EXPRESSION
 * the user actually typed for re-use. Phase 107 records every
 * successfully-dispatched roll expression so the user can press
 * `Up` / `Down` in the slash input to cycle previously-rolled
 * expressions — same shell-history muscle memory every CLI has.
 *
 * Storage: a versioned JSON envelope in localStorage under
 * `gm-encounter-maps-dice-history`. Newest-first list, capped at
 * `MAX_HISTORY` entries (default 30 — generous for a single session,
 * bounded so localStorage can't bloat).
 *
 * Pure module: no DOM, no IDB. Trivially testable.
 */

const KEY = 'gm-encounter-maps-dice-history';
const VERSION = 1;
export const MAX_HISTORY = 30;

interface Envelope {
  version: number;
  /** Newest-first. Each entry is the raw expression the user typed. */
  entries: string[];
}

function read(): Envelope {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: VERSION, entries: [] };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (
      !parsed ||
      parsed.version !== VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return { version: VERSION, entries: [] };
    }
    return {
      version: VERSION,
      entries: parsed.entries.filter(
        (e): e is string => typeof e === 'string' && e.length > 0,
      ),
    };
  } catch {
    return { version: VERSION, entries: [] };
  }
}

function write(env: Envelope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(env));
  } catch (err) {
    // Privacy mode / quota exceeded — history is a convenience, not
    // critical state. Warn so the user can debug, but don't throw.
    console.warn('[dice-history] persist failed', err);
  }
}

/**
 * Record a successful expression. If the entry is already in the
 * history, MOVE IT to the front (deduplicates) — the user's most
 * recent intent is the same regardless of how many times they
 * re-ran it. Trim to `MAX_HISTORY` after insert.
 *
 * Trims whitespace + drops empty entries. No-op for the empty case.
 */
export function recordExpression(expression: string): void {
  const trimmed = expression.trim();
  if (!trimmed) return;
  const env = read();
  const existing = env.entries.findIndex((e) => e === trimmed);
  const next = env.entries.slice();
  if (existing >= 0) {
    next.splice(existing, 1);
  }
  next.unshift(trimmed);
  if (next.length > MAX_HISTORY) {
    next.length = MAX_HISTORY;
  }
  write({ version: VERSION, entries: next });
}

/**
 * Newest-first history list. Empty when nothing recorded yet (or the
 * blob was malformed and discarded). Returns a fresh array — callers
 * are free to mutate without affecting the store.
 */
export function listHistory(): string[] {
  return read().entries.slice();
}

/** Test-only: drop everything. */
export function _resetAll(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}
