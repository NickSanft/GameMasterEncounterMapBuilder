/**
 * Phase 103 — long-press detector tests.
 *
 * The detector takes clock + timer seams so we can drive its
 * timing deterministically. Each test replaces the internal
 * `setTimer` / `clearTimer` with a tiny scheduler that records
 * pending callbacks + lets the test fire them at precise moments.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  attachLongPress,
  LONGPRESS_HOLD_MS,
  LONGPRESS_MOVE_THRESHOLD_PX,
} from './long-press.js';

/** Fake timer that records the most-recently-scheduled callback. */
function fakeTimer() {
  let pending: { cb: () => void; ms: number; handle: number } | null = null;
  let nextHandle = 1;
  return {
    setTimer(cb: () => void, ms: number) {
      const handle = nextHandle++;
      pending = { cb, ms, handle };
      return handle;
    },
    clearTimer(handle: unknown) {
      if (pending && pending.handle === handle) pending = null;
    },
    fire() {
      if (!pending) return false;
      const { cb } = pending;
      pending = null;
      cb();
      return true;
    },
    isPending() {
      return pending !== null;
    },
    pendingMs() {
      return pending?.ms ?? null;
    },
  };
}

/** Build a synthetic PointerEvent for a touch pointer. */
function touchEvent(
  type: string,
  pointerId: number,
  x: number,
  y: number,
): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    pointerType: 'touch',
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
}

function setup() {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const onLongPress = vi.fn();
  const timers = fakeTimer();
  const handle = attachLongPress(target, {
    onLongPress,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  return { target, onLongPress, timers, handle };
}

describe('attachLongPress: success path', () => {
  it('fires after the hold timer expires with the original touchdown coords', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 200));
    expect(timers.isPending()).toBe(true);
    expect(timers.pendingMs()).toBe(LONGPRESS_HOLD_MS);
    timers.fire();
    expect(onLongPress).toHaveBeenCalledWith(100, 200);
  });

  it('uses the hold-ms override when supplied', () => {
    const target = document.createElement('div');
    const onLongPress = vi.fn();
    const timers = fakeTimer();
    attachLongPress(target, {
      onLongPress,
      holdMs: 250,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    target.dispatchEvent(touchEvent('pointerdown', 1, 0, 0));
    expect(timers.pendingMs()).toBe(250);
  });
});

describe('attachLongPress: cancellation', () => {
  it('cancels on pointerup before the timer fires', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 50, 50));
    target.dispatchEvent(touchEvent('pointerup', 1, 50, 50));
    expect(timers.isPending()).toBe(false);
    timers.fire(); // no-op since cleared
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels on pointercancel before the timer fires', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 50, 50));
    target.dispatchEvent(touchEvent('pointercancel', 1, 50, 50));
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels when a second finger lands (gesture upgraded to pinch)', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    expect(timers.isPending()).toBe(true);
    target.dispatchEvent(touchEvent('pointerdown', 2, 200, 200));
    expect(timers.isPending()).toBe(false);
    timers.fire();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels when the pointer moves beyond the threshold', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    // Stay just inside the threshold — should NOT cancel.
    target.dispatchEvent(touchEvent('pointermove', 1, 105, 105));
    expect(timers.isPending()).toBe(true);
    // Move past the threshold — should cancel.
    target.dispatchEvent(
      touchEvent('pointermove', 1, 100 + LONGPRESS_MOVE_THRESHOLD_PX + 5, 100),
    );
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('move within threshold does NOT cancel even after multiple jitters', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(touchEvent('pointermove', 1, 102, 99));
    target.dispatchEvent(touchEvent('pointermove', 1, 98, 103));
    target.dispatchEvent(touchEvent('pointermove', 1, 105, 100));
    expect(timers.isPending()).toBe(true);
    timers.fire();
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('move thresholds are absolute distance from START, not previous move', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    // Inch outward in 4px steps — well within move-vs-prev threshold but
    // the cumulative drift should eventually trip the start-anchored check.
    target.dispatchEvent(touchEvent('pointermove', 1, 104, 100));
    expect(timers.isPending()).toBe(true);
    target.dispatchEvent(touchEvent('pointermove', 1, 108, 100));
    expect(timers.isPending()).toBe(true);
    target.dispatchEvent(touchEvent('pointermove', 1, 115, 100));
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('attachLongPress: pointer-type filtering', () => {
  it('ignores mouse pointers entirely', () => {
    const { target, onLongPress, timers } = setup();
    const ev = new PointerEvent('pointerdown', {
      pointerId: 99,
      pointerType: 'mouse',
      bubbles: true,
      clientX: 50,
      clientY: 50,
    });
    target.dispatchEvent(ev);
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('ignores pen pointers entirely', () => {
    const { target, onLongPress, timers } = setup();
    const ev = new PointerEvent('pointerdown', {
      pointerId: 99,
      pointerType: 'pen',
      bubbles: true,
      clientX: 50,
      clientY: 50,
    });
    target.dispatchEvent(ev);
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('ignores moves / ups for unrelated pointer ids', () => {
    const { target, onLongPress, timers } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    // Some other touch finger that we never tracked.
    target.dispatchEvent(touchEvent('pointermove', 99, 999, 999));
    expect(timers.isPending()).toBe(true);
    target.dispatchEvent(touchEvent('pointerup', 99, 0, 0));
    expect(timers.isPending()).toBe(true);
    timers.fire();
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('attachLongPress: destroy', () => {
  it('removes listeners on destroy', () => {
    const { target, onLongPress, timers, handle } = setup();
    handle.destroy();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    expect(timers.isPending()).toBe(false);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('destroy mid-press cancels the pending timer', () => {
    const { target, timers, handle } = setup();
    target.dispatchEvent(touchEvent('pointerdown', 1, 100, 100));
    expect(timers.isPending()).toBe(true);
    handle.destroy();
    expect(timers.isPending()).toBe(false);
  });
});
