import type { Store } from '../state/store.js';
import type { InitiativeEntry, Token } from '../state/types.js';
import {
  advanceInitiative,
  retreatInitiative,
  rollInitiativeForToken,
  rollInitiativeForUnlinkedTokens,
} from '../state/initiative.js';
import {
  attachFocusTrap,
  rememberFocus,
  restoreFocus,
  getFocusables,
} from '../util/focus.js';
import { nid } from '../util/id.js';

export interface InitiativeModalHandle {
  open(): void;
  close(): void;
}

export interface InitiativeModalOptions {
  store: Store;
  /**
   * Phase 155 — host-supplied "advance turn" handler. When provided,
   * the modal's Next button delegates to it (the host wires
   * auto-skip past dead tokens + combat-log emission). When omitted,
   * the modal falls back to the pre-155 inline `advanceInitiative`
   * + patch sequence.
   */
  onAdvanceTurn?: () => void;
}

export function mountInitiativeModal(
  opts: InitiativeModalOptions,
): InitiativeModalHandle {
  const { store } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal initiative-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Initiative tracker');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Initiative</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body initiative-body">
      <div class="initiative-status">
        <span data-field="round">Combat not started</span>
      </div>
      <ul class="initiative-list" data-field="list" aria-label="Turn order"></ul>
      <div class="initiative-add">
        <div class="initiative-roll-all-row">
          <button type="button" data-action="roll-all" title="Roll 1d20 + each token's initiative bonus and add the missing ones to the order">
            🎲 Roll all unlinked tokens
          </button>
        </div>
        <label class="initiative-add-label">Add from token</label>
        <div class="initiative-add-row">
          <select data-field="token-select"></select>
          <input type="number" data-field="token-value" placeholder="Roll" min="-20" max="50" step="1" />
          <button type="button" data-action="roll-one" title="Roll 1d20 + this token's initiative bonus" aria-label="Roll for selected token">🎲</button>
          <button type="button" data-action="add-token">Add</button>
        </div>
        <label class="initiative-add-label">Add custom</label>
        <div class="initiative-add-row">
          <input type="text" data-field="custom-label" placeholder="Label" maxlength="40" />
          <input type="number" data-field="custom-value" placeholder="Roll" min="-20" max="50" step="1" />
          <button type="button" data-action="add-custom">Add</button>
        </div>
      </div>
      <hr />
      <div class="initiative-controls">
        <button type="button" data-action="prev" title="Previous turn">◀ Prev</button>
        <button type="button" data-action="next" title="Next turn" class="primary">Next ▶</button>
        <button type="button" data-action="end" class="danger">End Combat</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const roundEl = modal.querySelector<HTMLSpanElement>('[data-field="round"]')!;
  const listEl = modal.querySelector<HTMLUListElement>('[data-field="list"]')!;
  const tokenSelect = modal.querySelector<HTMLSelectElement>('[data-field="token-select"]')!;
  const tokenValue = modal.querySelector<HTMLInputElement>('[data-field="token-value"]')!;
  const customLabel = modal.querySelector<HTMLInputElement>('[data-field="custom-label"]')!;
  const customValue = modal.querySelector<HTMLInputElement>('[data-field="custom-value"]')!;
  const addTokenBtn = modal.querySelector<HTMLButtonElement>('[data-action="add-token"]')!;
  const addCustomBtn = modal.querySelector<HTMLButtonElement>('[data-action="add-custom"]')!;
  const rollAllBtn = modal.querySelector<HTMLButtonElement>('[data-action="roll-all"]')!;
  const rollOneBtn = modal.querySelector<HTMLButtonElement>('[data-action="roll-one"]')!;
  const prevBtn = modal.querySelector<HTMLButtonElement>('[data-action="prev"]')!;
  const nextBtn = modal.querySelector<HTMLButtonElement>('[data-action="next"]')!;
  const endBtn = modal.querySelector<HTMLButtonElement>('[data-action="end"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;

  // Phase 176 — drag/drop reorder. Listeners are attached ONCE on
  // the list element (delegation across renders). The dragstart
  // payload is the dragged row's `data-id`; dragover computes
  // whether to insert before/after the row under the cursor and
  // toggles a CSS class for the visual indicator; drop dispatches
  // the `initiative-reorder` patch. `renderList` clears
  // `listEl.innerHTML` each render but the listeners on `listEl`
  // itself survive the children being recreated.
  let dragId: string | null = null;
  listEl.addEventListener('dragstart', (e) => {
    const target = (e.target as HTMLElement).closest(
      'li.initiative-list-row',
    ) as HTMLElement | null;
    if (!target || !target.dataset.id) return;
    dragId = target.dataset.id;
    target.classList.add('initiative-list-row-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Some browsers require setData to start a drag.
      e.dataTransfer.setData('text/plain', dragId);
    }
  });
  function clearDragVisuals(): void {
    listEl
      .querySelectorAll('.initiative-list-row-dragging')
      .forEach((el) => el.classList.remove('initiative-list-row-dragging'));
    listEl
      .querySelectorAll('.initiative-list-row-drop-before')
      .forEach((el) => el.classList.remove('initiative-list-row-drop-before'));
    listEl
      .querySelectorAll('.initiative-list-row-drop-after')
      .forEach((el) => el.classList.remove('initiative-list-row-drop-after'));
  }
  listEl.addEventListener('dragend', () => {
    clearDragVisuals();
    dragId = null;
  });
  listEl.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const target = (e.target as HTMLElement).closest(
      'li.initiative-list-row',
    ) as HTMLElement | null;
    if (!target || target.dataset.id === dragId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = target.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    listEl
      .querySelectorAll('.initiative-list-row-drop-before')
      .forEach((el) => el.classList.remove('initiative-list-row-drop-before'));
    listEl
      .querySelectorAll('.initiative-list-row-drop-after')
      .forEach((el) => el.classList.remove('initiative-list-row-drop-after'));
    target.classList.add(
      before
        ? 'initiative-list-row-drop-before'
        : 'initiative-list-row-drop-after',
    );
  });
  listEl.addEventListener('drop', (e) => {
    if (!dragId) return;
    const target = (e.target as HTMLElement).closest(
      'li.initiative-list-row',
    ) as HTMLElement | null;
    if (!target || target.dataset.id === dragId) return;
    e.preventDefault();
    const dropOnId = target.dataset.id!;
    const rect = target.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const orderNow = store
      .getState()
      .initiative.order.map((entry) => entry.id);
    const fromIdx = orderNow.indexOf(dragId);
    if (fromIdx < 0) return;
    orderNow.splice(fromIdx, 1);
    let toIdx = orderNow.indexOf(dropOnId);
    if (toIdx < 0) return;
    if (!before) toIdx++;
    orderNow.splice(toIdx, 0, dragId);
    store.applyPatch({ kind: 'initiative-reorder', order: orderNow });
    clearDragVisuals();
    dragId = null;
  });

  function open() {
    triggerFocus = rememberFocus();
    populate();
    backdrop.hidden = false;
    window.setTimeout(() => {
      const focusables = getFocusables(modal);
      if (focusables.length > 0) focusables[0]!.focus();
    }, 0);
  }

  function close() {
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function refreshTokenSelect(state = store.getState()) {
    const linkedIds = new Set(
      state.initiative.order.map((e) => e.tokenId).filter(Boolean) as string[],
    );
    const availableTokens = state.tokens.filter((t) => !linkedIds.has(t.id));
    tokenSelect.innerHTML = '';
    if (availableTokens.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No tokens available';
      opt.disabled = true;
      tokenSelect.appendChild(opt);
      tokenSelect.disabled = true;
      addTokenBtn.disabled = true;
      rollOneBtn.disabled = true;
      // "Roll all" is only useful when at least one token is unlinked.
      rollAllBtn.disabled = true;
    } else {
      for (const t of availableTokens) {
        const opt = document.createElement('option');
        opt.value = t.id;
        // Show "Goblin (+2)" so the GM can see the modifier they're
        // rolling against without opening the token editor.
        const mod = t.initiativeMod ?? 0;
        const modSuffix = mod === 0 ? '' : mod > 0 ? ` (+${mod})` : ` (${mod})`;
        opt.textContent = `${t.label}${modSuffix}`;
        tokenSelect.appendChild(opt);
      }
      tokenSelect.disabled = false;
      addTokenBtn.disabled = false;
      rollOneBtn.disabled = false;
      rollAllBtn.disabled = false;
    }
  }

  function renderList(state = store.getState()) {
    listEl.innerHTML = '';
    const { order, activeId } = state.initiative;
    if (order.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'initiative-list-empty';
      empty.textContent = 'No combatants yet — add some above.';
      listEl.appendChild(empty);
      return;
    }
    for (const entry of order) {
      const li = document.createElement('li');
      li.className = 'initiative-list-row';
      if (entry.id === activeId) li.classList.add('active');
      // Phase 176 — drag-handle reorder. The whole row is the
      // draggable target; the handle is a visual affordance + the
      // accessible "this is draggable" cue. We mark `data-id` so
      // the dragover/drop handlers can map DOM ↔ entry.
      li.draggable = true;
      li.dataset.id = entry.id;
      const linkedToken: Token | undefined = entry.tokenId
        ? state.tokens.find((t) => t.id === entry.tokenId)
        : undefined;

      const handle = document.createElement('span');
      handle.className = 'initiative-list-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.title = 'Drag to reorder';
      handle.textContent = '⋮⋮';

      const valueEl = document.createElement('span');
      valueEl.className = 'initiative-list-value';
      valueEl.textContent = String(entry.value);

      const nameEl = document.createElement('span');
      nameEl.className = 'initiative-list-name';
      nameEl.textContent = linkedToken?.label || entry.label;
      if (linkedToken) {
        const swatch = document.createElement('span');
        swatch.className = 'initiative-list-swatch';
        swatch.style.background = linkedToken.color;
        nameEl.prepend(swatch);
      }

      const actions = document.createElement('div');
      actions.className = 'initiative-list-actions';

      const setActiveBtn = document.createElement('button');
      setActiveBtn.type = 'button';
      setActiveBtn.textContent = 'Set turn';
      setActiveBtn.title = "Set this combatant as the current turn";
      setActiveBtn.addEventListener('click', () => {
        store.applyPatch({
          kind: 'initiative-set-active',
          activeId: entry.id,
          round: Math.max(1, state.initiative.round),
        });
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'danger';
      removeBtn.addEventListener('click', () => {
        store.applyPatch({ kind: 'initiative-remove', id: entry.id });
      });

      actions.appendChild(setActiveBtn);
      actions.appendChild(removeBtn);

      li.appendChild(handle);
      li.appendChild(valueEl);
      li.appendChild(nameEl);
      li.appendChild(actions);
      listEl.appendChild(li);
    }
  }

  function populate() {
    const state = store.getState();
    refreshTokenSelect(state);
    renderList(state);
    const { activeId, round, order } = state.initiative;
    if (order.length === 0) {
      roundEl.textContent = 'No combatants yet';
    } else if (activeId === null) {
      roundEl.textContent = 'Press Next to start combat';
    } else {
      const active = order.find((e) => e.id === activeId);
      const name = active
        ? state.tokens.find((t) => t.id === active.tokenId)?.label || active.label
        : '—';
      roundEl.textContent = `Round ${round} · ${name}'s turn`;
    }
  }

  addTokenBtn.addEventListener('click', () => {
    const state = store.getState();
    const tokenId = tokenSelect.value;
    if (!tokenId) return;
    const token = state.tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const value = parseInt(tokenValue.value, 10);
    if (Number.isNaN(value)) return;
    const entry: InitiativeEntry = {
      id: nid(),
      tokenId: token.id,
      label: token.label,
      value,
    };
    store.applyPatch({ kind: 'initiative-add', entry });
    tokenValue.value = '';
  });

  // 🎲 button next to the value input — rolls 1d20 + the token's
  // initiativeMod and pre-fills the input. The GM still has to click
  // "Add" to commit it to the order, so a misclick is recoverable.
  rollOneBtn.addEventListener('click', () => {
    const state = store.getState();
    const tokenId = tokenSelect.value;
    if (!tokenId) return;
    const token = state.tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const entry = rollInitiativeForToken(token);
    tokenValue.value = String(entry.value);
    tokenValue.focus();
    tokenValue.select();
  });

  // "Roll all" button — rolls 1d20 + initiativeMod for every token NOT
  // already in the order, dispatching one initiative-add per result.
  // Tokens already in the order are LEFT ALONE so the GM can manually
  // set values for NPCs (e.g. monster blocks that don't roll) or
  // players who announced their own roll without losing them.
  rollAllBtn.addEventListener('click', () => {
    const state = store.getState();
    const fresh = rollInitiativeForUnlinkedTokens(state.tokens, state.initiative);
    if (fresh.length === 0) return;
    for (const entry of fresh) {
      store.applyPatch({ kind: 'initiative-add', entry });
    }
  });

  addCustomBtn.addEventListener('click', () => {
    const label = customLabel.value.trim();
    if (!label) return;
    const value = parseInt(customValue.value, 10);
    if (Number.isNaN(value)) return;
    const entry: InitiativeEntry = {
      id: nid(),
      tokenId: null,
      label,
      value,
    };
    store.applyPatch({ kind: 'initiative-add', entry });
    customLabel.value = '';
    customValue.value = '';
  });

  prevBtn.addEventListener('click', () => {
    const next = retreatInitiative(store.getState().initiative);
    store.applyPatch({
      kind: 'initiative-set-active',
      activeId: next.activeId,
      round: next.round,
    });
  });

  nextBtn.addEventListener('click', () => {
    if (opts.onAdvanceTurn) {
      opts.onAdvanceTurn();
      return;
    }
    const next = advanceInitiative(store.getState().initiative);
    store.applyPatch({
      kind: 'initiative-set-active',
      activeId: next.activeId,
      round: next.round,
    });
  });

  endBtn.addEventListener('click', () => {
    if (!window.confirm('End combat? Turn order stays but round resets.')) return;
    store.applyPatch({
      kind: 'initiative-set-active',
      activeId: null,
      round: 0,
    });
  });

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

  store.subscribe(() => {
    if (!backdrop.hidden) populate();
  });

  return { open, close };
}
