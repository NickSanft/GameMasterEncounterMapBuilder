/**
 * Phase 84 — GM-side conflict-merge modal.
 *
 * When two GM tabs detect each other (existing Phase 64 heartbeat
 * machinery), the warning banner now offers a "Resolve…" action that
 * opens this modal. It shows a side-by-side summary of every detected
 * peer (this tab's state vs the other tab's state — last edit time,
 * token count, scene name) and lets the GM pick a winner per peer:
 *
 *   - **Keep this tab**  — broadcast our local state to the peer via a
 *                          `gm-takeover`. The peer applies it via
 *                          `loadState` and the conflict resolves.
 *   - **Use other tab**  — send a `gm-state-request` to the peer. They
 *                          respond with `gm-takeover { state }` carrying
 *                          their state; we apply it locally.
 *
 * The actual wire calls are owned by the entry — this modal just calls
 * back into `opts.onTakeOver` / `opts.onAdoptPeer` with the relevant
 * `tabId`. Keeps the modal pure UI + easy to mount in tests without a
 * channel.
 */

import type { PeerEntry } from '../state/conflict-detector.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface ConflictModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /**
   * Refresh the displayed peer list. The entry calls this whenever the
   * conflict-detector state changes (e.g. another heartbeat arrived
   * with updated summary, or a peer dropped).
   */
  setPeers(peers: PeerEntry[]): void;
  destroy(): void;
}

export interface LocalSummary {
  /** Display label for our own column ("This tab"). */
  label: string;
  lastModified: number;
  tokenCount: number;
  sceneName: string;
}

export interface ConflictModalOptions {
  /**
   * Returns the local tab's current state summary. Called every time
   * the modal renders (so the comparison stays accurate even if the
   * GM kept editing while the modal was open).
   */
  getLocalSummary(): LocalSummary;
  /**
   * "Keep this tab" — push our state to the targeted peer.
   * The entry serializes + sends the `gm-takeover`.
   */
  onTakeOver(targetTabId: string): void;
  /**
   * "Use other tab" — request the peer's state.
   * The entry sends the `gm-state-request`.
   */
  onAdoptPeer(targetTabId: string): void;
}

/**
 * Format a `Date.now()` millisecond timestamp as `HH:MM:SS` (24h
 * locale-independent). Used for the comparison column. We avoid
 * `toLocaleTimeString` because its output varies per browser and
 * we want stable Playwright assertions.
 */
export function formatClock(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function mountConflictModal(
  opts: ConflictModalOptions,
): ConflictModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal conflict-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Resolve GM tab conflict');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Resolve conflict</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="conflict-hint">
        Another GM tab is open. Pick which version to keep — the other
        tab will adopt the chosen state and the warning will clear.
        Closing this dialog without picking leaves both tabs as-is.
      </p>
      <ul class="conflict-list" data-field="list" aria-label="Detected GM tabs"></ul>
      <p class="conflict-empty" data-field="empty" hidden>
        No other GM tabs are currently active. The conflict has cleared.
      </p>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLUListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;
  let cachedPeers: PeerEntry[] = [];

  function render() {
    list.innerHTML = '';
    if (cachedPeers.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const local = opts.getLocalSummary();
    for (const peer of cachedPeers) {
      list.appendChild(renderRow(peer, local));
    }
  }

  function renderRow(peer: PeerEntry, local: LocalSummary): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'conflict-row';
    li.dataset.tabId = peer.tabId;

    const cols = document.createElement('div');
    cols.className = 'conflict-cols';
    cols.appendChild(buildCol('local', local.label, {
      lastModified: local.lastModified,
      tokenCount: local.tokenCount,
      sceneName: local.sceneName,
    }));
    cols.appendChild(buildCol('peer', shortenTabId(peer.tabId), peer.summary));
    li.appendChild(cols);

    const actions = document.createElement('div');
    actions.className = 'conflict-actions';

    const keepBtn = document.createElement('button');
    keepBtn.type = 'button';
    keepBtn.className = 'conflict-action conflict-action-keep';
    keepBtn.dataset.action = 'keep';
    keepBtn.textContent = 'Keep this tab';
    keepBtn.addEventListener('click', () => opts.onTakeOver(peer.tabId));

    const adoptBtn = document.createElement('button');
    adoptBtn.type = 'button';
    adoptBtn.className = 'conflict-action conflict-action-adopt';
    adoptBtn.dataset.action = 'adopt';
    adoptBtn.textContent = 'Use other tab';
    // Without a peer summary we can't know whether the takeover is
    // actually safe (e.g. an empty pre-84 GM with no info would wipe
    // your real session). Disable the adopt button in that case —
    // takeover-from-our-side still works.
    if (!peer.summary) {
      adoptBtn.disabled = true;
      adoptBtn.title = 'Other tab is on a pre-0.84 build; cannot read its state.';
    }
    adoptBtn.addEventListener('click', () => opts.onAdoptPeer(peer.tabId));

    actions.appendChild(keepBtn);
    actions.appendChild(adoptBtn);
    li.appendChild(actions);

    return li;
  }

  function buildCol(
    kind: 'local' | 'peer',
    title: string,
    summary: { lastModified: number; tokenCount: number; sceneName: string } | null,
  ): HTMLDivElement {
    const col = document.createElement('div');
    col.className = `conflict-col conflict-col-${kind}`;
    const h = document.createElement('h3');
    h.textContent = title;
    col.appendChild(h);
    const dl = document.createElement('dl');
    dl.className = 'conflict-col-meta';
    if (summary) {
      appendDt(dl, 'Last edit', formatClock(summary.lastModified));
      appendDt(dl, 'Tokens', String(summary.tokenCount));
      appendDt(dl, 'Scene', summary.sceneName || '(untitled)');
    } else {
      const note = document.createElement('p');
      note.className = 'conflict-col-noinfo';
      note.textContent = '(no info)';
      col.appendChild(note);
    }
    if (dl.childElementCount > 0) col.appendChild(dl);
    return col;
  }

  function appendDt(dl: HTMLDListElement, label: string, value: string): void {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function shortenTabId(id: string): string {
    // Tab ids are nanoid-style; show the first 6 chars so the user can
    // tell two peers apart at a glance.
    return `Other tab · ${id.slice(0, 6)}`;
  }

  function open() {
    if (!backdrop.hidden) return;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    render();
    window.setTimeout(() => closeBtn.focus(), 0);
  }

  function close() {
    if (backdrop.hidden) return;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function setPeers(peers: PeerEntry[]) {
    cachedPeers = peers;
    if (!backdrop.hidden) render();
  }

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

  return {
    open,
    close,
    isOpen: () => !backdrop.hidden,
    setPeers,
    destroy() {
      backdrop.remove();
    },
  };
}
