import type { Store } from '../state/store.js';
import type { ID, Token } from '../state/types.js';
import {
  applyDamage,
  addDeathSaveFailures,
  DEFAULT_DEATH_SAVES,
} from '../state/token-hp.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';
import {
  CONCENTRATING_CONDITION_ID,
  concentrationChecksForDamage,
  type ConcentrationCheck,
} from '../state/concentration.js';
import { removeCondition, clearConditionExpiration } from '../state/conditions.js';

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
  /**
   * Optional callback fired after a non-zero amount is applied, given the
   * summary (e.g. "Dealt 7 damage to 2 tokens") so the caller can route
   * it to an aria-live announcer.
   */
  onAnnounce?(summary: string): void;
  /**
   * Phase 77 — fired once per affected token after a successful Apply.
   * `amount` is signed: positive for damage, negative for heal. The
   * host wires this to:
   *   - the local damage-fx manager (to render the floating number
   *     on this tab's canvas), and
   *   - the sync channel (so remote peers also render it).
   */
  onDamageFx?(tokenId: string, amount: number): void;
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
      <h2 data-field="title">Damage / Heal</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <!-- Default view: amount entry. Switches to the concentration
           checks list after Apply if any concentrating tokens were
           damaged in the batch. -->
      <div data-field="amount-view">
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

      <!-- Phase 71 — concentration check follow-up. Shown after Apply
           when one or more concentrating tokens took damage. -->
      <div data-field="concentration-view" hidden>
        <p class="dmg-conc-intro">Damage taken — Constitution save needed to maintain concentration:</p>
        <ul class="dmg-conc-list" data-field="conc-list" aria-label="Concentration checks"></ul>
        <hr />
        <div class="modal-footer">
          <button type="button" data-action="conc-done">Done</button>
        </div>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const titleEl = modal.querySelector<HTMLHeadingElement>('[data-field="title"]')!;
  const summary = modal.querySelector<HTMLParagraphElement>('[data-field="summary"]')!;
  const amountInput = modal.querySelector<HTMLInputElement>('[data-field="amount"]')!;
  const healBtn = modal.querySelector<HTMLButtonElement>('[data-action="heal"]')!;
  const damageBtn = modal.querySelector<HTMLButtonElement>('[data-action="damage"]')!;
  const applyBtn = modal.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-action="cancel"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const amountView = modal.querySelector<HTMLDivElement>('[data-field="amount-view"]')!;
  const concView = modal.querySelector<HTMLDivElement>('[data-field="concentration-view"]')!;
  const concList = modal.querySelector<HTMLUListElement>('[data-field="conc-list"]')!;
  const concDoneBtn = modal.querySelector<HTMLButtonElement>('[data-action="conc-done"]')!;

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
    showAmountView();
    refreshSummary();
    backdrop.hidden = false;
    window.setTimeout(() => {
      amountInput.focus();
      amountInput.select();
    }, 0);
  }

  function close() {
    targetIds = [];
    pendingConcentrationChecks = [];
    // Reset the view back to the amount-entry mode so the next openFor
    // doesn't briefly show the previous run's concentration list.
    showAmountView();
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

  /**
   * Phase 71 — view-switching helpers. The dialog hosts two modes:
   * the default amount-entry view and the post-apply concentration
   * follow-up. Switching is just toggling `hidden` on two siblings;
   * this keeps focus management trivial vs. mounting two modals.
   */
  let pendingConcentrationChecks: ConcentrationCheck[] = [];

  function showAmountView() {
    titleEl.textContent = 'Damage / Heal';
    amountView.hidden = false;
    concView.hidden = true;
  }

  function showConcentrationView() {
    titleEl.textContent = 'Concentration check';
    amountView.hidden = true;
    concView.hidden = false;
    renderConcentrationChecks();
    window.setTimeout(() => {
      // Focus the first action button in the list so keyboard users
      // can resolve checks without reaching for the mouse.
      const firstBtn = concList.querySelector<HTMLButtonElement>('button');
      firstBtn?.focus();
    }, 0);
  }

  function renderConcentrationChecks() {
    concList.innerHTML = '';
    if (pendingConcentrationChecks.length === 0) {
      close();
      return;
    }
    for (const check of pendingConcentrationChecks) {
      const li = document.createElement('li');
      li.className = 'dmg-conc-row';
      li.dataset.tokenId = check.tokenId;

      const label = document.createElement('span');
      label.className = 'dmg-conc-label';
      label.textContent = `${check.label} — took ${check.damage} dmg, DC ${check.dc}`;

      const failedBtn = document.createElement('button');
      failedBtn.type = 'button';
      failedBtn.className = 'danger';
      failedBtn.textContent = 'Failed';
      failedBtn.title = 'Spell ends — strip the concentrating condition';
      failedBtn.addEventListener('click', () => resolveCheck(check, false));

      const savedBtn = document.createElement('button');
      savedBtn.type = 'button';
      savedBtn.textContent = 'Saved';
      savedBtn.title = 'Concentration holds — leave the condition in place';
      savedBtn.addEventListener('click', () => resolveCheck(check, true));

      li.appendChild(label);
      li.appendChild(failedBtn);
      li.appendChild(savedBtn);
      concList.appendChild(li);
    }
  }

  function resolveCheck(check: ConcentrationCheck, saved: boolean) {
    pendingConcentrationChecks = pendingConcentrationChecks.filter(
      (c) => c.tokenId !== check.tokenId,
    );
    if (!saved) {
      const tok = store.getState().tokens.find((t) => t.id === check.tokenId);
      if (tok) {
        const nextConditions = removeCondition(
          tok.conditions,
          CONCENTRATING_CONDITION_ID,
        );
        const nextExpirations = clearConditionExpiration(
          tok.conditionExpirations,
          CONCENTRATING_CONDITION_ID,
        );
        store.applyPatch({
          kind: 'token-update',
          id: check.tokenId,
          changes: {
            conditions: nextConditions,
            conditionExpirations: nextExpirations,
          },
        });
        opts.onAnnounce?.(`${check.label} lost concentration.`);
      }
    } else {
      opts.onAnnounce?.(`${check.label} held concentration (DC ${check.dc}).`);
    }
    renderConcentrationChecks();
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

    // Phase 71 — track per-token damage taken (clamped against current
    // HP so a 50-dmg blow on a 12-HP target only counts as 12 for
    // the concentration check DC). Healing (negative amount) never
    // triggers a check — `damageTaken` stays 0.
    const damagePerToken = new Map<string, number>();
    store.batch(() => {
      for (const t of tokens) {
        if (!t.hp) continue;
        const nextHp = applyDamage(t.hp, amount);
        const taken = Math.max(0, t.hp.current - nextHp.current);
        damagePerToken.set(t.id, taken);
        const changes: Partial<Token> = { hp: nextHp };
        // Phase 72 — death-save automation:
        //   - HP transitions from 0 → positive (healing wakes you):
        //     reset the save tracker to {0, 0}.
        //   - Damage applied to a 0-HP token (still 0 after):
        //     +1 failure (a crit would be +2; the dialog doesn't
        //     model crits — GMs adjust by hand).
        if (t.hp.current === 0 && nextHp.current > 0) {
          changes.deathSaves = { ...DEFAULT_DEATH_SAVES };
        } else if (t.hp.current === 0 && nextHp.current === 0 && amount > 0) {
          changes.deathSaves = addDeathSaveFailures(t.deathSaves, 1);
        }
        store.applyPatch({
          kind: 'token-update',
          id: t.id,
          changes,
        });
        // Phase 77 — fire a damage/heal floating-number effect for
        // every token whose HP actually changed. The effect is
        // signed: positive = damage, negative = heal. The host wires
        // this to the local damage-fx manager + the sync channel.
        const delta = nextHp.current - t.hp.current;
        if (delta !== 0) {
          // delta is negative for damage, positive for heal — flip
          // so the wire convention (positive = damage) holds.
          opts.onDamageFx?.(t.id, -delta);
        }
      }
    });
    opts.onAfterChange?.();
    if (opts.onAnnounce) {
      const verb = amount > 0 ? 'Dealt' : 'Healed';
      const magnitude = Math.abs(amount);
      const suffix = tokens.length === 1
        ? `${tokens[0]!.label || 'token'}`
        : `${tokens.length} tokens`;
      opts.onAnnounce(`${verb} ${magnitude} HP to ${suffix}.`);
    }

    // Phase 71 — gather concentration checks for the damage we just
    // applied. Read from the FRESH state so post-update conditions
    // (e.g. unconscious from dropping to 0) are visible — though for
    // now we only filter on the `concentrating` flag itself.
    const stateAfter = store.getState();
    pendingConcentrationChecks = concentrationChecksForDamage(
      stateAfter.tokens,
      damagePerToken,
    );
    if (pendingConcentrationChecks.length > 0) {
      showConcentrationView();
      return;
    }
    close();
  }

  damageBtn.addEventListener('click', () => nudge(5));
  healBtn.addEventListener('click', () => nudge(-5));
  applyBtn.addEventListener('click', apply);
  cancelBtn.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  concDoneBtn.addEventListener('click', close);

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
