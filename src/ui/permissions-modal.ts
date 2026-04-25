/**
 * Phase 82 — GM-side per-Spectator permissions manager.
 *
 * Modal listing every currently-connected Spectator (sourced from
 * the IdentityRegistry) with two checkboxes per row — `canPing` and
 * `canRoll` — plus a "Reset" link to clear the override.
 *
 * Default = full permissions. The GM only needs to open this modal
 * to RESTRICT a specific player ("this Spectator keeps spamming the
 * map with pings; turn that off"). Most sessions will never touch
 * the modal.
 *
 * The modal updates live as Spectators join / leave (subscribes to
 * the registry) and as the permissions store changes (so two open
 * GM tabs see each other's edits — though the localStorage backing
 * doesn't auto-broadcast across tabs; a future polish could wire the
 * `storage` event).
 */

import type { IdentityRegistry, PlayerIdentity } from '../state/player-identity.js';
import type {
  SpectatorPermissions,
  SpectatorPermissionsStore,
} from '../state/spectator-permissions.js';
import { DEFAULT_PERMISSIONS } from '../state/spectator-permissions.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface PermissionsModalHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface PermissionsModalOptions {
  registry: IdentityRegistry;
  store: SpectatorPermissionsStore;
  /**
   * Called whenever the GM mutates a Spectator's permissions, so the
   * GM entry can broadcast the new value over the sync channel and
   * the Spectator's UI updates immediately.
   */
  onChange(playerId: string, perms: SpectatorPermissions): void;
}

export function mountPermissionsModal(
  opts: PermissionsModalOptions,
): PermissionsModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal permissions-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Spectator permissions');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Spectator permissions</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="permissions-hint">
        Default: every Spectator can roll dice. Use the toggles below
        to revoke a specific Spectator's permission; leave them alone
        for the everyone-can-roll default.
      </p>
      <ul class="permissions-list" data-field="list" aria-label="Connected spectators"></ul>
      <p class="permissions-empty" data-field="empty" hidden>
        No spectators connected. When a player joins, they'll appear here.
      </p>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLUListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;

  function render() {
    const all = opts.registry.list();
    const spectators = all.filter((p) => p.role === 'spectator');
    list.innerHTML = '';
    if (spectators.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const p of spectators) {
      list.appendChild(renderRow(p));
    }
  }

  function renderRow(p: PlayerIdentity): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'permissions-row';
    li.dataset.playerId = p.id;

    const header = document.createElement('div');
    header.className = 'permissions-row-header';
    const dot = document.createElement('span');
    dot.className = 'permissions-row-dot';
    dot.style.background = p.color;
    dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'permissions-row-name';
    name.textContent = p.name;
    header.appendChild(dot);
    header.appendChild(name);
    li.appendChild(header);

    const current = opts.store.get(p.id);

    const toggles = document.createElement('div');
    toggles.className = 'permissions-toggles';
    toggles.appendChild(
      buildToggle(p.id, current, 'canRoll', 'Roll dice + share results'),
    );
    li.appendChild(toggles);

    // "Reset" link only shown when the row diverges from the default.
    const overridden = current.canRoll !== DEFAULT_PERMISSIONS.canRoll;
    if (overridden) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'permissions-reset';
      resetBtn.textContent = 'Reset to defaults';
      resetBtn.addEventListener('click', () => {
        opts.store.reset(p.id);
        opts.onChange(p.id, DEFAULT_PERMISSIONS);
        render();
      });
      li.appendChild(resetBtn);
    }
    return li;
  }

  function buildToggle(
    playerId: string,
    current: SpectatorPermissions,
    field: keyof SpectatorPermissions,
    label: string,
  ): HTMLLabelElement {
    const wrap = document.createElement('label');
    wrap.className = 'permissions-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = current[field];
    cb.addEventListener('change', () => {
      const next: SpectatorPermissions = { ...current, [field]: cb.checked };
      opts.store.set(playerId, next);
      opts.onChange(playerId, next);
      // Re-render so the "Reset" affordance + checkbox state stay in sync
      // (and so a later interaction reads the updated current permissions).
      render();
    });
    const text = document.createElement('span');
    text.textContent = label;
    wrap.appendChild(cb);
    wrap.appendChild(text);
    return wrap;
  }

  function open() {
    if (!backdrop.hidden) return;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    render();
    window.setTimeout(() => closeBtn.focus(), 0);
  }

  function close() {
    if (backdrop.hidden) return;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function toggle() {
    if (backdrop.hidden) open();
    else close();
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  // Re-render live as the registry mutates (a Spectator joins / leaves)
  // OR when the permissions store changes (e.g. the GM toggled
  // something via THIS modal — needed so the "Reset" affordance shows
  // up immediately when the user diverges from defaults).
  const unsubRegistry = opts.registry.subscribe(() => {
    if (!backdrop.hidden) render();
  });
  const unsubStore = opts.store.subscribe(() => {
    if (!backdrop.hidden) render();
  });

  return {
    open,
    close,
    toggle,
    isOpen: () => !backdrop.hidden,
    destroy() {
      unsubRegistry();
      unsubStore();
      backdrop.remove();
    },
  };
}
