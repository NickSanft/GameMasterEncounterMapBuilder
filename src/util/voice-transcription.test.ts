import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVoiceTranscriber,
  isVoiceTranscriptionSupported,
} from './voice-transcription.js';

/**
 * Mock SpeechRecognition that records what the wrapper does to it
 * and exposes hooks for the tests to fire fake events.
 */
class MockRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  startCount = 0;
  stopCount = 0;
  abortCount = 0;

  start = vi.fn(() => {
    this.startCount++;
    // Synchronously fire onstart so tests don't have to await timers.
    queueMicrotask(() => this.onstart?.());
  });

  stop = vi.fn(() => {
    this.stopCount++;
    queueMicrotask(() => this.onend?.());
  });

  abort = vi.fn(() => {
    this.abortCount++;
  });

  /** Fire a fake recognition result. */
  emitResult(parts: Array<{ transcript: string; isFinal: boolean }>) {
    this.onresult?.({
      resultIndex: 0,
      results: parts.map((p) => ({
        isFinal: p.isFinal,
        0: { transcript: p.transcript },
        length: 1,
      })),
    });
  }

  emitError(error: string, message?: string) {
    this.onerror?.({ error, message });
  }
}

function makeCtor(): { Ctor: new () => MockRecognition; lastInstance: () => MockRecognition } {
  let last: MockRecognition | null = null;
  const Ctor = class extends MockRecognition {
    constructor() {
      super();
      last = this;
    }
  };
  return {
    Ctor: Ctor as unknown as new () => MockRecognition,
    lastInstance: () => {
      if (!last) throw new Error('No instance created yet');
      return last;
    },
  };
}

describe('isVoiceTranscriptionSupported', () => {
  beforeEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
  });

  it('returns false when neither constructor is on window', () => {
    expect(isVoiceTranscriptionSupported()).toBe(false);
  });

  it('returns true when standard SpeechRecognition is present', () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = class {};
    expect(isVoiceTranscriptionSupported()).toBe(true);
  });

  it('returns true when only webkit-prefixed version is present', () => {
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
      class {};
    expect(isVoiceTranscriptionSupported()).toBe(true);
  });
});

describe('createVoiceTranscriber', () => {
  beforeEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
  });

  it('returns null when no constructor is available', () => {
    expect(createVoiceTranscriber()).toBeNull();
  });

  it('creates a transcriber with sensible defaults from an injected ctor', () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor });
    expect(t).not.toBeNull();
    const inst = lastInstance();
    expect(inst.continuous).toBe(true);
    expect(inst.interimResults).toBe(true);
    expect(inst.maxAlternatives).toBe(1);
    // Either the lang we passed (none here) or a sensible browser fallback
    expect(inst.lang.length).toBeGreaterThan(0);
  });

  it('respects an explicit `lang` option', () => {
    const { Ctor, lastInstance } = makeCtor();
    createVoiceTranscriber({ ctor: Ctor, lang: 'fr-FR' });
    expect(lastInstance().lang).toBe('fr-FR');
  });

  it('fires onStateChange(true) when start succeeds', async () => {
    const { Ctor } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    const states: boolean[] = [];
    t.onStateChange((s) => states.push(s));
    t.start();
    await Promise.resolve();
    expect(t.isActive()).toBe(true);
    expect(states).toEqual([true]);
  });

  it('start() while active is a no-op (no double start)', async () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    t.start();
    await Promise.resolve();
    t.start();
    expect(lastInstance().startCount).toBe(1);
  });

  it('separates final + interim text in onTranscript events', () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    const events: { finalText: string; interimText: string }[] = [];
    t.onTranscript((e) => events.push(e));
    lastInstance().emitResult([
      { transcript: 'hello world', isFinal: true },
      { transcript: 'how are', isFinal: false },
    ]);
    expect(events).toEqual([
      { finalText: 'hello world', interimText: 'how are' },
    ]);
  });

  it('routes a permission-denied error and stops auto-restart', async () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    const errors: { code: string }[] = [];
    t.onError((e) => errors.push({ code: e.code }));
    t.start();
    await Promise.resolve();
    lastInstance().emitError('not-allowed');
    // Simulate the recognizer ending after the error.
    lastInstance().onend?.();
    expect(errors[0]?.code).toBe('not-allowed');
    // Should NOT have auto-restarted (startCount stays at 1).
    expect(lastInstance().startCount).toBe(1);
  });

  it('auto-restarts on natural end if user did not stop', async () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    t.start();
    await Promise.resolve();
    expect(lastInstance().startCount).toBe(1);
    // Browsers naturally end the session after silence — wrapper restarts.
    lastInstance().onend?.();
    expect(lastInstance().startCount).toBe(2);
  });

  it('does NOT auto-restart after user calls stop()', async () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    t.start();
    await Promise.resolve();
    t.stop();
    // stop() schedules onend via microtask; flush.
    await Promise.resolve();
    expect(lastInstance().startCount).toBe(1);
    expect(lastInstance().stopCount).toBe(1);
  });

  it('destroy() aborts the recognizer + clears every listener', async () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    const events: unknown[] = [];
    t.onTranscript((e) => events.push(e));
    t.start();
    await Promise.resolve();
    t.destroy();
    expect(lastInstance().abortCount).toBe(1);
    // After destroy, transcript events shouldn't reach the listener.
    lastInstance().emitResult([{ transcript: 'late', isFinal: true }]);
    expect(events).toEqual([]);
  });

  it('maps an unknown error string to code "unknown" + the original message', () => {
    const { Ctor, lastInstance } = makeCtor();
    const t = createVoiceTranscriber({ ctor: Ctor })!;
    const errors: { code: string; message: string }[] = [];
    t.onError((e) => errors.push(e));
    lastInstance().emitError('something-unexpected', 'Custom failure detail');
    expect(errors[0]?.code).toBe('unknown');
    expect(errors[0]?.message).toContain('Custom failure detail');
  });
});
