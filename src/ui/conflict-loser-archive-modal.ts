/**
 * Phase 99 — conflict-loser archive recovery modal.
 *
 * Lists every fresh entry in the archive (entries within the
 * 1-hour TTL) with a "Restore" button per row that swaps the live
 * state back to the archived snapshot. Same restore semantics as
 * Phase 97's snapshot history (loadState + clearHistory + flush save).
 *
 * The empty-state copy explicitly says "1-hour expiry" so users know
 * why entries disappear. Each row shows:
 *   - Relative timestamp ("12 minutes ago")
 *   - Reason ("Adopted other tab's state")
 *   - Quick summary (token count, fog %)
 */

import type { LoserSnapshot } from '../state/conflict-loser-archive.js';
import { formatRelativeTime } from '../state/snapshot-history.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface ConflictLoserArchiveModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface ConflictLoserArchiveModalOptions {
  /** Snapshot list (newest-first; caller passes `archive.listFresh()`). */
  getEntries(): LoserSnapshot[];
  /** Restore from a single entry. Caller wires loadState + persist. */
  onRestore(snapshot: LoserSnapshot): void;
  /** Drop a single entry. Caller wires `archive.remove(id)`. */
  onDiscard(id: string): void;
  /** Drop every entry (button at the bottom). */
  onClearAll(): void;
}

export function mountConflictLoserArchiveModal(
  opts: ConflictLoserArchiveModalOptions,
): ConflictLoserArchiveModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal conflict-loser-archive-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Conflict-merge archive');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Conflict-merge archive</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="conflict-loser-hint">
        States that were overwritten when you adopted another GM tab's
        state via the conflict-merge modal. Kept for 1 hour so you can
        recover if you picked the wrong winner. Restoring replaces the
        current state — the current state is NOT re-archived (recovery
        is a one-shot escape hatch, not a full undo stack).
      </p>
      <ol class="conflict-loser-list" data-field="list" aria-label="Archived states"></ol>
      <p class="conflict-loser-empty" data-field="empty" hidden>
        Conflict-merge archive is empty. Entries are added when you
        resolve a GM-conflict by adopting the other tab's state, and
        expire after 1 hour.
      </p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-danger" data-action="clear-all" hidden>Clear archive</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const clearAllBtn = modal.querySelector<HTMLButtonElement>('[data-action="clear-all"]')!;

  let isOpen = false;
  let triggerFocus: HTMLElement | null = null;

  function refresh() {
    const entries = opts.getEntries();
    if (entries.length === 0) {
      list.replaceChildren();
      list.hidden = true;
      empty.hidden = false;
      clearAllBtn.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...entries.map(renderRow));
    clearAllBtn.hidden = false;
  }

  function renderRow(snap: LoserSnapshot): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'conflict-loser-row';
    li.dataset.snapshotId = snap.id;

    const meta = document.createElement('div');
    meta.className = 'conflict-loser-meta';

    const time = document.createElement('time');
    time.className = 'conflict-loser-time';
    time.textContent = formatRelativeTime(snap.recordedAt);
    time.title = new Date(snap.recordedAt).toLocaleString();

    const reason = document.createElement('span');
    reason.className = 'conflict-loser-reason';
    reason.textContent = snap.reason;

    const summary = document.createElement('span');
    summary.className = 'conflict-loser-summary';
    const tokenCount = snap.state.tokens.length;
    const total = snap.state.grid.cols * snap.state.grid.rows;
    let revealed = 0;
    for (let i = 0; i < snap.state.fog.length; i++) {
      if (snap.state.fog[i] === 1) revealed++;
    }
    const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
    summary.textContent = `${tokenCount} ${tokenCount === 1 ? 'token' : 'tokens'} · ${pct}% revealed`;

    meta.appendChild(time);
    meta.appendChild(reason);
    meta.appendChild(summary);

    const actions = document.createElement('div');
    actions.className = 'conflict-loser-actions';

    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'conflict-loser-restore';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => {
      opts.onRestore(snap);
      close();
    });

    const discard = document.createElement('button');
    discard.type = 'button';
    discard.className = 'conflict-loser-discard';
    discard.textContent = 'Discard';
    discard.title = 'Drop this archived state without restoring';
    discard.addEventListener('click', () => {
      opts.onDiscard(snap.id);
      refresh();
    });

    actions.appendChild(restore);
    actions.appendChild(discard);

    li.appendChild(meta);
    li.appendChild(actions);
    return li;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    refresh();
    window.setTimeout(() => closeBtn.focus(), 0);
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

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  clearAllBtn.addEventListener('click', () => {
    opts.onClearAll();
    refresh();
  });
  window.addEventListener('keydown', (e) => {
    if (isOpen && e.key === 'Escape' && !e.defaultPrevented) {
      close();
      e.preventDefault();
    }
  });

  return {
    open,
    close,
    isOpen: () => isOpen,
    destroy() {
      backdrop.remove();
    },
  };
}
