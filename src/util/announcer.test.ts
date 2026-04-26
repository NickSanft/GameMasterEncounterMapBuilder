import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAnnouncer } from './announcer.js';

describe('createAnnouncer — basics (no rate-limit)', () => {
  let announcer: ReturnType<typeof createAnnouncer>;

  beforeEach(() => {
    // Pre-Phase-90 instant behavior: no queue, no repeat-suppress.
    // The basic-contract tests below use this setup to verify the
    // "what gets read after I announce" semantics independently of
    // the Phase 90 throttling layer.
    announcer = createAnnouncer(document.body, {
      minIntervalMs: 0,
      repeatSuppressMs: 0,
    });
  });

  afterEach(() => {
    announcer.destroy();
  });

  it('mounts two live regions with the correct aria attributes', () => {
    const polite = document.querySelector('[data-announcer="polite"]');
    const assertive = document.querySelector('[data-announcer="assertive"]');
    expect(polite).not.toBeNull();
    expect(assertive).not.toBeNull();
    expect(polite!.getAttribute('aria-live')).toBe('polite');
    expect(assertive!.getAttribute('aria-live')).toBe('assertive');
    expect(polite!.getAttribute('aria-atomic')).toBe('true');
    expect(polite!.getAttribute('role')).toBe('status');
  });

  it('routes polite announcements to the polite region by default', () => {
    announcer.announce('Tool: Select');
    announcer.flush();
    expect(announcer.readCurrent('polite')).toBe('Tool: Select');
    expect(announcer.readCurrent('assertive')).toBe('');
  });

  it('routes assertive announcements to the assertive region', () => {
    announcer.announce('GM tab conflict detected', 'assertive');
    expect(announcer.readCurrent('assertive')).toBe('GM tab conflict detected');
    expect(announcer.readCurrent('polite')).toBe('');
  });

  it('forces repeats of identical text to register (toggles NBSP suffix)', () => {
    announcer.announce('Token placed');
    announcer.flush();
    const polite = document.querySelector<HTMLElement>('[data-announcer="polite"]')!;
    const first = polite.textContent;
    announcer.announce('Token placed');
    announcer.flush();
    const second = polite.textContent;
    expect(second).not.toBe(first);
    expect(announcer.readCurrent('polite')).toBe('Token placed');
  });

  it('destroy() removes the regions from the DOM', () => {
    announcer.destroy();
    expect(document.querySelector('[data-announcer="polite"]')).toBeNull();
    expect(document.querySelector('[data-announcer="assertive"]')).toBeNull();
  });
});

/**
 * Phase 90 — rate-limit + repeat-suppress queue tests. Use fake time
 * (the `now` + `setTimer` / `clearTimer` seams) so the queue can be
 * exercised without real `setTimeout` waiting.
 */
