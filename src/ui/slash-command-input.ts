/**
 * Phase 74 — floating slash-command input.
 *
 * Press `/` (when not typing in another field) to pop a small input
 * pinned to the top-center of the viewport. Type a slash command
 * (`/r 1d20+5`, `/d20`, `/init`, `/help`) or a bare expression
 * (`2d6+3`); Enter dispatches; Escape cancels.
 *
 * The input is intentionally a tiny one-liner — not a full chat panel.
 * It's a power-user shortcut: rolls happen without opening the dice
 * panel modal, initiative auto-rolls without opening the tracker
 * modal. The animated dice tray (Phase 73) still pops for rolls,
 * giving visual feedback.
 *
 * Phase 107 — successful roll expressions get pushed to a
 * localStorage-backed history (`src/state/dice-history.ts`).
 * Up / Down arrows cycle through previously-rolled expressions,
 * matching the every-CLI shell-history convention. Typing any
 * character resets the cursor so the user can edit the recalled
 * expression without losing it from the history.
 */

import {
  parseSlashCommand,
  unknownCommandMessage,
  SLASH_PLACEHOLDER,
  type SlashAction,
} from './slash-command-parser.js';
import { rememberFocus, restoreFocus } from '../util/focus.js';
import { listHistory, recordExpression } from '../state/dice-history.js';

export interface SlashCommandInputHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface SlashCommandInputOptions {
  /**
   * Called when the user enters a parsed action. Return a string to
   * surface as an inline error (e.g. "GM-only command"); return
   * undefined / void on success — the input closes.
   */
  onCommand(action: SlashAction): string | void | Promise<string | void>;
}

