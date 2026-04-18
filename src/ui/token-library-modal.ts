import {
  listLibraryTokens,
  deleteLibraryToken,
  type TokenCatalogEntry,
} from '../state/token-catalog.js';
import { getImageURL } from '../images/store.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface TokenLibraryModalHandle {
  open(): void;
  close(): void;
}

export interface TokenLibraryModalOptions {
  onPlace(entry: TokenCatalogEntry): void | Promise<void>;
}

export function mountTokenLibraryModal(
  opts: TokenLibraryModalOptions,
): TokenLibraryModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal library-modal token-library-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Token Library');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Token Library</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="library-hint">Click a saved token to place it at the center of your view. Save new tokens from the Edit Token dialog.</p>
      <div class="library-grid" data-field="grid"></div>
      <div class="library-empty" data-field="empty" hidden>
        <p>No tokens saved yet.</p>
        <p class="settings-hint">Open a token (right-click → Edit token…) and hit "Save to Library" to add it here.</p>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const grid = modal.querySelector<HTMLDivElement>('[data-field="grid"]')!;
  const empty = modal.querySelector<HTMLDivElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;

  async function refresh() {
    const entries = await listLibraryTokens();
    grid.innerHTML = '';
    if (entries.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const entry of entries) {
      grid.appendChild(renderCard(entry));
    }
  }

  function renderCard(entry: TokenCatalogEntry): HTMLElement {
    const card = document.createElement('div');
    card.className = 'library-card';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', entry.label);

    const border =
      entry.borderColor !== null
        ? `box-shadow: inset 0 0 0 3px ${entry.borderColor};`
        : '';
    const colorStyle = `background:${entry.color}; ${border}`;

    card.innerHTML = `
      <button type="button" class="library-card-main" data-action="place">
        <div class="library-thumb" style="${colorStyle}">
          <span class="library-thumb-label">${escapeHtml(initials(entry.label))}</span>
        </div>
        <div class="library-meta">
          <div class="library-name">${escapeHtml(entry.label)}</div>
          <div class="library-sub">Size ${entry.size}${entry.imageId ? ' · Image' : ''}</div>
        </div>
      </button>
      <button type="button" class="library-delete" data-action="delete" aria-label="Delete ${escapeHtml(entry.label)} from library" title="Delete from library">×</button>
    `;

    const thumb = card.querySelector<HTMLDivElement>('.library-thumb')!;
    if (entry.imageId) {
      void getImageURL(entry.imageId).then((url) => {
        if (!url) return;
        thumb.style.backgroundImage = `url(${CSS.escape(url)})`;
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';
        const label = thumb.querySelector('.library-thumb-label');
        label?.remove();
      });
    }

    card
      .querySelector<HTMLButtonElement>('[data-action="place"]')!
      .addEventListener('click', async () => {
        close();
        await opts.onPlace(entry);
      });

    card
      .querySelector<HTMLButtonElement>('[data-action="delete"]')!
      .addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = window.confirm(`Delete "${entry.label}" from the token library?`);
        if (!ok) return;
        await deleteLibraryToken(entry.id);
        await refresh();
      });

    return card;
  }

  function open() {
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    void refresh().then(() => {
      const first = modal.querySelector<HTMLButtonElement>('[data-action="place"]');
      (first ?? closeBtn).focus();
    });
  }

  function close() {
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
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  return { open, close };
}

function initials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}
