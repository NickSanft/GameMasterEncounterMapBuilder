import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';
import { advanceInitiative, retreatInitiative } from '../state/initiative.js';
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

  const labelEl = document.createElement('button');
  labelEl.type = 'button';
  labelEl.className = 'initiative-bar-label';
  labelEl.addEventListener('click', () => {
    actions.onOpenTracker?.();
    labelEl.blur();
  });

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
    const next = advanceInitiative(store.getState().initiative);
    store.applyPatch({
      kind: 'initiative-set-active',
      activeId: next.activeId,
      round: next.round,
    });
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
