/**
 * Phase 95 — searchable command palette UI.
 *
 * Modal opened by Ctrl+K (Cmd+K on Mac). Shows a fuzzy-filterable
 * list of every registered action — switch tools, open modals, jump
 * to scenes, advance initiative, etc. Pick with ↑/↓ + Enter, or
 * just keep typing until the right action is highlighted.
 *
 * Filter logic lives in `command-registry.ts`; this module is purely
 * presentation:
 *   - Mounts a backdrop + modal at construction (hidden until open).
 *   - On `open()`: refreshes the registry snapshot, focuses the input,
 *     selects all (so the next keystroke replaces any old query).
 *   - As the user types: re-runs `registry.match(query)` and renders
 *     the result list. Highlighted index resets to 0 on each filter.
 *   - Enter: invokes `command.run()` + closes.
 *   - Esc / backdrop click: closes without running anything.
 *
 * Mirrors the focus-trap + restore pattern of the other modals.
 */

import type {
  Command,
  CommandMatch,
  CommandRegistry,
} from '../state/command-registry.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface CommandPaletteOptions {
  registry: CommandRegistry;
}

export interface CommandPaletteHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

const MAX_VISIBLE = 50;

export function mountCommandPalette(
  opts: CommandPaletteOptions,
): CommandPaletteHandle {
  const { registry } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop command-palette-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal command-palette';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Command palette');
  modal.innerHTML = `
    <div class="command-palette-input-row">
      <span class="command-palette-prefix" aria-hidden="true">›</span>
      <input
        type="text"
        class="command-palette-input"
        data-field="query"
        placeholder="Search actions… (↑↓ to navigate, Enter to run, Esc to cancel)"
        aria-label="Search actions"
        aria-autocomplete="list"
        aria-controls="command-palette-list"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <ol
      id="command-palette-list"
      class="command-palette-list"
      role="listbox"
      data-field="list"
    ></ol>
    <p class="command-palette-empty" data-field="empty" hidden>
      No matching actions.
    </p>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const input = modal.querySelector<HTMLInputElement>('[data-field="query"]')!;
  const list = modal.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;

  let triggerFocus: HTMLElement | null = null;
  let isOpen = false;
  let matches: CommandMatch[] = [];
  let activeIndex = 0;

  function open() {
    if (isOpen) return;
    isOpen = true;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    input.value = '';
    refresh();
    // setTimeout(0) — without this, focus gets eaten by the keydown
    // event that triggered open() in the first place (Ctrl+K bubbling
    // to the modal's tab-trap before the focus call completes).
    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function refresh() {
    const query = input.value;
    matches = registry.match(query).slice(0, MAX_VISIBLE);
    activeIndex = 0;
    if (matches.length === 0) {
      empty.hidden = false;
      list.replaceChildren();
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...matches.map((m, i) => renderItem(m, i)));
    syncActive();
  }

  function renderItem(m: CommandMatch, i: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'command-palette-item';
    li.setAttribute('role', 'option');
    li.dataset.index = String(i);
    li.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
    if (m.command.group) {
      const group = document.createElement('span');
      group.className = 'command-palette-item-group';
      group.textContent = m.command.group;
      li.appendChild(group);
    }
    const label = document.createElement('span');
    label.className = 'command-palette-item-label';
    label.textContent = m.command.label;
    li.appendChild(label);
    if (m.command.hint) {
      const hint = document.createElement('span');
      hint.className = 'command-palette-item-hint';
      hint.textContent = m.command.hint;
      li.appendChild(hint);
    }
    if (m.command.shortcut) {
      const shortcut = document.createElement('kbd');
      shortcut.className = 'command-palette-item-shortcut';
      shortcut.textContent = m.command.shortcut;
      li.appendChild(shortcut);
    }
    li.addEventListener('mousemove', () => {
      if (activeIndex !== i) {
        activeIndex = i;
        syncActive();
      }
    });
    li.addEventListener('click', () => runActive());
    return li;
  }

  function syncActive() {
    const items = list.querySelectorAll<HTMLLIElement>('.command-palette-item');
    items.forEach((el, i) => {
      el.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      if (i === activeIndex) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }

  function runActive() {
    const m = matches[activeIndex];
    if (!m) return;
    const cmd: Command = m.command;
    close();
    // Defer the run() so the close-induced focus restore doesn't
    // race with the action's own focus management (e.g. opening the
    // Settings modal).
    window.setTimeout(() => {
      try {
        cmd.run();
      } catch (err) {
        console.warn('[command-palette] action threw', cmd.id, err);
      }
    }, 0);
  }

  input.addEventListener('input', refresh);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      activeIndex = Math.min(matches.length - 1, activeIndex + 1);
      syncActive();
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowUp') {
      activeIndex = Math.max(0, activeIndex - 1);
      syncActive();
      e.preventDefault();
      return;
    }
    if (e.key === 'Home') {
      activeIndex = 0;
      syncActive();
      e.preventDefault();
      return;
    }
    if (e.key === 'End') {
      activeIndex = Math.max(0, matches.length - 1);
      syncActive();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      runActive();
      e.preventDefault();
      return;
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      close();
      e.preventDefault();
    }
  });

  return {
    open,
    close,
    toggle: () => (isOpen ? close() : open()),
    isOpen: () => isOpen,
    destroy() {
      backdrop.remove();
    },
  };
}
