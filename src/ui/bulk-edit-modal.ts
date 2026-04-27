/**
 * Phase 123 — bulk token edit modal.
 *
 * Opens when the GM has 2+ tokens selected and invokes the bulk-edit
 * action (palette command "Bulk edit selected tokens" or shortcut B).
 * Three actions in v123:
 *   1. **Set HP max** — input a number, applies to every selected token
 *      that already tracks HP (skips others). Current HP clamps down.
 *   2. **Add condition** — pick a preset, applies to every selected
 *      token that doesn't already have it.
 *   3. **Remove condition** — pick a condition, drops it (and any
 *      Phase 70 expiration timer) from every selected token that has it.
 *
 * Each action runs inside `store.batch()` so the whole bulk operation
 * is one undo step. The modal closes on apply; the user can re-open
 * it to chain another bulk action.
 */

import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import { CONDITION_PRESETS } from '../state/conditions.js';
import {
  bulkSetHpMax,
  bulkAddCondition,
  bulkRemoveCondition,
  type TokenUpdateOp,
} from '../state/bulk-token-edit.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface BulkEditModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export interface BulkEditModalOptions {
  store: Store;
  selection: SelectionState;
  /** Optional aria-live announcer for the result summary. */
  onAnnounce?(summary: string): void;
}

export function mountBulkEditModal(
  opts: BulkEditModalOptions,
): BulkEditModalHandle {
  const { store, selection, onAnnounce } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal bulk-edit-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Bulk edit selected tokens');

  const conditionOptions = CONDITION_PRESETS.map(
    (c) => `<option value="${c.id}">${c.label}</option>`,
  ).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Bulk edit</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="bulk-edit-summary" data-field="summary" aria-live="polite"></p>

      <fieldset class="bulk-edit-section">
        <legend>Set HP max</legend>
        <p class="bulk-edit-hint">Tokens without HP tracking are skipped.</p>
        <label>
          New max
          <input type="number" min="0" step="1" data-field="hp-max" value="10" />
        </label>
        <button type="button" class="bulk-edit-apply" data-action="apply-hp-max">
          Apply HP max to selection
        </button>
      </fieldset>

      <fieldset class="bulk-edit-section">
        <legend>Add condition</legend>
        <label>
          Condition
          <select data-field="add-condition">${conditionOptions}</select>
        </label>
        <button type="button" class="bulk-edit-apply" data-action="apply-add-condition">
          Add to selection
        </button>
      </fieldset>

      <fieldset class="bulk-edit-section">
        <legend>Remove condition</legend>
        <label>
          Condition
          <select data-field="remove-condition">${conditionOptions}</select>
        </label>
        <button type="button" class="bulk-edit-apply" data-action="apply-remove-condition">
          Remove from selection
        </button>
      </fieldset>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const summary = modal.querySelector<HTMLParagraphElement>(
    '[data-field="summary"]',
  )!;
  const hpMaxInput = modal.querySelector<HTMLInputElement>('[data-field="hp-max"]')!;
  const addConditionSelect = modal.querySelector<HTMLSelectElement>(
    '[data-field="add-condition"]',
  )!;
  const removeConditionSelect = modal.querySelector<HTMLSelectElement>(
    '[data-field="remove-condition"]',
  )!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let isOpen = false;
  let priorFocus: HTMLElement | null = null;

  function refreshSummary() {
    const total = selection.ids.size;
    summary.textContent =
      total === 1
        ? '1 token selected.'
        : `${total} tokens selected.`;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    priorFocus = rememberFocus();
    backdrop.hidden = false;
    attachFocusTrap(modal);
    refreshSummary();
    // Defer focus past the show frame.
    window.setTimeout(() => hpMaxInput.focus(), 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    backdrop.hidden = true;
    restoreFocus(priorFocus);
    priorFocus = null;
  }

  function applyOps(ops: TokenUpdateOp[], announceVerb: string): void {
    if (ops.length === 0) {
      onAnnounce?.(`No tokens affected — ${announceVerb} was a no-op.`);
      return;
    }
    store.batch(() => {
      for (const op of ops) {
        store.applyPatch({
          kind: 'token-update',
          id: op.tokenId,
          changes: op.changes,
        });
      }
    });
    const noun = ops.length === 1 ? 'token' : 'tokens';
    onAnnounce?.(`${announceVerb} ${ops.length} ${noun}.`);
    close();
  }

  function applyHpMax() {
    const newMax = Number(hpMaxInput.value);
    const ops = bulkSetHpMax(
      store.getState().tokens,
      selection.ids,
      newMax,
    );
    applyOps(ops, `Set HP max on`);
  }

  function applyAddCondition() {
    const id = addConditionSelect.value;
    const ops = bulkAddCondition(
      store.getState().tokens,
      selection.ids,
      id,
    );
    applyOps(ops, `Added ${id} to`);
  }

  function applyRemoveCondition() {
    const id = removeConditionSelect.value;
    const ops = bulkRemoveCondition(
      store.getState().tokens,
      selection.ids,
      id,
    );
    applyOps(ops, `Removed ${id} from`);
  }

  closeBtn.addEventListener('click', () => close());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  modal
    .querySelector<HTMLButtonElement>('[data-action="apply-hp-max"]')!
    .addEventListener('click', applyHpMax);
  modal
    .querySelector<HTMLButtonElement>('[data-action="apply-add-condition"]')!
    .addEventListener('click', applyAddCondition);
  modal
    .querySelector<HTMLButtonElement>('[data-action="apply-remove-condition"]')!
    .addEventListener('click', applyRemoveCondition);

  return {
    open,
    close,
    isOpen: () => isOpen,
  };
}
