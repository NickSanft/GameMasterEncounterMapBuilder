import type { Store } from '../state/store.js';
import type { ID, Token } from '../state/types.js';
import { applyDamage } from '../state/token-hp.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface DamageHealDialogHandle {
  /**
   * Open the dialog for a set of target ids. Non-token ids and tokens
   * without HP tracking are filtered out. If no targets remain, the
   * dialog is a no-op.
   */
  openFor(ids: readonly ID[]): void;
  close(): void;
  isOpen(): boolean;
}

export interface DamageHealDialogOptions {
  store: Store;
  onAfterChange?(): void;
}

/**
 * Small modal for bulk-applying damage or healing to the selected tokens.
 * Positive number = damage. Negative number = healing. Enter / Ctrl+Enter
 * applies. Arrow Up/Down increment/decrement the amount.
 */
export function mountDamageHealDialog(
  opts: DamageHealDialogOptions,
): DamageHealDialogHandle {
  const { store } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal damage-heal-dialog';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Damage or heal selected tokens');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Damage / Heal</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="dmg-target-summary" data-field="summary" aria-live="polite"></p>
      <label>Amount (damage positive, healing negative)
        <input type="number" data-field="amount" step="1" value="0" autocomplete="off" />
      </label>
      <div class="dmg-quick" data-field="quick">
        <button type="button" data-action="heal" title="Heal (subtract from the amount)">− Heal 5</button>
        <button type="button" data-action="damage" title="Damage (add to the amount)">+ Damage 5</button>
      </div>
      <hr />
      <div class="modal-footer">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="button" class="primary" data-action="apply">Apply</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const summary = modal.querySelector<HTMLParagraphElement>('[data-field="summary"]')!;
  const amountInput = modal.querySelector<HTMLInputElement>('[data-field="amount"]')!;
  const healBtn = modal.querySelector<HTMLButtonElement>('[data-action="heal"]')!;
  const damageBtn = modal.querySelector<HTMLButtonElement>('[data-action="damage"]')!;
  const applyBtn = modal.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-action="cancel"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let targetIds: ID[] = [];
  let triggerFocus: HTMLElement | null = null;

  function targetTokens(): Token[] {
    const state = store.getState();
    return state.tokens.filter(
      (t) => t.hp !== null && targetIds.includes(t.id),
    );
  }

  function refreshSummary() {
    const tokens = targetTokens();
    if (tokens.length === 0) {
      summary.textContent = 'No HP-tracked tokens selected.';
      applyBtn.disabled = true;
      return;
    }
    applyBtn.disabled = false;
    if (tokens.length === 1) {
      const t = tokens[0]!;
      summary.textContent = `Target: ${t.label || 'Token'} (${t.hp!.current}/${t.hp!.max})`;
    } else {
      summary.textContent = `Applying to ${tokens.length} tokens.`;
    }
  }

  function openFor(ids: readonly ID[]) {
    const state = store.getState();
    targetIds = state.tokens
      .filter((t) => t.hp !== null && ids.includes(t.id))
      .map((t) => t.id);
    if (targetIds.length === 0) {
      // Nothing to do — the caller should have guarded, but bail gracefully.
      return;
    }
    triggerFocus = rememberFocus();
    amountInput.value = '0';
    refreshSummary();
    backdrop.hidden = false;
    window.setTimeout(() => {
      amountInput.focus();
      amountInput.select();
    }, 0);
  }

  function close() {
    targetIds = [];
    // Blur any input/button inside the modal first so focus doesn't stay on
    // an element that just got display:none-d (which would otherwise block
    // canvas-level keyboard shortcuts).
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function nudge(delta: number) {
    const current = parseInt(amountInput.value, 10);
    const base = Number.isFinite(current) ? current : 0;
    amountInput.value = String(base + delta);
  }

  function apply() {
    const tokens = targetTokens();
    if (tokens.length === 0) return;
    const amount = parseInt(amountInput.value, 10);
    if (!Number.isFinite(amount) || amount === 0) {
      close();
      return;
    }
    store.batch(() => {
      for (const t of tokens) {
        if (!t.hp) continue;
        const nextHp = applyDamage(t.hp, amount);
        store.applyPatch({
          kind: 'token-update',
          id: t.id,
          changes: { hp: nextHp },
        });
      }
    });
    opts.onAfterChange?.();
    close();
  }

  damageBtn.addEventListener('click', () => nudge(5));
  healBtn.addEventListener('click', () => nudge(-5));
  applyBtn.addEventListener('click', apply);
  cancelBtn.addEventListener('click', close);
  closeBtn.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  modal.addEventListener('keydown', (e) => {
    if (backdrop.hidden) return;
    if (e.key === 'Enter') {
      apply();
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        apply();
        e.preventDefault();
        return;
      }
    }
    if (document.activeElement === amountInput) {
      if (e.key === 'ArrowUp') {
        nudge(1);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        nudge(-1);
        e.preventDefault();
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  store.subscribe((patch) => {
    if (backdrop.hidden) return;
    if (!patch || patch.kind === 'session-reset') {
      close();
      return;
    }
    if (patch.kind === 'token-remove' && targetIds.includes(patch.id)) {
      targetIds = targetIds.filter((id) => id !== patch.id);
      if (targetIds.length === 0) {
        close();
        return;
      }
      refreshSummary();
    }
  });

  return {
    openFor,
    close,
    isOpen: () => !backdrop.hidden,
  };
}
