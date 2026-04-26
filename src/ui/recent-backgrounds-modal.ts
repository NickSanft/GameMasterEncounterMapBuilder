/**
 * Phase 108 — recent backgrounds quick switcher modal.
 *
 * Lists the up-to-12 most recent background images the GM has applied
 * with thumbnails, names (when known), and timestamps. Clicking a row
 * re-applies that image to the current scene WITHOUT re-uploading
 * (the blob is already in IDB; we just dispatch a `background-update`
 * patch with the existing imageId).
 *
 * Mirrors the visual pattern of the snapshot-history + conflict-loser
 * modals so all three "list of recent things" surfaces feel like one
 * consistent UX.
 *
 * Pure UI module — the host wires `getEntries` (calls `listRecent()`)
 * + `getThumbnailURL` (calls `getImageURL(id)`) + `onPick` + `onForget`
 * to the recent-backgrounds store + the IDB image layer.
 */

import type { ID } from '../state/types.js';
import type { RecentBackground } from '../state/recent-backgrounds.js';
import { formatRelativeTime } from '../state/snapshot-history.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface RecentBackgroundsModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface RecentBackgroundsModalOptions {
  /** Snapshot of recent entries (newest-first). */
  getEntries(): RecentBackground[];
  /**
   * Resolves the IDB image to a blob URL the `<img>` thumbnail can
   * render. `null` means the IDB record is gone (broken entry); the
   * row is dropped from the modal + the entry is forgotten.
   */
  getThumbnailURL(id: ID): Promise<string | null>;
  /** User picked a recent background — host re-applies it. */
  onPick(entry: RecentBackground): void | Promise<void>;
  /** User clicked the row's × → drop it from history. */
  onForget(id: ID): void;
}

export function mountRecentBackgroundsModal(
  opts: RecentBackgroundsModalOptions,
): RecentBackgroundsModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal recent-backgrounds-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Recent backgrounds');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Recent backgrounds</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="recent-backgrounds-hint">
        Maps you've used recently. Click one to re-apply it without
        re-uploading. The list is newest-first and capped at 12 entries.
      </p>
      <ol class="recent-backgrounds-list" data-field="list" aria-label="Recent backgrounds"></ol>
      <p class="recent-backgrounds-empty" data-field="empty" hidden>
        No recent backgrounds yet. Upload a map (drop a file, paste an
        image, or use the session menu) and it'll show up here for one-
        click re-application.
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
  /** Track URLs we created so we can revoke them on close. */
  const urlsToRevoke: string[] = [];

  async function refresh() {
    revokeURLs();
    const entries = opts.getEntries();
    if (entries.length === 0) {
      list.replaceChildren();
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren();
    // Render rows sequentially so a failing thumbnail (IDB record
    // missing) doesn't block the others — fire-and-forget per row.
    for (const entry of entries) {
      const li = renderRow(entry);
      list.appendChild(li);
      void hydrateThumbnail(entry, li);
    }
  }

  function renderRow(entry: RecentBackground): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'recent-background-row';
    li.dataset.imageId = entry.imageId;

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'recent-background-pick';
    main.setAttribute('aria-label', `Apply ${entry.name ?? 'recent background'}`);

    const thumb = document.createElement('div');
    thumb.className = 'recent-background-thumb';
    // Placeholder while we async-fetch the URL.
    thumb.textContent = '—';

    const meta = document.createElement('div');
    meta.className = 'recent-background-meta';

    const name = document.createElement('div');
    name.className = 'recent-background-name';
    name.textContent = entry.name ?? '(unnamed map)';

    const time = document.createElement('div');
    time.className = 'recent-background-time';
    time.textContent = formatRelativeTime(entry.lastUsedAt);
    time.title = new Date(entry.lastUsedAt).toLocaleString();

    meta.appendChild(name);
    meta.appendChild(time);

    main.appendChild(thumb);
    main.appendChild(meta);

    main.addEventListener('click', async () => {
      await opts.onPick(entry);
      close();
    });

    const forgetBtn = document.createElement('button');
    forgetBtn.type = 'button';
    forgetBtn.className = 'recent-background-forget';
    forgetBtn.setAttribute(
      'aria-label',
      `Forget ${entry.name ?? 'recent background'}`,
    );
    forgetBtn.title = 'Drop from recent list (the original image stays in storage if any scene still uses it)';
    forgetBtn.textContent = '×';
    forgetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onForget(entry.imageId);
      refresh();
    });

    li.appendChild(main);
    li.appendChild(forgetBtn);
    return li;
  }

  async function hydrateThumbnail(
    entry: RecentBackground,
    li: HTMLLIElement,
  ): Promise<void> {
    let url: string | null = null;
    try {
      url = await opts.getThumbnailURL(entry.imageId);
    } catch (err) {
      console.warn('[recent-backgrounds] thumbnail load failed', err);
    }
    const thumb = li.querySelector<HTMLDivElement>('.recent-background-thumb');
    if (!thumb) return;
    if (!url) {
      // The IDB record is gone (deleted scene cleanup, manual db reset, etc).
      // Drop the row + forget the broken entry so the list stays accurate.
      li.remove();
      opts.onForget(entry.imageId);
      // If the list is now empty, show the empty state.
      if (list.children.length === 0) {
        list.hidden = true;
        empty.hidden = false;
      }
      return;
    }
    urlsToRevoke.push(url);
    thumb.textContent = '';
    thumb.style.backgroundImage = `url(${CSS.escape(url)})`;
  }

  function revokeURLs() {
    // We DON'T revoke object URLs sourced via getImageURL because the
    // images-store helper caches + reuses them. Other callers (the
    // renderer's image loader) hold references to those URLs; revoking
    // here would break their already-painted backgrounds.
    urlsToRevoke.length = 0;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    void refresh().then(() => {
      window.setTimeout(() => closeBtn.focus(), 0);
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    revokeURLs();
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
