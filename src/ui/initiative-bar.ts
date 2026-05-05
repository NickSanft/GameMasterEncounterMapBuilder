import type { Store } from '../state/store.js';
import type { ID, Token, ViewMode } from '../state/types.js';
import { advanceInitiative, retreatInitiative } from '../state/initiative.js';
import { getImageURL } from '../images/store.js';
import { hpFraction, hpBarColor } from '../state/token-hp.js';
import { getConditionPreset } from '../state/conditions.js';
import {
  activeTurnKey,
  computeTimerView,
  createTurnTimerState,
  formatTimer,
  type TurnTimerUrgency,
} from '../state/turn-timer.js';

export interface InitiativeBarActions {
  onOpenTracker?: () => void;
  /**
   * Phase 93 — current turn-timer duration in seconds (`0` disables).
   * Polled per-render so a Settings change applies on the next state
   * tick without a full bar re-mount.
   */
  getTurnTimerSeconds?: () => number;
  /**
   * Phase 93 — fired once when the timer hits 0 (per turn). The host
   * routes it to the live-region announcer so screen-reader users
   * hear "Time" without watching the visual countdown.
   */
  onTimerExpired?: (label: string) => void;
  /**
   * Phase 155 — host-supplied "advance turn" handler. When provided,
   * the bar's Next button delegates to it (the host wires auto-skip
   * past dead tokens + combat-log emission). When omitted, the bar
   * falls back to the pre-155 inline `advanceInitiative` + patch
   * sequence — used by Spectator views which don't author skips.
   */
  onAdvanceTurn?: () => void;
}

export interface InitiativeBarHandle {
  destroy(): void;
}

