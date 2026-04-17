import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, rafThrottle } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire before the delay elapses', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires after the delay elapses', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    vi.advanceTimersByTime(101);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('coalesces rapid calls into a single invocation', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    for (let i = 0; i < 20; i++) {
      d();
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invokes with the most recent arguments', () => {
    const fn = vi.fn();
    const d = debounce((x: number) => fn(x), 100);
    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('flush() fires immediately', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops pending invocations', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('rafThrottle', () => {
  it('coalesces synchronous calls to a single invocation per frame', async () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled();
    throttled();
    throttled();
    expect(fn).not.toHaveBeenCalled();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows firing again after the frame resolves', async () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    throttled();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