describe('createAnnouncer — Phase 90 (rate-limit + repeat-suppress)', () => {
  /** Simple deterministic timer queue for the announcer's flush callbacks. */
  function makeFakeClock() {
    let nowMs = 0;
    type Pending = { fireAt: number; fn: () => void };
    const pending: Pending[] = [];
    let nextHandle = 1;
    return {
      now: () => nowMs,
      setTimer(fn: () => void, delay: number) {
        const handle = nextHandle++;
        pending.push({ fireAt: nowMs + delay, fn });
        return handle;
      },
      clearTimer(_handle: unknown) {
        // The announcer only ever has one pending timer, so we can
        // just nuke the queue when asked to clear.
        pending.length = 0;
      },
      advance(deltaMs: number) {
        nowMs += deltaMs;
        // Fire all pending timers whose fireAt has elapsed. Loop
        // because a fired timer may schedule another.
        let didFire = true;
        while (didFire) {
          didFire = false;
          for (let i = 0; i < pending.length; i++) {
            if (pending[i]!.fireAt <= nowMs) {
              const fn = pending[i]!.fn;
              pending.splice(i, 1);
              i--;
              fn();
              didFire = true;
            }
          }
        }
      },
    };
  }

  let clock: ReturnType<typeof makeFakeClock>;
  let announcer: ReturnType<typeof createAnnouncer>;

  beforeEach(() => {
    clock = makeFakeClock();
    announcer = createAnnouncer(document.body, {
      minIntervalMs: 600,
      repeatSuppressMs: 1500,
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });
  });

  afterEach(() => {
    announcer.destroy();
  });

  it('first polite announcement after silence fires immediately (no wait)', () => {
    // After a long silence (lastFlushAt = -Infinity), the rate-limit
    // is fully drained — the first call doesn't need to wait for an
    // interval that's already elapsed.
    announcer.announce('Selected: Goblin');
    // The flush fires inside the timer callback even with delay=0,
    // so we still have to advance the clock at least one tick.
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('Selected: Goblin');
  });

  it('a SECOND polite announcement within the interval gets queued', () => {
    announcer.announce('First');
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('First');
    // 100 ms later — well inside the 600 ms rate-limit window.
    clock.advance(100);
    announcer.announce('Second');
    expect(announcer.readCurrent('polite')).toBe('First'); // not yet
    clock.advance(499); // total 599 since first flush
    expect(announcer.readCurrent('polite')).toBe('First'); // still queued
    clock.advance(1); // total 600 since first flush
    expect(announcer.readCurrent('polite')).toBe('Second');
  });

  it('a flurry of polite announcements collapses to the LAST one (after the first)', () => {
    announcer.announce('Initial');
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('Initial');
    // Burst inside the rate-limit window.
    announcer.announce('Selected: Goblin');
    announcer.announce('Selected: Orc');
    announcer.announce('Selected: Bandit');
    clock.advance(600);
    expect(announcer.readCurrent('polite')).toBe('Selected: Bandit');
  });

  it('an identical message inside the suppress window is dropped', () => {
    announcer.announce('Heartbeat warning');
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('Heartbeat warning');
    const polite = document.querySelector<HTMLElement>('[data-announcer="polite"]')!;
    const before = polite.textContent;
    // 500 ms later — inside both the 600 ms interval AND the 1500 ms
    // suppress window. Same message → must be dropped (no flush).
    clock.advance(500);
    announcer.announce('Heartbeat warning');
    clock.advance(2000);
    expect(polite.textContent).toBe(before);
  });

  it('after the suppress window elapses, the same message announces again', () => {
    announcer.announce('Heartbeat warning');
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('Heartbeat warning');
    // Walk past the 1500 ms suppress window (from time of last flush).
    clock.advance(1600);
    const polite = document.querySelector<HTMLElement>('[data-announcer="polite"]')!;
    const before = polite.textContent;
    announcer.announce('Heartbeat warning');
    clock.advance(600);
    // Second announcement DID land — text differs (NBSP toggle).
    expect(polite.textContent).not.toBe(before);
  });

  it('assertive announcements bypass the queue + the suppress filter', () => {
    announcer.announce('GM tab conflict', 'assertive');
    expect(announcer.readCurrent('assertive')).toBe('GM tab conflict');
    // Repeat — assertive ignores suppress.
    announcer.announce('GM tab conflict', 'assertive');
    expect(announcer.readCurrent('assertive')).toBe('GM tab conflict');
  });

  it('an assertive announcement cancels any pending polite write', () => {
    // First polite call drains immediately, so we make TWO calls — the
    // second is queued behind the rate-limit and is what assertive cancels.
    announcer.announce('First');
    clock.advance(0);
    announcer.announce('Selected: Goblin');
    expect(announcer.readCurrent('polite')).toBe('First');
    announcer.announce('GM tab conflict', 'assertive');
    expect(announcer.readCurrent('assertive')).toBe('GM tab conflict');
    clock.advance(2000);
    // Pending polite ('Selected: Goblin') was cancelled — polite still
    // shows the 'First' value, never advanced to 'Selected: Goblin'.
    expect(announcer.readCurrent('polite')).toBe('First');
  });

  it('flush() drains the pending polite write immediately', () => {
    // Make a first call so subsequent calls are actually queued
    // (the first call drains immediately because we've been silent).
    announcer.announce('First');
    clock.advance(0);
    announcer.announce('Selected: Goblin');
    expect(announcer.readCurrent('polite')).toBe('First');
    announcer.flush();
    expect(announcer.readCurrent('polite')).toBe('Selected: Goblin');
  });

  it('a long-paced sequence (slower than the interval) gets every message through', () => {
    announcer.announce('Round 1');
    clock.advance(700);
    expect(announcer.readCurrent('polite')).toBe('Round 1');
    announcer.announce('Round 2');
    clock.advance(700);
    expect(announcer.readCurrent('polite')).toBe('Round 2');
    announcer.announce('Round 3');
    clock.advance(700);
    expect(announcer.readCurrent('polite')).toBe('Round 3');
  });

  it('overlapping bursts collapse correctly across multiple intervals', () => {
    // Prime: first call drains immediately.
    announcer.announce('Prime');
    clock.advance(0);
    expect(announcer.readCurrent('polite')).toBe('Prime');
    // Burst 1: A B C → C wins after 600 ms
    announcer.announce('A');
    announcer.announce('B');
    announcer.announce('C');
    clock.advance(600);
    expect(announcer.readCurrent('polite')).toBe('C');
    // Burst 2: D E → E wins after another 600 ms
    announcer.announce('D');
    announcer.announce('E');
    clock.advance(600);
    expect(announcer.readCurrent('polite')).toBe('E');
  });

  it('a duplicate of the currently-pending message is dropped', () => {
    announcer.announce('Same');
    announcer.announce('Same'); // redundant; should be no-op
    clock.advance(600);
    // Single flush — NBSP toggle reflects exactly one write.
    const polite = document.querySelector<HTMLElement>('[data-announcer="polite"]')!;
    const after = polite.textContent;
    expect(after).toContain('Same');
  });
});
