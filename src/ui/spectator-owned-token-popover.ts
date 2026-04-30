/**
 * Phase 128 — Spectator-side quick-edit popover for owned tokens.
 *
 * Right-click an owned token on the spectator canvas → a small floating
 * popover anchored at the click point opens with two affordances:
 *   1. **HP nudge buttons** (-5, -1, +1, +5) — fires a constrained
 *      `token-claim-update` carrying the new `hp` value. Hidden when
 *      the token doesn't track HP at all (Token.hp === null).
 *   2. **Condition checkboxes** — one per Phase 50 preset condition.
 *      Toggling fires another `token-claim-update` with the new
 *      `conditions` array (and a stripped expiration timer if the
 *      condition is being removed).
 *
 * The GM-side enforces the allowlist (hp / conditions / conditionExpirations).
 * Anything the popover sends outside that allowlist is dropped silently
 * on receipt — defense against a tampered popover trying to rename or
 * recolor a token.
 *
 * Pure UI module. The host wires the data accessors + the broadcast.
 * Closes on outside-click or Escape.
 */

import type { Token, TokenHp } from '../state/types.js';
import {
  CONDITION_PRESETS,
  addCondition,
  removeCondition,
} from '../state/conditions.js';

export interface OwnedTokenPopoverOptions {
  /** Returns the live token (so HP / condition reads are fresh). */
  getToken(tokenId: string): Token | null;
  /**
   * Fires when the user nudges HP / toggles a condition. The host
   * builds the `token-claim-update` SyncMessage from this. The
   * `changes` payload only ever carries fields in the GM-side
   * allowlist (`hp`, `conditions`, `conditionExpirations`).
   */
  onClaimUpdate(tokenId: string, changes: Partial<Token>): void;
}

export interface OwnedTokenPopoverHandle {
  /** Open the popover for `tokenId` anchored at the screen point. */
  open(tokenId: string, screenX: number, screenY: number): void;
  /** Close + remove the popover. Idempotent. */
  close(): void;
  /**
   * Re-render the popover contents from current `getToken` data.
   * Host calls this on store changes so HP / condition checkboxes
   * stay in sync after the GM-authoritative patch round-trips back.
   * Cheap no-op when the popover is closed.
   */
  refresh(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function mountOwnedTokenPopover(
  opts: OwnedTokenPopoverOptions,
): OwnedTokenPopoverHandle {
  const { getToken, onClaimUpdate } = opts;

  const popover = document.createElement('div');
  popover.className = 'owned-token-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Quick edit (your token)');
  popover.hidden = true;
  popover.tabIndex = -1;
  document.body.appendChild(popover);

  let openTokenId: string | null = null;

  function clampHpDelta(current: TokenHp, delta: number): TokenHp {
    const nextCurrent = Math.max(0, Math.min(current.max, current.current + delta));
    return { ...current, current: nextCurrent };
  }

  function render() {
    if (openTokenId === null) {
      popover.replaceChildren();
      return;
    }
    const token = getToken(openTokenId);
    if (!token) {
      close();
      return;
    }
    popover.replaceChildren();

    const header = document.createElement('div');
    header.className = 'owned-token-popover-header';
    const title = document.createElement('strong');
    title.textContent = token.label || 'Your token';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'owned-token-popover-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    popover.appendChild(header);

    if (token.hp) {
      const hpRow = document.createElement('div');
      hpRow.className = 'owned-token-popover-hp';
      const hpLabel = document.createElement('span');
      hpLabel.className = 'owned-token-popover-hp-label';
      hpLabel.textContent = `HP ${token.hp.current} / ${token.hp.max}`;
      hpRow.appendChild(hpLabel);

      const buttons = document.createElement('div');
      buttons.className = 'owned-token-popover-hp-buttons';
      for (const delta of [-5, -1, +1, +5]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = delta > 0 ? `+${delta}` : `${delta}`;
        btn.addEventListener('click', () => {
          if (!token.hp) return;
          const nextHp = clampHpDelta(token.hp, delta);
          if (
            nextHp.current === token.hp.current &&
            nextHp.max === token.hp.max
          ) {
            return;
          }
          onClaimUpdate(token.id, { hp: nextHp });
        });
        buttons.appendChild(btn);
      }
      hpRow.appendChild(buttons);
      popover.appendChild(hpRow);
    }

    const condFieldset = document.createElement('fieldset');
    condFieldset.className = 'owned-token-popover-conditions';
    const legend = document.createElement('legend');
    legend.textContent = 'Conditions';
    condFieldset.appendChild(legend);
    for (const preset of CONDITION_PRESETS) {
      const row = document.createElement('label');
      row.className = 'owned-token-popover-condition-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = token.conditions.includes(preset.id);
      cb.addEventListener('change', () => {
        const live = getToken(token.id);
        if (!live) return;
        const isAdding = !live.conditions.includes(preset.id);
        const nextConditions = isAdding
          ? addCondition(live.conditions, preset.id)
          : removeCondition(live.conditions, preset.id);
        const changes: Partial<Token> = { conditions: nextConditions };
        // Strip the expiration timer for a removed condition so a
        // re-added condition doesn't pick up a stale countdown.
        if (
          !isAdding &&
          live.conditionExpirations[preset.id] !== undefined
        ) {
          const nextExpirations = { ...live.conditionExpirations };
          delete nextExpirations[preset.id];
          changes.conditionExpirations = nextExpirations;
        }
        onClaimUpdate(token.id, changes);
      });
      const swatch = document.createElement('span');
      swatch.className = 'owned-token-popover-condition-swatch';
      swatch.style.background = preset.color;
      const name = document.createElement('span');
      name.textContent = preset.label;
      row.appendChild(cb);
      row.appendChild(swatch);
      row.appendChild(name);
      condFieldset.appendChild(row);
    }
    popover.appendChild(condFieldset);
  }

  function reposition(screenX: number, screenY: number): void {
    const margin = 8;
    // Show first so getBoundingClientRect reads live size.
    popover.hidden = false;
    const rect = popover.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    popover.style.left = `${Math.min(Math.max(margin, screenX), maxX)}px`;
    popover.style.top = `${Math.min(Math.max(margin, screenY), maxY)}px`;
  }

  function open(tokenId: string, screenX: number, screenY: number): void {
    openTokenId = tokenId;
    render();
    reposition(screenX, screenY);
    window.setTimeout(() => popover.focus(), 0);
  }

  function close(): void {
    if (openTokenId === null && popover.hidden) return;
    openTokenId = null;
    popover.hidden = true;
    popover.replaceChildren();
  }

  // Re-render after each open call (initial render in `open`); for
  // mid-popover store changes the host can call `open` again with the
  // same tokenId + coordinates.

  popover.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  // Outside-click to close. Use mousedown so we react before the next
  // click handler runs; capture-phase so our listener wins over canvas
  // pointerdown handlers that might run first.
  document.addEventListener(
    'mousedown',
    (e) => {
      if (popover.hidden) return;
      if (e.target instanceof Node && popover.contains(e.target)) return;
      close();
    },
    true,
  );

  return {
    open,
    close,
    refresh: () => {
      if (openTokenId !== null) render();
    },
    isOpen: () => openTokenId !== null,
    destroy: () => popover.remove(),
  };
}