export function mountInitiativeBar(
  store: Store,
  viewMode: ViewMode,
  actions: InitiativeBarActions = {},
): InitiativeBarHandle {
  const bar = document.createElement('div');
  bar.className = 'initiative-bar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-label', 'Combat initiative');
  bar.hidden = true;

  const roundEl = document.createElement('span');
  roundEl.className = 'initiative-bar-round';

  // Phase 147 — colored pip showing the active token's color +
  // border. Visible on both GM and Spectator. Helps players (and
  // the GM scanning the canvas) match the active-name in the bar
  // to the actual token on the map without having to hunt for the
  // pulsing ring (Phase 144).
  const pipEl = document.createElement('span');
  pipEl.className = 'initiative-bar-pip';
  pipEl.setAttribute('aria-hidden', 'true');

  const labelEl = document.createElement('button');
  labelEl.type = 'button';
  labelEl.className = 'initiative-bar-label';
  labelEl.addEventListener('click', () => {
    actions.onOpenTracker?.();
    labelEl.blur();
  });

  // Phase 164 — hover popover with portrait + HP bar + condition
  // chips. Shown on `mouseenter` / `focus` of the label; hidden
  // on `mouseleave` / `blur`. Anchored near the label using
  // `getBoundingClientRect()` at show-time so the position is
  // always current even if the bar layout shifts.
  const popover = document.createElement('div');
  popover.className = 'initiative-bar-popover';
  popover.setAttribute('role', 'tooltip');
  popover.hidden = true;
  document.body.appendChild(popover);

  function renderPopoverFor(token: Token | null): void {
    popover.replaceChildren();
    if (!token) return;
    // Portrait row.
    const head = document.createElement('div');
    head.className = 'initiative-bar-popover-head';
    if (token.imageId) {
      const portrait = document.createElement('div');
      portrait.className = 'initiative-bar-popover-portrait';
      portrait.style.backgroundColor = token.color;
      head.appendChild(portrait);
      void getImageURL(token.imageId).then((url) => {
        if (url) {
          portrait.style.backgroundImage = `url(${CSS.escape(url)})`;
          portrait.style.backgroundSize = 'cover';
          portrait.style.backgroundPosition = 'center';
        }
      });
    } else {
      const dot = document.createElement('div');
      dot.className = 'initiative-bar-popover-dot';
      dot.style.backgroundColor = token.color;
      head.appendChild(dot);
    }
    const name = document.createElement('span');
    name.className = 'initiative-bar-popover-name';
    name.textContent = token.label || '—';
    head.appendChild(name);
    popover.appendChild(head);

    // HP bar (shared HPs only — GM-only HPs hide here too because
    // the popover may be visible to a Spectator running their bar).
    if (token.hp && token.hp.visibility === 'shared') {
      const hpRow = document.createElement('div');
      hpRow.className = 'initiative-bar-popover-hp-row';
      const bar = document.createElement('div');
      bar.className = 'initiative-bar-popover-hp-bar';
      const fill = document.createElement('div');
      fill.className = 'initiative-bar-popover-hp-fill';
      const frac = hpFraction(token.hp);
      fill.style.width = `${Math.round(frac * 100)}%`;
      fill.style.backgroundColor = hpBarColor(frac);
      bar.appendChild(fill);
      hpRow.appendChild(bar);
      const text = document.createElement('span');
      text.className = 'initiative-bar-popover-hp-text';
      text.textContent = `${token.hp.current} / ${token.hp.max} HP`;
      hpRow.appendChild(text);
      popover.appendChild(hpRow);
    }

    // Conditions row.
    if (token.conditions.length > 0) {
      const condRow = document.createElement('div');
      condRow.className = 'initiative-bar-popover-conditions';
      for (const id of token.conditions) {
        const preset = getConditionPreset(id);
        const chip = document.createElement('span');
        chip.className = 'initiative-bar-popover-condition-chip';
        chip.textContent = preset?.label ?? id;
        chip.style.backgroundColor = preset?.color ?? '#888';
        condRow.appendChild(chip);
      }
      popover.appendChild(condRow);
    }
  }

  function positionPopover(): void {
    const r = labelEl.getBoundingClientRect();
    // Anchor below the label, centered. The CSS uses
    // `position: fixed` so we can use viewport coords directly.
    popover.style.left = `${r.left + r.width / 2}px`;
    popover.style.top = `${r.bottom + 6}px`;
    popover.style.transform = 'translateX(-50%)';
  }

  function showPopover(): void {
    const tok = activeTokenFor(store.getState());
    if (!tok) return;
    renderPopoverFor(tok);
    popover.hidden = false;
    positionPopover();
  }

  function hidePopover(): void {
    popover.hidden = true;
  }

  labelEl.addEventListener('mouseenter', showPopover);
  labelEl.addEventListener('mouseleave', hidePopover);
  labelEl.addEventListener('focus', showPopover);
  labelEl.addEventListener('blur', hidePopover);

  const controls = document.createElement('div');
  controls.className = 'initiative-bar-controls';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = '◀';
  prevBtn.title = 'Previous turn';
  prevBtn.setAttribute('aria-label', 'Previous turn');
  prevBtn.addEventListener('click', () => {
    const next = retreatInitiative(store.getState().initiative);
    store.applyPatch({
      kind: 'initiative-set-active',
      activeId: next.activeId,
      round: next.round,
    });
    prevBtn.blur();
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = '▶';
  nextBtn.title = 'Next turn';
  nextBtn.setAttribute('aria-label', 'Next turn');
  nextBtn.addEventListener('click', () => {
    if (actions.onAdvanceTurn) {
      actions.onAdvanceTurn();
    } else {
      const next = advanceInitiative(store.getState().initiative);
      store.applyPatch({
        kind: 'initiative-set-active',
        activeId: next.activeId,
        round: next.round,
      });
    }
    nextBtn.blur();
  });

  if (viewMode === 'gm') {
    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
  }

  // Phase 93 — turn-timer slot. Renders to the right of the controls
  // when the user has set `turnTimerSeconds > 0`. GM-only — Spectator
  // doesn't see the clock (avoids visible time-pressure on players).
  const timerEl = document.createElement('span');
  timerEl.className = 'initiative-bar-timer';
  timerEl.hidden = true;

  bar.appendChild(roundEl);
  bar.appendChild(pipEl);
  bar.appendChild(labelEl);
  bar.appendChild(controls);
  if (viewMode === 'gm') bar.appendChild(timerEl);
  document.body.appendChild(bar);

  // Phase 93 — turn-timer plumbing. State + interval are owned here so
  // they live for the lifetime of the bar; `destroy()` clears both.
  const timerState = viewMode === 'gm' ? createTurnTimerState() : null;
  let timerInterval: number | null = null;
  let lastUrgency: TurnTimerUrgency | 'none' = 'none';
  let expiredAnnouncedFor: string | null = null;

  // Phase 163 — track the imageId currently displayed in the pip
  // so we don't re-fetch the URL on every render tick (the
  // re-render fires on every store change). When the active
  // token's imageId changes, we re-fetch + apply.
  let pipImageId: ID | null = null;
  let pipImageTokenId: ID | null = null;

  function clearImagePip(fallbackColor: string): void {
    pipEl.style.backgroundImage = '';
    pipEl.style.backgroundColor = fallbackColor;
    pipImageId = null;
    pipImageTokenId = null;
  }

  function applyTokenImagePip(
    tokenId: ID,
    imageId: ID,
    fallbackColor: string,
  ): void {
    // Same token + same image as last paint → nothing to do.
    if (pipImageTokenId === tokenId && pipImageId === imageId) return;
    pipImageTokenId = tokenId;
    pipImageId = imageId;
    // Fallback color shows behind a transparent / loading image
    // so the pip never goes fully blank during the IDB fetch.
    pipEl.style.backgroundColor = fallbackColor;
    void getImageURL(imageId).then((url) => {
      // Race guard: if the active token / image changed before
      // the promise resolved, drop this URL on the floor.
      if (pipImageTokenId !== tokenId || pipImageId !== imageId) return;
      pipEl.style.backgroundImage = url ? `url(${CSS.escape(url)})` : '';
      pipEl.style.backgroundSize = 'cover';
      pipEl.style.backgroundPosition = 'center';
    });
  }

  function syncTimerOnly() {
    if (!timerState || viewMode !== 'gm') return;
    const seconds = actions.getTurnTimerSeconds?.() ?? 0;
    if (seconds <= 0 || timerState.activeKey() === null) {
      timerEl.hidden = true;
      timerEl.textContent = '';
      stopInterval();
      return;
    }
    const view = computeTimerView({
      now: Date.now(),
      startedAt: timerState.startedAt(),
      durationSeconds: seconds,
    });
    if (!view) {
      timerEl.hidden = true;
      stopInterval();
      return;
    }
    timerEl.hidden = false;
    timerEl.textContent = formatTimer(view.remainingMs);
    if (view.urgency !== lastUrgency) {
      timerEl.dataset.urgency = view.urgency;
      lastUrgency = view.urgency;
    }
    // One-shot expired announcement per active key.
    if (view.urgency === 'expired') {
      const key = timerState.activeKey();
      if (key && expiredAnnouncedFor !== key) {
        expiredAnnouncedFor = key;
        const linkedToken = activeTokenFor(store.getState());
        const name = linkedToken?.label || '—';
        actions.onTimerExpired?.(name);
      }
    }
    startInterval();
  }

  function activeTokenFor(s: ReturnType<typeof store.getState>) {
    const init = s.initiative;
    const active = init.order.find((e) => e.id === init.activeId) ?? null;
    if (!active) return null;
    return active.tokenId
      ? s.tokens.find((t) => t.id === active.tokenId) ?? null
      : null;
  }

  function startInterval() {
    if (timerInterval !== null) return;
    timerInterval = window.setInterval(() => {
      syncTimerOnly();
    }, 1000);
  }

  function stopInterval() {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function sync() {
    const s = store.getState();
    const init = s.initiative;
    const active = init.order.find((e) => e.id === init.activeId) ?? null;
    if (!active || init.round === 0) {
      bar.hidden = true;
      // Clear the timer state so a fresh combat re-arms a new clock.
      if (timerState) timerState.syncActive(null);
      stopInterval();
      timerEl.hidden = true;
      lastUrgency = 'none';
      expiredAnnouncedFor = null;
      return;
    }
    bar.hidden = false;
    roundEl.textContent = `Round ${init.round}`;
    const linkedToken = active.tokenId
      ? s.tokens.find((t) => t.id === active.tokenId)
      : null;
    const name = linkedToken?.label || active.label || '—';
    labelEl.textContent = `${name}  (${active.value})`;
    labelEl.title = viewMode === 'gm' ? 'Click to open the initiative tracker' : name;

    // Phase 147 — sync the colored pip from the active token's
    // color + border. When the entry isn't linked to a token (a
    // free-form initiative entry without a token id), the pip
    // shows a neutral gray.
    //
    // Phase 163 — when the active token has an `imageId`, prefer
    // a circular crop of the image over the solid color so the
    // pip visually matches the canvas token at a glance. The
    // fallback color path stays for unlinked / image-less tokens.
    if (linkedToken) {
      pipEl.style.borderColor = linkedToken.borderColor || 'transparent';
      pipEl.hidden = false;
      if (linkedToken.imageId) {
        applyTokenImagePip(linkedToken.id, linkedToken.imageId, linkedToken.color);
      } else {
        clearImagePip(linkedToken.color);
      }
    } else {
      clearImagePip('#888');
      pipEl.style.borderColor = 'transparent';
      pipEl.hidden = false;
    }

    // Phase 93 — sync the active turn key (resets startedAt on
    // change), then refresh the timer slot.
    if (timerState) {
      const key = activeTurnKey(active.id, init.round);
      if (timerState.syncActive(key)) {
        // Active turn changed — clear the "already announced expired"
        // memo so the new turn can fire its own expiry.
        expiredAnnouncedFor = null;
      }
      syncTimerOnly();
    }
  }

  sync();
  const unsub = store.subscribe(() => sync());

  return {
    destroy() {
      unsub();
      stopInterval();
      bar.remove();
    },
  };
}
