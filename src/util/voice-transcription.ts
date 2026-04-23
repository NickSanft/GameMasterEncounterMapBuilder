/**
 * Web Speech API wrapper for the Phase 60 "voice transcription → notes"
 * feature. Browsers have shipped two flavors of the API:
 *
 *   - Standard `SpeechRecognition` (Edge, recent Safari).
 *   - Vendor-prefixed `webkitSpeechRecognition` (Chrome/Chromium, older
 *     Safari).
 *
 * Both expose the same shape, so we feature-detect either constructor
 * and use whichever is present. Browsers without either constructor
 * (Firefox today) get `null` from `createVoiceTranscriber` — callers
 * should guard the UI behind `isVoiceTranscriptionSupported()` so the
 * mic button doesn't appear on unsupported browsers.
 *
 * What this module does:
 *   - Owns a single SpeechRecognition instance with `continuous: true`
 *     and `interimResults: true` so the user sees their words appear
 *     as they speak instead of after a long pause.
 *   - Coalesces the result events into `(finalText, interimText)` so
 *     consumers get one signal instead of having to walk the
 *     SpeechRecognitionResultList themselves.
 *   - Routes errors through a typed listener (`code: 'not-allowed' |
 *     'network' | ...` + a human message) so the UI can surface
 *     permission-denied / offline / no-speech in a friendly banner.
 *   - Auto-restarts when the recognizer naturally ends (most browsers
 *     stop after ~30s of silence even with `continuous: true`); the
 *     wrapper restarts unless the user explicitly stopped.
 *
 * What this module does NOT do:
 *   - It doesn't render any UI — see `notes-panel.ts` for the mic
 *     button + listening indicator + transcript-append logic.
 *   - It doesn't persist transcripts. The notes panel handles that
 *     via its existing localStorage autosave path.
 */

export interface VoiceTranscriptionOptions {
  /**
   * BCP-47 language tag for the recognizer. Defaults to the browser's
   * navigator.language (e.g. 'en-US'). Pass an explicit tag to force
   * a specific language regardless of the browser's UI locale.
   */
  lang?: string;
  /**
   * Show interim (un-finalized) recognition results in addition to
   * the final ones. Default: true. The notes-panel UI uses interim
   * text only as a "live" hint (not appended to the textarea); only
   * `finalText` gets persisted.
   */
  interimResults?: boolean;
}

export interface TranscriptionEvent {
  /**
   * Newly-finalized text from this result event. Empty string when
   * the event only updated interim text. Each `finalText` chunk is a
   * complete utterance — typically a sentence or sentence fragment
   * separated by a noticeable pause.
   */
  finalText: string;
  /**
   * Best-guess in-progress text — the recognizer's running guess at
   * what's currently being spoken. Replaced on every event; never
   * empty while the user is talking. Goes back to '' when the user
   * pauses long enough for the recognizer to finalize.
   */
  interimText: string;
}

export type TranscriptionErrorCode =
  | 'not-allowed'    // mic permission denied
  | 'service-not-allowed'  // browser blocks transcription service
  | 'no-speech'      // recognizer heard nothing for its silence window
  | 'aborted'        // user (or our auto-restart) called stop()
  | 'audio-capture'  // no mic / mic in use
  | 'network'        // recognizer service is offline
  | 'language-not-supported' // browser can't recognize this `lang`
  | 'unknown';       // anything else

export interface TranscriptionError {
  code: TranscriptionErrorCode;
  /** Human-readable message safe to show in a toast / banner. */
  message: string;
}

export interface VoiceTranscriber {
  /**
   * Begin (or resume) listening. Idempotent: calling start while
   * already active is a no-op. Triggers the browser's mic permission
   * prompt the first time.
   */
  start(): void;
  /**
   * Stop listening. Cancels any pending auto-restart. The current
   * interim text is dropped; an in-flight final result still fires
   * before the recognizer fully shuts down.
   */
  stop(): void;
  /** True when the recognizer is currently listening. */
  isActive(): boolean;
  /** Subscribe to transcript events. Returns an unsubscribe fn. */
  onTranscript(listener: (event: TranscriptionEvent) => void): () => void;
  /** Subscribe to active-state transitions (start/stop). */
  onStateChange(listener: (active: boolean) => void): () => void;
  /** Subscribe to recoverable + fatal errors. */
  onError(listener: (error: TranscriptionError) => void): () => void;
  /** Tear down. Stops the recognizer + clears all listeners. */
  destroy(): void;
}

