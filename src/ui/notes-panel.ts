import { NOTES_TEXT_KEY, NOTES_OPEN_KEY } from '../util/constants.js';
import { debounce } from '../util/debounce.js';
import {
  createVoiceTranscriber,
  isVoiceTranscriptionSupported,
  type VoiceTranscriber,
} from '../util/voice-transcription.js';
import type { PreferencesStore } from '../state/preferences.js';

export interface NotesPanelHandle {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export interface NotesPanelOptions {
  /**
   * Optional preferences store. When supplied the notes panel reads
   * `voiceTranscription` to decide whether to render the mic button
   * (also gated on browser support — Firefox doesn't expose
   * SpeechRecognition). When omitted (older callers / tests) the mic
   * button is hidden, so the textarea-only behaviour is preserved.
   */
  preferences?: PreferencesStore;
}

export function mountNotesPanel(opts: NotesPanelOptions = {}): NotesPanelHandle {
  const { preferences } = opts;

  const panel = document.createElement('aside');
  panel.className = 'notes-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Session notes');
  panel.hidden = true;

  // The mic button is only added to the DOM when the browser supports
  // SpeechRecognition AND the preference is on — but we always render
  // a placeholder span so the header layout doesn't reflow as the
  // pref toggles. The button itself is appended/removed dynamically.
  panel.innerHTML = `
    <header class="notes-panel-header">
      <h3>Session Notes</h3>
      <div class="notes-panel-actions">
        <button
          type="button"
          class="notes-panel-mic"
          aria-label="Start voice transcription"
          aria-pressed="false"
          title="Toggle voice transcription (microphone)"
          hidden
        >
          <span class="mic-icon" aria-hidden="true">🎤</span>
          <span class="mic-pulse" aria-hidden="true"></span>
        </button>
        <button type="button" class="notes-panel-close" aria-label="Close notes panel">×</button>
      </div>
    </header>
    <p class="notes-panel-status" data-field="status" hidden aria-live="polite"></p>
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
  const micBtn = panel.querySelector<HTMLButtonElement>('.notes-panel-mic')!;
  const status = panel.querySelector<HTMLParagraphElement>('[data-field="status"]')!;

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

  // ─── Voice transcription wiring (Phase 60) ────────────────────────
  let transcriber: VoiceTranscriber | null = null;

  // Tracks whether the visible status banner is an error — used to
  // decide whether `clearStatus()` (called on recognizer-end) should
  // wipe the message or leave it up. We want errors to stay readable
  // even after the recognizer naturally shuts down so the user knows
  // why nothing's happening; success-path "Listening…" status SHOULD
  // disappear on stop.
  let statusIsError = false;

  function showStatus(message: string, kind: 'info' | 'error' = 'info'): void {
    status.textContent = message;
    status.classList.toggle('error', kind === 'error');
    status.hidden = false;
    statusIsError = kind === 'error';
  }

  function clearStatus(force = false): void {
    if (statusIsError && !force) return;
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('error');
    statusIsError = false;
  }

  /**
   * Append a finalized transcript chunk to the textarea + autosave.
   * Adds a leading space when the existing text doesn't already end
   * with whitespace (so consecutive utterances don't smush into
   * `helloworld`).
   */
  function appendTranscript(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const current = textarea.value;
    const sep = current.length === 0 || /\s$/.test(current) ? '' : ' ';
    textarea.value = `${current}${sep}${trimmed}`;
    // Manually fire input → triggers the existing autosave path.
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    // Keep the caret at the end so the user sees text appearing live.
    textarea.scrollTop = textarea.scrollHeight;
  }

  function ensureTranscriber(): VoiceTranscriber | null {
    if (transcriber) return transcriber;
    transcriber = createVoiceTranscriber();
    if (!transcriber) return null;
    transcriber.onTranscript((event) => {
      if (event.finalText) appendTranscript(event.finalText);
      // Interim text only updates the live status banner, never the
      // textarea — it would churn keystrokes per micro-update otherwise.
      if (event.interimText) showStatus(`Listening… "${event.interimText}"`);
      else if (transcriber?.isActive()) showStatus('Listening…');
    });
    transcriber.onStateChange((active) => {
      micBtn.classList.toggle('active', active);
      micBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      micBtn.setAttribute(
        'aria-label',
        active ? 'Stop voice transcription' : 'Start voice transcription',
      );
      if (active) showStatus('Listening…');
      else clearStatus();
    });
    transcriber.onError((error) => {
      showStatus(error.message, 'error');
    });
    return transcriber;
  }

  micBtn.addEventListener('click', () => {
    const t = ensureTranscriber();
    if (!t) {
      showStatus('Voice transcription is not available in this browser.', 'error');
      return;
    }
    if (t.isActive()) {
      t.stop();
    } else {
      // Clicking the mic to retry after an error should wipe the
      // stale error banner — the user took an action.
      clearStatus(true);
      t.start();
    }
  });

  function refreshMicButtonVisibility(): void {
    const supported = isVoiceTranscriptionSupported();
    const wantedOn = preferences?.get().voiceTranscription !== false;
    const visible = supported && wantedOn;
    micBtn.hidden = !visible;
    if (!visible && transcriber?.isActive()) {
      // Pref was just turned off mid-recording; politely stop.
      transcriber.stop();
    }
  }

  refreshMicButtonVisibility();
  preferences?.subscribe(() => refreshMicButtonVisibility());

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
    } else if (transcriber?.isActive()) {
      // Closing the panel while recording stops the recognizer — UX
      // would otherwise keep the mic hot with no visible affordance.
      transcriber.stop();
    }
  }

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('beforeunload', () => {
    persist.flush();
    transcriber?.destroy();
  });

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
