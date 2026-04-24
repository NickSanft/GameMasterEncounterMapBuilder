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
 * Keeps no history of its own — the dice panel's roll history is
 * the canonical record. The input is fire-and-forget.
 */

import {
  parseSlashCommand,
  unknownCommandMessage,
  SLASH_PLACEHOLDER,
  type SlashAction,
} from './slash-command-parser.js';
import { rememberFocus, restoreFocus } from '../util/focus.js';

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
    close();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void dispatch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
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
