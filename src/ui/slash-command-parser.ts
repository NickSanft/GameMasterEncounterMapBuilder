/**
 * Phase 74 — slash-command parser.
 *
 * Pure: takes a raw input string, returns a discriminated `SlashAction`.
 * The UI mounts the floating input + dispatches the action; the parser
 * itself doesn't touch the DOM, so it unit-tests cleanly.
 *
 * Supported commands:
 *   /r <expr>            — roll an expression (alias: /roll)
 *   /d4, /d6, ..., /d100 — shortcut for `1dN`. Modifier suffix allowed
 *                          (`/d20+5` → `1d20+5`)
 *   /init                — auto-roll initiative for unlinked tokens
 *   /help                — open the shortcut overlay
 *   <expr>               — bare expression with no leading `/` is also
 *                          treated as a roll (so a user can paste
 *                          `2d6+3` and hit Enter without prefixing)
 *
 * Unknown / malformed input returns `{ kind: 'unknown', raw }` — the
 * UI surfaces an inline error rather than triggering a side-effect.
 */

export type SlashAction =
  | { kind: 'empty' }
  | { kind: 'roll'; expression: string }
  | { kind: 'init' }
  | { kind: 'help' }
  | { kind: 'unknown'; raw: string };

const QUICK_DIE_REGEX = /^d(\d{1,4})([+\-].*)?$/i;

/**
 * Parse a slash-command input. Returns the action the caller should
 * dispatch. Whitespace around the input is trimmed; matching is
 * case-insensitive on commands but preserves case on the expression
 * payload (the dice parser doesn't care, but echoing back matches
 * what the user typed).
 */
export function parseSlashCommand(raw: string): SlashAction {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'empty' };

  // Bare expression (no leading `/`) → roll.
  if (!trimmed.startsWith('/')) {
    return { kind: 'roll', expression: trimmed };
  }

  // Strip the leading `/` and split into command + payload.
  const body = trimmed.slice(1).trim();
  if (body.length === 0) return { kind: 'empty' };

  // Split on first whitespace to separate `/cmd` from the rest.
  const spaceIdx = body.search(/\s/);
  const cmdRaw = spaceIdx === -1 ? body : body.slice(0, spaceIdx);
  const payload = spaceIdx === -1 ? '' : body.slice(spaceIdx + 1).trim();
  const cmd = cmdRaw.toLowerCase();

  if (cmd === 'r' || cmd === 'roll') {
    if (payload.length === 0) {
      return { kind: 'unknown', raw: trimmed };
    }
    return { kind: 'roll', expression: payload };
  }

  if (cmd === 'init' || cmd === 'initiative') {
    return { kind: 'init' };
  }

  if (cmd === 'help' || cmd === '?') {
    return { kind: 'help' };
  }

  // /d4, /d6, ..., /d100 — and /d20+5 style. The whole `cmdRaw`
  // (NOT `cmd`, so we preserve any sign/operators) is the candidate.
  const m = cmdRaw.match(QUICK_DIE_REGEX);
  if (m) {
    const sides = parseInt(m[1]!, 10);
    if (sides >= 1 && sides <= 9999) {
      const modifier = m[2] ?? '';
      // Re-stitch into a real dice expression. Any payload after a
      // space (`/d20 +5`) is appended too — supports both `/d20+5`
      // and `/d20 +5` ergonomically.
      const expression = `1d${sides}${modifier}${payload ? ' ' + payload : ''}`;
      return { kind: 'roll', expression };
    }
  }

  return { kind: 'unknown', raw: trimmed };
}

/**
 * One-line hint string the input can show as placeholder text. Lists
 * the headline commands without overwhelming the user.
 */
export const SLASH_PLACEHOLDER =
  '/r 1d20+5  ·  /d20  ·  /init  ·  /help';

/**
 * Short error message for an unknown / malformed slash command. The
 * caller passes the original `raw` input back so the message can
 * reference it specifically.
 */
export function unknownCommandMessage(raw: string): string {
  return `Unknown command: ${raw}. Try /r 1d20+5, /d20, or /init.`;
}