/**
 * Minimal subset of the SpeechRecognition interface — enough for our
 * usage and easy to mock in tests. The browser-supplied class has more
 * surface area but we don't touch it.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
    length: number;
  }>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

/** Find the SpeechRecognition constructor on `window`, prefixed or not. */
function findRecognitionCtor(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
): SpeechRecognitionConstructor | null {
  if (!win) return null;
  const w = win as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceTranscriptionSupported(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
): boolean {
  return findRecognitionCtor(win) !== null;
}

/**
 * Test seam — production code uses the auto-detected browser
 * constructor; tests inject a mock constructor without touching
 * window.
 */
export interface VoiceTranscriberFactoryOptions extends VoiceTranscriptionOptions {
  /** Override the constructor (tests). Default: feature-detect on `window`. */
  ctor?: SpeechRecognitionConstructor | null;
}

/**
 * Construct a transcriber. Returns `null` when the browser doesn't
 * expose either `SpeechRecognition` or `webkitSpeechRecognition` —
 * callers should hide their UI in that case.
 */
export function createVoiceTranscriber(
  opts: VoiceTranscriberFactoryOptions = {},
): VoiceTranscriber | null {
  const Ctor = opts.ctor !== undefined ? opts.ctor : findRecognitionCtor();
  if (!Ctor) return null;

  const recog = new Ctor();
  recog.lang =
    opts.lang ??
    (typeof navigator !== 'undefined' ? navigator.language : undefined) ??
    'en-US';
  recog.continuous = true;
  recog.interimResults = opts.interimResults !== false;
  recog.maxAlternatives = 1;

  let active = false;
  let userRequestedStop = false;
  const transcriptListeners = new Set<(event: TranscriptionEvent) => void>();
  const stateListeners = new Set<(active: boolean) => void>();
  const errorListeners = new Set<(error: TranscriptionError) => void>();

  function notifyState(next: boolean): void {
    if (active === next) return;
    active = next;
    for (const l of stateListeners) l(active);
  }

  function notifyError(error: TranscriptionError): void {
    for (const l of errorListeners) l(error);
  }

  function notifyTranscript(event: TranscriptionEvent): void {
    for (const l of transcriptListeners) l(event);
  }

  recog.onstart = () => {
    notifyState(true);
  };

  recog.onresult = (event) => {
    let finalText = '';
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]!;
      const transcript = result[0].transcript;
      if (result.isFinal) finalText += transcript;
      else interimText += transcript;
    }
    notifyTranscript({ finalText, interimText });
  };

  recog.onerror = (event) => {
    const code = mapErrorCode(event.error);
    const message = humanMessageFor(code, event.message);
    notifyError({ code, message });
    // 'no-speech' + 'aborted' are recoverable — let the onend handler
    // restart if the user didn't ask to stop. Permission errors are
    // fatal until the user re-grants in browser settings.
    if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
      userRequestedStop = true;
    }
  };

  recog.onend = () => {
    notifyState(false);
    // Most browsers end the session after ~30s of silence even when
    // continuous: true. Auto-restart unless the user (or a fatal
    // error) requested a hard stop.
    if (!userRequestedStop) {
      try {
        recog.start();
      } catch {
        // start() throws if the recognizer is already running; safe
        // to ignore — we'll get another onend / onstart cycle.
      }
    }
  };

  function start(): void {
    if (active) return;
    userRequestedStop = false;
    try {
      recog.start();
    } catch (err) {
      notifyError({
        code: 'unknown',
        message: err instanceof Error ? err.message : 'Could not start the recognizer.',
      });
    }
  }

  function stop(): void {
    userRequestedStop = true;
    try {
      recog.stop();
    } catch {
      // Already stopped — silently ignore.
    }
  }

  return {
    start,
    stop,
    isActive: () => active,
    onTranscript(listener) {
      transcriptListeners.add(listener);
      return () => transcriptListeners.delete(listener);
    },
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    destroy() {
      userRequestedStop = true;
      try {
        recog.abort();
      } catch {
        /* already torn down */
      }
      recog.onstart = null;
      recog.onresult = null;
      recog.onerror = null;
      recog.onend = null;
      transcriptListeners.clear();
      stateListeners.clear();
      errorListeners.clear();
      active = false;
    },
  };
}

function mapErrorCode(raw: string): TranscriptionErrorCode {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'no-speech':
    case 'aborted':
    case 'audio-capture':
    case 'network':
    case 'language-not-supported':
      return raw;
    default:
      return 'unknown';
  }
}

function humanMessageFor(code: TranscriptionErrorCode, raw?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access blocked. Allow it in your browser settings, then try again.';
    case 'no-speech':
      return 'No speech detected — say something or stop the recorder.';
    case 'aborted':
      return 'Recording stopped.';
    case 'audio-capture':
      return 'Could not access the microphone. Check that one is plugged in and not in use.';
    case 'network':
      return 'Recognition service is unreachable. Check your connection.';
    case 'language-not-supported':
      return 'Your browser does not support this language for transcription.';
    default:
      return raw ?? 'Voice transcription failed. Try again.';
  }
}
