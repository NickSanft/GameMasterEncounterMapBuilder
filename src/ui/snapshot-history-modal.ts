/**
 * Phase 97 — restore-from-snapshot modal.
 *
 * Lists every retained snapshot for the currently-active scene with
 * "N minutes ago" relative timestamps + a quick summary (token count,
 * fog %, etc.). Each row has a "Restore" action that swaps the
 * store's state to the snapshot + persists immediately so the change
 * survives a reload.
 *
 * GM-only — Spectator never opens this; their state mirrors the
 * GM's via the sync channel.
 */

import type {
  Snapshot,
} from '../state/snapshot-history.js';
import {
  listSnapshots,
  formatRelativeTime,
} from '../state/snapshot-history.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface SnapshotHistoryModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface SnapshotHistoryModalOptions {
  /**
   * Resolves the active scene id at open-time. Returns `null` when
   * no scene is active (the modal renders an empty state).
   */
  getActiveSceneId(): string | null;
  /**
   * Apply a snapshot's state to the live store. Host wires this to
   * `store.loadState(deserializeState(snapshot.state))` + a
   * synchronous saveState so the restore survives a reload race.
   */
  onRestore(snapshot: Snapshot): void;
}

export function mountSnapshotHistoryModal(
  opts: SnapshotHistoryModalOptions,
): SnapshotHistoryModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal snapshot-history-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Restore from snapshot');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Restore from snapshot</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="snapshot-history-hint">
        Auto-saved snapshots from this scene. The most recent saves are kept; older ones rotate out automatically. Restoring replaces the current state — your in-progress changes will be lost (but the live state itself becomes a snapshot the next time you save).
      </p>
      <ol class="snapshot-history-list" data-field="list" aria-label="Snapshot history"></ol>
      <p class="snapshot-history-empty" data-field="empty" hidden>
        No snapshots yet for this scene. Snapshots accumulate as you make changes (one every ~30 seconds at most).
      </p>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let isOpen = false;
  let triggerFocus: HTMLElement | null = null;

  async function refresh() {
    const sceneId = opts.getActiveSceneId();
    if (!sceneId) {
      list.replaceChildren();
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    let snapshots: Snapshot[] = [];
    try {
      snapshots = await listSnapshots(sceneId);
    } catch (err) {
      console.warn('[snapshot-history-modal] list failed', err);
    }
    if (snapshots.length === 0) {
      list.replaceChildren();
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...snapshots.map(renderRow));
  }

  function renderRow(snap: Snapshot): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'snapshot-history-row';
    li.dataset.snapshotId = snap.id;

    const meta = document.createElement('div');
    meta.className = 'snapshot-history-meta';

    const time = document.createElement('time');
    time.className = 'snapshot-history-time';
    time.textContent = formatRelativeTime(snap.takenAt);
    time.title = new Date(snap.takenAt).toLocaleString();

    const summary = document.createElement('span');
    summary.className = 'snapshot-history-summary';
    const tokenCount = snap.state.tokens.length;
    const total = snap.state.grid.cols * snap.state.grid.rows;
    let revealed = 0;
    for (let i = 0; i < snap.state.fog.length; i++) {
      if (snap.state.fog[i] === 1) revealed++;
    }
    const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
    summary.textContent = `${tokenCount} ${tokenCount === 1 ? 'token' : 'tokens'} · ${pct}% revealed`;

    meta.appendChild(time);
    meta.appendChild(summary);

    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'snapshot-history-restore';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => {
      opts.onRestore(snap);
      close();
    });

    li.appendChild(meta);
    li.appendChild(restore);
    return li;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    void refresh();
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
