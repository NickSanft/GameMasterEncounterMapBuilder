/**
 * Phase 152 — "what's new" modal.
 *
 * Lists recent CHANGELOG highlights from `WHATS_NEW_ENTRIES`.
 * Mounted on body; opened by the help-overlay button when the
 * pulsing dot is active (or by a `Take a tour of recent changes`
 * action in the help overlay's footer once the user has dismissed
 * the badge).
 *
 * Closing the modal calls `markCurrentVersionSeen()` so the badge
 * stops pulsing. The user can re-open the modal anytime by clicking
 * the help-overlay's What's new entry, but the badge only pulses
 * for unseen versions.
 */
import { APP_NAME, APP_VERSION } from '../util/constants.js';
import {
  loadWhatsNewEntries,
  markCurrentVersionSeen,
  type WhatsNewEntry,
} from '../state/whats-new.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';
// Phase 173 — `renderMicroMarkdown` is dynamic-imported on first
// open (alongside the lazy entries) so its ~1 KB stays out of the
// main bundle for users who never open the modal.

export interface WhatsNewModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export function mountWhatsNewModal(): WhatsNewModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal whats-new-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', "What's new");

  const header = document.createElement('div');
  header.className = 'modal-header';

  const title = document.createElement('h2');
  title.textContent = `What's new in ${APP_NAME}`;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  header.appendChild(closeBtn);

  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'modal-body whats-new-body';

  const intro = document.createElement('p');
  intro.className = 'whats-new-intro';
  intro.textContent = `You're on v${APP_VERSION}. Recent updates:`;
  body.appendChild(intro);

  // Phase 173 — entries are lazy-loaded on first open so the
  // markdown bodies don't bloat the main bundle. Show a skeleton
  // placeholder until the chunk arrives.
  const loading = document.createElement('p');
  loading.className = 'whats-new-loading';
  loading.textContent = 'Loading recent updates…';
  body.appendChild(loading);
  let entriesRendered = false;

  function renderEntries(
    entries: readonly WhatsNewEntry[],
    renderMd: (md: string) => string,
  ): void {
    if (entriesRendered) return;
    entriesRendered = true;
    loading.remove();
    for (const entry of entries) {
      const block = document.createElement('section');
      block.className = 'whats-new-version';
      const h = document.createElement('h3');
      h.textContent = `v${entry.version} — ${entry.date}`;
      block.appendChild(h);
      const ul = document.createElement('ul');
      for (const highlight of entry.highlights) {
        const li = document.createElement('li');
        li.textContent = highlight;
        ul.appendChild(li);
      }
      block.appendChild(ul);
      // Phase 173 — when the entry carries a full body (most-recent
      // N entries), expose it as a `<details>` expand toggle.
      // Older entries stay title-only.
      if (entry.body) {
        const details = document.createElement('details');
        details.className = 'whats-new-version-details';
        const summary = document.createElement('summary');
        summary.textContent = 'Read full notes';
        details.appendChild(summary);
        const bodyWrap = document.createElement('div');
        bodyWrap.className = 'whats-new-version-body';
        bodyWrap.innerHTML = renderMd(entry.body);
        details.appendChild(bodyWrap);
        block.appendChild(details);
      }
      body.appendChild(block);
    }
  }

  modal.appendChild(body);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  attachFocusTrap(modal);

  let savedFocus: HTMLElement | null = null;

  function close() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    markCurrentVersionSeen();
    // Notify any badge listeners that the version is now seen so
    // their badge dot disappears. We dispatch a custom event on the
    // window — simpler than threading a subscriber through every
    // mount.
    window.dispatchEvent(new Event('whats-new:seen'));
    restoreFocus(savedFocus);
    savedFocus = null;
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      e.preventDefault();
    }
  });

  return {
    open() {
      if (!backdrop.hidden) return;
      savedFocus = rememberFocus();
      backdrop.hidden = false;
      closeBtn.focus();
      // Phase 173 — kick off the lazy-loaded entries + micro-
      // markdown fetch (idempotent — `loadWhatsNewEntries` caches
      // the promise; Vite caches the dynamic import). Both load
      // in parallel; render happens once both arrive.
      void Promise.all([
        loadWhatsNewEntries(),
        import('../util/micro-markdown.js').then((m) => m.renderMicroMarkdown),
      ]).then(([entries, renderMd]) => {
        renderEntries(entries, renderMd);
      });
    },
    close,
    isOpen: () => !backdrop.hidden,
  };
}
