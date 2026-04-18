import { NOTES_TEXT_KEY, NOTES_OPEN_KEY } from '../util/constants.js';
import { debounce } from '../util/debounce.js';

export interface NotesPanelHandle {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export function mountNotesPanel(): NotesPanelHandle {
  const panel = document.createElement('aside');
  panel.className = 'notes-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Session notes');
  panel.hidden = true;

  panel.innerHTML = `
    <header class="notes-panel-header">
      <h3>Session Notes</h3>
      <button type="button" class="notes-panel-close" aria-label="Close notes panel">×</button>
    </header>
    <textarea
      class="notes-panel-textarea"
      placeholder="Private notes — not shared with Spectator. Autosaves as you type."
      spellcheck="true"
    ></textarea>
    <footer class="notes-panel-footer">
      <span class="notes-panel-hint">Saved locally · This tab only</span>
    </footer>
  `;
  document.body.appendChild(panel);

  const textarea = panel.querySelector<HTMLTextAreaElement>('.notes-panel-textarea')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('.notes-panel-close')!;

  textarea.value = localStorage.getItem(NOTES_TEXT_KEY) ?? '';
  const initiallyOpen = localStorage.getItem(NOTES_OPEN_KEY) === 'true';
  setOpen(initiallyOpen, { persist: false });

  const persist = debounce(() => {
    try {
      localStorage.setItem(NOTES_TEXT_KEY, textarea.value);
    } catch (err) {
      console.warn('[notes-panel] save failed', err);
    }
  }, 250);

  textarea.addEventListener('input', persist);

  function setOpen(next: boolean, options: { persist?: boolean } = { persist: true }) {
    panel.hidden = !next;
    document.body.classList.toggle('notes-open', next);
    if (options.persist !== false) {
      try {
        localStorage.setItem(NOTES_OPEN_KEY, next ? 'true' : 'false');
      } catch {
        /* ignore */
      }
    }
    if (next) {
      window.setTimeout(() => textarea.focus(), 0);
    }
  }

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('beforeunload', () => persist.flush());

  return {
    toggle() {
      setOpen(panel.hidden);
    },
    open() {
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    isOpen() {
      return !panel.hidden;
    },
  };
}
