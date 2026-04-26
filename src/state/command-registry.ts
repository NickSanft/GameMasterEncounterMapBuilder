/**
 * Phase 95 — searchable command palette registry.
 *
 * Pure-state, DOM-free helpers. The palette UI imports `match()` to
 * filter the visible list as the user types; the entry registers its
 * actions at boot via `register()`.
 *
 * `Command.run()` does whatever the action does (open a modal,
 * activate a tool, dispatch a patch). `id` must be unique — a second
 * `register()` with the same id replaces the first (lets later code
 * override an earlier registration without leaking duplicates).
 *
 * Matching is simple + intentionally not fuzzy: case-insensitive
 * substring on `label + hint`, with a 3-tier ranking so common
 * patterns like "switch to" / "open " / etc. behave intuitively:
 *
 *   1. Prefix match on label  (e.g. "Switch" → "Switch to Select tool")
 *   2. Word-boundary match    (e.g. "select" → "Switch to Select tool")
 *   3. Substring match        (e.g. "elect" → "Switch to Select tool")
 *
 * Empty query returns the full list in registration order.
 */

export interface Command {
  /** Stable id; second `register()` with the same id overwrites the first. */
  id: string;
  /** Visible label, e.g. "Switch to Select tool". */
  label: string;
  /** Optional secondary text shown in muted style next to the label. */
  hint?: string;
  /** Optional category for visual grouping ("Tools", "Camera", etc.). */
  group?: string;
  /** Optional keyboard shortcut hint, e.g. "Ctrl+K" — display only. */
  shortcut?: string;
  /** Invoked when the user picks the action. */
  run(): void;
}

export interface CommandMatch {
  command: Command;
  /** 0 = prefix, 1 = word-boundary, 2 = substring. Lower wins. */
  rank: number;
  /** Index of the first match in the haystack (label + hint). */
  position: number;
}

export interface CommandRegistry {
  register(command: Command): void;
  /** Remove a command by id. No-op if not registered. */
  unregister(id: string): void;
  /** All registered commands in registration order. */
  list(): Command[];
  /**
   * Filter + rank by query. Empty / whitespace query returns every
   * command in registration order. Matches sort by rank ascending,
   * then by position ascending, then by registration order.
   */
  match(query: string): CommandMatch[];
  /** Forget every registered command. */
  clear(): void;
}

export function createCommandRegistry(): CommandRegistry {
  const byId = new Map<string, Command>();
  const order: string[] = [];

  function add(cmd: Command) {
    if (byId.has(cmd.id)) {
      // Replace in-place; preserve registration order for the id.
      byId.set(cmd.id, cmd);
      return;
    }
    byId.set(cmd.id, cmd);
    order.push(cmd.id);
  }

  function remove(id: string) {
    if (!byId.has(id)) return;
    byId.delete(id);
    const idx = order.indexOf(id);
    if (idx >= 0) order.splice(idx, 1);
  }

  function listAll(): Command[] {
    const out: Command[] = [];
    for (const id of order) {
      const c = byId.get(id);
      if (c) out.push(c);
    }
    return out;
  }

  return {
    register: add,
    unregister: remove,
    list: listAll,
    clear() {
      byId.clear();
      order.length = 0;
    },
    match(query) {
      const q = query.trim().toLowerCase();
      if (q === '') {
        return listAll().map((command, position) => ({
          command,
          rank: 2,
          position,
        }));
      }
      const matches: CommandMatch[] = [];
      let regOrder = 0;
      for (const id of order) {
        const cmd = byId.get(id);
        if (!cmd) continue;
        const haystack = `${cmd.label} ${cmd.hint ?? ''}`.toLowerCase();
        const idx = haystack.indexOf(q);
        regOrder++;
        if (idx < 0) continue;
        const rank = rankFor(cmd.label.toLowerCase(), q, idx);
        matches.push({ command: cmd, rank, position: idx });
      }
      matches.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.position !== b.position) return a.position - b.position;
        return order.indexOf(a.command.id) - order.indexOf(b.command.id);
      });
      void regOrder;
      return matches;
    },
  };
}

function rankFor(labelLower: string, query: string, posInHaystack: number): number {
  // 0 = prefix on label.
  if (labelLower.startsWith(query)) return 0;
  // 1 = word-boundary somewhere in label / hint (preceded by space).
  // Check label first (cheap), then haystack would be the position-aware path.
  const wordBoundary = labelLower.indexOf(` ${query}`);
  if (wordBoundary >= 0) return 1;
  // Same idea for hint — but `posInHaystack` is over `label + " " + hint`,
  // so a position ≥ label.length+1 means the match landed in the hint.
  // We treat hint matches the same as substring (rank 2) so they don't
  // outrank label-substring matches.
  void posInHaystack;
  return 2;
}
