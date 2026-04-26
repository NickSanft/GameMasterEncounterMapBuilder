/**
 * Phase 94 — combat log side panel.
 *
 * GM-side complementary region that mirrors `CombatLog.entries()`
 * as a scrollable, exportable list. Toggleable from the session menu
 * and via a future `?` shortcut. Layout mirrors the Notes panel
 * (Phase 38) so the two panels feel like part of the same family.
 *
 * Live updates via `log.subscribe`. The list renders newest-LAST so
 * the user reads top-to-bottom with the most recent event at the
 * bottom (matches how a chat log feels). Auto-scrolls to the bottom
 * on new entries when the user is already pinned to the bottom; if
 * they've scrolled up to read history we don't yank them away.
 */

import type {
  CombatLog,
  CombatLogEntry,
} from '../state/combat-log.js';
import { formatLogEvent, formatClock } from '../state/combat-log.js';

export interface CombatLogPanelOptions {
  log: CombatLog;
}

export interface CombatLogPanelHandle {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function mountCombatLogPanel(
  opts: CombatLogPanelOptions,
): CombatLogPanelHandle {
  const { log } = opts;

  const panel = document.createElement('aside');
  panel.className = 'combat-log-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Combat log');
  panel.hidden = true;

  panel.innerHTML = `
    <header class="combat-log-header">
      <h3>Combat Log</h3>
      <div class="combat-log-actions">
        <button type="button" class="combat-log-export" data-action="export"
          title="Copy the log to your clipboard">Copy</button>
        <button type="button" class="combat-log-clear" data-action="clear"
          title="Forget every recorded event (cannot be undone)">Clear</button>
        <button type="button" class="combat-log-close" aria-label="Close combat log panel">×</button>
      </div>
    </header>
    <p class="combat-log-empty" data-field="empty">
      Combat log is empty. Damage / heal, condition changes, death-save updates, and turn advances will appear here automatically once combat starts.
    </p>
    <ol class="combat-log-list" data-field="list" aria-live="polite" aria-relevant="additions"></ol>
    <footer class="combat-log-footer">
      <span class="combat-log-hint" data-field="hint">0 events · This tab only</span>
    </footer>
  `;
  document.body.appendChild(panel);

  const list = panel.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = panel.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const hint = panel.querySelector<HTMLSpanElement>('[data-field="hint"]')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('.combat-log-close')!;
  const exportBtn = panel.querySelector<HTMLButtonElement>('[data-action="export"]')!;
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-action="clear"]')!;

  let isOpen = false;

  function setOpen(next: boolean) {
    isOpen = next;
    panel.hidden = !next;
    if (next) {
      render();
      // Scroll to the bottom on open so the user sees the latest events first.
      list.scrollTop = list.scrollHeight;
    }
  }

  function nearBottom(): boolean {
    // Within 32 px of the bottom counts as "pinned". Loose threshold
    // because rounded heights + sub-pixel scroll positions can be
    // fiddly across browsers.
    return list.scrollHeight - list.scrollTop - list.clientHeight <= 32;
  }

  function render() {
    const entries = log.entries();
    if (entries.length === 0) {
      empty.hidden = false;
      list.hidden = true;
      // Drop any existing <li> children too — `list.hidden` only
      // hides them visually; without `replaceChildren()` they stay
      // queryable in the DOM (and visible to assertion locators).
      list.replaceChildren();
      hint.textContent = '0 events · This tab only';
      return;
    }
    const wasPinned = nearBottom();
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...entries.map(renderEntry));
    hint.textContent = `${entries.length} event${entries.length === 1 ? '' : 's'} · This tab only`;
    if (wasPinned) list.scrollTop = list.scrollHeight;
  }

  function renderEntry(entry: CombatLogEntry): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `combat-log-entry combat-log-entry-${entry.event.kind}`;
    const time = document.createElement('time');
    time.className = 'combat-log-entry-time';
    time.textContent = formatClock(entry.timestamp);
    const text = document.createElement('span');
    text.className = 'combat-log-entry-text';
    text.textContent = formatLogEvent(entry.event);
    li.appendChild(time);
    li.appendChild(text);
    return li;
  }

  closeBtn.addEventListener('click', () => setOpen(false));
  exportBtn.addEventListener('click', () => {
    const text = log.exportText();
    if (!text) return;
    // Best-effort clipboard write; fall back silently on a failure
    // (clipboard API can require user-gesture context which the click
    // already provides — but some test environments don't support it).
    try {
      void navigator.clipboard?.writeText(text);
      flash(exportBtn, 'Copied!');
    } catch {
      flash(exportBtn, 'Copy failed');
    }
  });
  clearBtn.addEventListener('click', () => {
    if (log.size() === 0) return;
    log.clear();
  });

  function flash(btn: HTMLButtonElement, label: string) {
    const original = btn.textContent;
    btn.textContent = label;
    btn.disabled = true;
    window.setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1200);
  }

  const unsubLog = log.subscribe(() => {
    if (isOpen) render();
  });

  // Initial render so the panel doesn't flash empty when first opened
  // after entries already accumulated (e.g. mid-session toggle).
  render();

  return {
    toggle: () => setOpen(!isOpen),
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => isOpen,
    destroy() {
      unsubLog();
      panel.remove();
    },
  };
}
