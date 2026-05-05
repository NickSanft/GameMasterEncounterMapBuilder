import {
  NOTES_TEXT_KEY,
  NOTES_TEXT_KEY_PREFIX,
  NOTES_OPEN_KEY,
} from '../util/constants.js';
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
  /**
   * Phase 157 — notify the panel that the active scene has changed.
   * Persists the outgoing scene's textarea content under the OLD
   * scene's key, then loads the new scene's notes into the textarea
   * (falling back to the legacy global notes when the new scene
   * doesn't have a per-scene record yet).
   *
   * No-op when `getActiveSceneId` wasn't supplied at mount time
   * (legacy single-key behavior).
   */
  notifySceneSwitched(): void;
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
  /**
   * Phase 157 — when supplied, notes are persisted per-scene under
   * `${NOTES_TEXT_KEY_PREFIX}${sceneId}`. Returns `null`/`undefined`
   * → falls back to the legacy global key (`NOTES_TEXT_KEY`),
   * preserving the pre-157 single-scratchpad behavior for callers
   * that don't have a scene system. The host calls
   * `notifySceneSwitched()` after a scene change so the panel can
   * save the outgoing notes + load the incoming.
   */
  getActiveSceneId?: () => string | null;
}

export function mountNotesPanel(opts: NotesPanelOptions = {}): NotesPanelHandle {
  const { preferences, getActiveSceneId } = opts;

  // Phase 157 — derive the localStorage key for the CURRENT scene.
  // When `getActiveSceneId` is unsupplied OR returns null, we fall
  // back to the legacy `NOTES_TEXT_KEY` (single scratchpad). This
  // preserves the pre-157 behavior for callers that don't wire the
  // scene system in (tests, future entries, etc.).
  function activeKey(): string {
    const id = getActiveSceneId?.() ?? null;
    return id ? `${NOTES_TEXT_KEY_PREFIX}${id}` : NOTES_TEXT_KEY;
  }

  /**
   * Phase 157 — read notes for the active scene with legacy
   * fallback. If the per-scene key has content, use it. Else, fall
   * back to the legacy global key — so a user upgrading from pre-157
   * sees their existing notes in the first scene they open.
   */
  function readNotes(): string {
    const key = activeKey();
    try {
      const own = localStorage.getItem(key);
      if (own !== null) return own;
      // Fallback only when the per-scene key is genuinely missing
      // (not when it's an empty string the user explicitly saved).
      if (key !== NOTES_TEXT_KEY) {
        const legacy = localStorage.getItem(NOTES_TEXT_KEY);
        if (legacy) return legacy;
      }
      return '';
    } catch {
      return '';
    }
  }

  // Tracks the scene id the textarea is currently bound to. Used by
  // `notifySceneSwitched` to know which scene's storage key to save
  // into when the switch fires.
  let lastSceneId: string | null = getActiveSceneId?.() ?? null;

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

  // ─── Voice transcription wiring (Phase 60) ────────────────────────
  // These two `let`s MUST be declared before the initial `setOpen()`
  // call below — `setOpen(false)` references `transcriber` in its
  // panel-closes-while-recording branch, which would TDZ-crash the
  // entire gm.ts boot if the declaration came later. (Caught in
  // 0.60.1 — the cascade also broke the Scenes-button click handler
  // because gm.ts crashed before `scenesModal` was initialized.)
  let transcriber: VoiceTranscriber | null = null;
  // Tracks whether the visible status banner is an error — used to
  // decide whether `clearStatus()` (called on recognizer-end) should
  // wipe the message or leave it up. We want errors to stay readable
  // even after the recognizer naturally shuts down so the user knows
  // why nothing's happening; success-path "Listening…" status SHOULD
  // disappear on stop.
  let statusIsError = false;

  textarea.value = readNotes();
  const initiallyOpen = localStorage.getItem(NOTES_OPEN_KEY) === 'true';
  setOpen(initiallyOpen, { persist: false });

  const persist = debounce(() => {
    try {
      localStorage.setItem(activeKey(), textarea.value);
    } catch (err) {
      console.warn('[notes-panel] save failed', err);
    }
  }, 250);

  textarea.addEventListener('input', persist);

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

  /**
   * Phase 157 — flush the outgoing scene's textarea content to
   * storage and load the incoming scene's notes. Called by the GM
   * entry's `switchToScene` after `setActiveSceneId(id)` has
   * updated the pointer.
   *
   * Storage flow:
   *   - Save outgoing: write `textarea.value` to the OLD scene's
   *     per-scene key (computed from the cached `lastSceneId`, not
   *     from `getActiveSceneId()` which now points to the NEW
   *     scene).
   *   - Load incoming: replace `textarea.value` with
   *     `readNotes()` which reads the new scene's per-scene key
   *     (with legacy global fallback).
   *
   * The debounced auto-save is `flush()`-ed first so any in-flight
   * keystrokes from the outgoing scene aren't lost.
   */
  function notifySceneSwitched(): void {
    if (!getActiveSceneId) return;
    persist.flush();
    const outgoingKey = lastSceneId
      ? `${NOTES_TEXT_KEY_PREFIX}${lastSceneId}`
      : NOTES_TEXT_KEY;
    try {
      localStorage.setItem(outgoingKey, textarea.value);
    } catch (err) {
      console.warn('[notes-panel] save outgoing scene failed', err);
    }
    lastSceneId = getActiveSceneId();
    textarea.value = readNotes();
  }

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
    notifySceneSwitched,
  };
}