export function mountSlashCommandInput(
  opts: SlashCommandInputOptions,
): SlashCommandInputHandle {
  const wrap = document.createElement('div');
  wrap.className = 'slash-input';
  wrap.hidden = true;
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Slash command');
  wrap.innerHTML = `
    <span class="slash-input-prefix" aria-hidden="true">/</span>
    <input
      type="text"
      class="slash-input-field"
      data-field="input"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="${SLASH_PLACEHOLDER}"
      aria-label="Slash command — type /r 1d20+5, /d20, /init, or /help"
    />
    <span class="slash-input-error" data-field="error" role="alert" aria-live="polite"></span>
  `;
  document.body.appendChild(wrap);

  const input = wrap.querySelector<HTMLInputElement>('[data-field="input"]')!;
  const errorEl = wrap.querySelector<HTMLSpanElement>('[data-field="error"]')!;

  let triggerFocus: HTMLElement | null = null;
  // Phase 107 — history cursor. -1 = "showing the live draft" (the
  // text the user typed before pressing Up the first time). 0+ = an
  // index into `historySnapshot`, newest-first. Each `open()` snapshots
  // the history once so a roll dispatched mid-session doesn't shift
  // the cursor underneath the user.
  let historySnapshot: string[] = [];
  let historyCursor = -1;
  /**
   * The text the user had typed BEFORE pressing Up the first time.
   * Restored when they press Down past the newest entry. Without this
   * snapshot, "I typed half a custom expression then pressed Up" loses
   * the half-expression on the way back.
   */
  let liveDraft = '';

  /**
   * The visual `/` prefix in the chrome implies the user types the
   * BODY of the command, Discord-style (so `r 1d20+5` is the same as
   * typing `/r 1d20+5`). Bare dice expressions like `1d20+5` keep
   * working: we only prepend the `/` when the input doesn't already
   * start with one AND doesn't look like a literal dice expression
   * (which the parser handles via its bare-expression branch).
   */
  function normalizeInput(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return '';
    if (trimmed.startsWith('/')) return trimmed;
    // Looks like a dice expression (count + d + sides) — pass through
    // so the parser's bare-expression path picks it up.
    if (/^\d+d\d+/i.test(trimmed)) return trimmed;
    return `/${trimmed}`;
  }

  function setError(msg: string | null) {
    if (!msg) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
      return;
    }
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }

  function open() {
    if (!wrap.hidden) return;
    triggerFocus = rememberFocus();
    wrap.hidden = false;
    input.value = '';
    setError(null);
    // Phase 107 — snapshot history once per open. Reset the cursor
    // and the live-draft tracker so each session of the input starts
    // at "fresh draft, no history selected."
    historySnapshot = listHistory();
    historyCursor = -1;
    liveDraft = '';
    // The bound `/` keypress that opened us also fires a `keypress`
    // event that some browsers route to the now-focused input,
    // pre-typing a `/` character. Defer the focus a frame so the
    // character event lands BEFORE focus moves; clear after.
    window.setTimeout(() => {
      input.focus();
      // Belt-and-suspenders: if a `/` did sneak in, drop it so the
      // user starts from an empty field.
      if (input.value === '/') input.value = '';
    }, 0);
  }

  function close() {
    if (wrap.hidden) return;
    if (wrap.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    wrap.hidden = true;
    setError(null);
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function toggle() {
    if (wrap.hidden) open();
    else close();
  }

  async function dispatch() {
    // Phase 107 — capture the user's raw input BEFORE normalization
    // so we record what they typed (e.g. `2d6+3` not `/r 2d6+3`),
    // matching what they'd want to recall via Up arrow next time.
    const rawForHistory = input.value.trim();
    const action = parseSlashCommand(normalizeInput(input.value));
    if (action.kind === 'empty') {
      close();
      return;
    }
    if (action.kind === 'unknown') {
      setError(unknownCommandMessage(action.raw));
      input.select();
      return;
    }
    setError(null);
    let errMsg: string | void;
    try {
      errMsg = await opts.onCommand(action);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[slash-command] handler threw', err);
      errMsg = 'Command failed — see console.';
    }
    if (errMsg) {
      setError(errMsg);
      input.select();
      return;
    }
    // Phase 107 — record successful roll dispatches in the history.
    // We deliberately ONLY record `roll` actions; cycling through
    // `/init` or `/help` doesn't make sense (those are one-shot
    // commands without a meaningful expression payload to recall).
    if (action.kind === 'roll' && rawForHistory.length > 0) {
      recordExpression(rawForHistory);
    }
    close();
  }

  /**
   * Phase 107 — show the history entry at `index` (newest = 0). When
   * `index === -1` we restore the live draft (the text the user had
   * typed before pressing Up). Updates the cursor + sets the input
   * value; selects all so the next keystroke replaces the recall in
   * place (matches shell history-recall ergonomics).
   */
  function showHistoryAt(index: number): void {
    if (index < 0) {
      historyCursor = -1;
      input.value = liveDraft;
    } else {
      historyCursor = index;
      input.value = historySnapshot[index] ?? '';
    }
    // Place cursor at end so further typing appends rather than
    // overwriting (Up→Up→Up means "show me older entries", and the
    // user typically appends a modifier rather than replacing wholesale).
    input.setSelectionRange(input.value.length, input.value.length);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void dispatch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowUp') {
      // Up = move toward older entries.
      if (historySnapshot.length === 0) return;
      e.preventDefault();
      // First Up press from "live draft" → save current value as the
      // draft so Down can restore it later.
      if (historyCursor === -1) {
        liveDraft = input.value;
      }
      const next = Math.min(historyCursor + 1, historySnapshot.length - 1);
      if (next === historyCursor) return; // already at oldest entry
      showHistoryAt(next);
    } else if (e.key === 'ArrowDown') {
      // Down = move toward newer entries; past newest restores live draft.
      if (historyCursor === -1) return; // already showing live draft
      e.preventDefault();
      const next = historyCursor - 1;
      showHistoryAt(next); // -1 restores live draft
    }
  });

  // Phase 107 — typing any character invalidates the history-recall
  // cursor: from the user's POV they're now editing a fresh expression
  // (possibly building on the recalled one). Subsequent Up presses
  // should walk from the newest entry again, not from wherever they
  // left off mid-recall.
  input.addEventListener('input', () => {
    if (historyCursor !== -1) {
      historyCursor = -1;
      // Don't clobber liveDraft — the user may have typed atop a
      // recalled entry, and pressing Up again should snapshot what
      // they have NOW, not the earlier draft.
      liveDraft = input.value;
    }
  });

  // A click outside the input dismisses (matches modal behavior).
  // We listen on the wrap itself since pointer-events on it pass
  // through except inside the input box; clicking the chrome around
  // the input closes.
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) close();
  });

  return {
    open,
    close,
    toggle,
    isOpen: () => !wrap.hidden,
    destroy() {
      wrap.remove();
    },
  };
}
