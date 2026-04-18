import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';
import { advanceInitiative, retreatInitiative } from '../state/initiative.js';

export interface InitiativeBarActions {
  onOpenTracker?: () => void;
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

  bar.appendChild(roundEl);
  bar.appendChild(labelEl);
  bar.appendChild(controls);
  document.body.appendChild(bar);

  function sync() {
    const s = store.getState();
    const init = s.initiative;
    const active = init.order.find((e) => e.id === init.activeId) ?? null;
    if (!active || init.round === 0) {
      bar.hidden = true;
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
  }

  sync();
  const unsub = store.subscribe(() => sync());

  return {
    destroy() {
      unsub();
      bar.remove();
    },
  };
}
