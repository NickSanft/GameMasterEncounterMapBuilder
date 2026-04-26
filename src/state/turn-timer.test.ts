import { describe, it, expect } from 'vitest';
import {
  activeTurnKey,
  computeTimerView,
  createTurnTimerState,
  formatTimer,
  TURN_TIMER_URGENT_MS,
  TURN_TIMER_WARN_MS,
  urgencyFor,
} from './turn-timer.js';

describe('activeTurnKey', () => {
  it('returns null when activeId is null', () => {
    expect(activeTurnKey(null, 1)).toBeNull();
  });

  it('returns null when round is 0 (combat not running)', () => {
    expect(activeTurnKey('t1', 0)).toBeNull();
  });

  it('combines round + id so a re-entry in a new round is a new key', () => {
    expect(activeTurnKey('t1', 1)).toBe('1:t1');
    expect(activeTurnKey('t1', 2)).toBe('2:t1');
    expect(activeTurnKey('t1', 1)).not.toBe(activeTurnKey('t1', 2));
  });
});

describe('urgencyFor', () => {
  it('reports normal above the warn threshold', () => {
    expect(urgencyFor(60_000, 60_000)).toBe('normal');
    expect(urgencyFor(TURN_TIMER_WARN_MS + 1, 60_000)).toBe('normal');
  });

  it('reports warn between warn and urgent', () => {
    expect(urgencyFor(TURN_TIMER_WARN_MS, 60_000)).toBe('warn');
    expect(urgencyFor(TURN_TIMER_URGENT_MS + 1, 60_000)).toBe('warn');
  });

  it('reports urgent at/below the urgent threshold (but > 0)', () => {
    expect(urgencyFor(TURN_TIMER_URGENT_MS, 60_000)).toBe('urgent');
    expect(urgencyFor(1, 60_000)).toBe('urgent');
  });

  it('reports expired at 0 or below', () => {
    expect(urgencyFor(0, 60_000)).toBe('expired');
    expect(urgencyFor(-1000, 60_000)).toBe('expired');
  });

  it('reports normal when totalMs is 0 (timer off)', () => {
    expect(urgencyFor(0, 0)).toBe('normal');
  });
});

describe('formatTimer', () => {
  it('formats whole minutes:seconds', () => {
    expect(formatTimer(60_000)).toBe('1:00');
    expect(formatTimer(125_000)).toBe('2:05');
  });

  it('uses the leading-colon form below 60s', () => {
    expect(formatTimer(30_000)).toBe(':30');
    expect(formatTimer(8_000)).toBe(':08');
    expect(formatTimer(1_000)).toBe(':01');
  });

  it('rounds UP so 0:30.001 still reads as :31', () => {
    // ceil so the displayed value never under-promises remaining time.
    expect(formatTimer(30_001)).toBe(':31');
    expect(formatTimer(29_999)).toBe(':30');
  });

  it('clamps non-finite or non-positive to 0:00', () => {
    expect(formatTimer(0)).toBe('0:00');
    expect(formatTimer(-5_000)).toBe('0:00');
    expect(formatTimer(NaN)).toBe('0:00');
    expect(formatTimer(Infinity)).toBe('0:00'); // !Number.isFinite
  });
});

describe('computeTimerView', () => {
  it('returns null when duration is 0', () => {
    expect(
      computeTimerView({ now: 100, startedAt: 0, durationSeconds: 0 }),
    ).toBeNull();
  });

  it('returns null when no turn is running (startedAt null)', () => {
    expect(
      computeTimerView({ now: 100, startedAt: null, durationSeconds: 60 }),
    ).toBeNull();
  });

  it('reports remainingMs = totalMs at the moment a turn starts', () => {
    const view = computeTimerView({
      now: 1000,
      startedAt: 1000,
      durationSeconds: 60,
    });
    expect(view).not.toBeNull();
    expect(view!.remainingMs).toBe(60_000);
    expect(view!.totalMs).toBe(60_000);
    expect(view!.urgency).toBe('normal');
  });

  it('reports the right urgency tier mid-turn', () => {
    const start = 0;
    expect(
      computeTimerView({ now: 35_000, startedAt: start, durationSeconds: 60 })!
        .urgency,
    ).toBe('warn'); // 25s left
    expect(
      computeTimerView({ now: 55_000, startedAt: start, durationSeconds: 60 })!
        .urgency,
    ).toBe('urgent'); // 5s left
    expect(
      computeTimerView({ now: 70_000, startedAt: start, durationSeconds: 60 })!
        .urgency,
    ).toBe('expired'); // -10s
  });

  it('clamps remainingMs to 0 when expired', () => {
    const view = computeTimerView({
      now: 70_000,
      startedAt: 0,
      durationSeconds: 60,
    });
    expect(view!.remainingMs).toBe(0);
  });
});

describe('createTurnTimerState', () => {
  function makeClock() {
    let nowMs = 0;
    return {
      now: () => nowMs,
      advance(by: number) {
        nowMs += by;
      },
    };
  }

  it('starts with no active key + no startedAt', () => {
    const t = createTurnTimerState();
    expect(t.activeKey()).toBeNull();
    expect(t.startedAt()).toBeNull();
  });

  it('syncActive(key) sets startedAt to now() on the first key', () => {
    const clock = makeClock();
    const t = createTurnTimerState({ now: clock.now });
    clock.advance(1234);
    const changed = t.syncActive('1:t1');
    expect(changed).toBe(true);
    expect(t.startedAt()).toBe(1234);
    expect(t.activeKey()).toBe('1:t1');
  });

  it('syncActive with the SAME key is a no-op (returns false, startedAt unchanged)', () => {
    const clock = makeClock();
    const t = createTurnTimerState({ now: clock.now });
    clock.advance(100);
    t.syncActive('1:t1');
    clock.advance(500);
    const changed = t.syncActive('1:t1');
    expect(changed).toBe(false);
    expect(t.startedAt()).toBe(100); // unchanged
  });

  it('syncActive with a NEW key resets startedAt', () => {
    const clock = makeClock();
    const t = createTurnTimerState({ now: clock.now });
    clock.advance(100);
    t.syncActive('1:t1');
    clock.advance(500);
    t.syncActive('1:t2');
    expect(t.startedAt()).toBe(600);
    expect(t.activeKey()).toBe('1:t2');
  });

  it('syncActive(null) clears startedAt', () => {
    const clock = makeClock();
    const t = createTurnTimerState({ now: clock.now });
    t.syncActive('1:t1');
    expect(t.startedAt()).not.toBeNull();
    t.syncActive(null);
    expect(t.startedAt()).toBeNull();
    expect(t.activeKey()).toBeNull();
  });
});
