import { describe, it, expect } from 'vitest';
import {
  createLatencyTracker,
  bandFor,
} from './latency-tracker.js';

describe('createLatencyTracker', () => {
  it('starts with no samples + null median', () => {
    const t = createLatencyTracker();
    expect(t.median()).toBeNull();
    expect(t._samples()).toEqual([]);
  });

  it('records a single sample and returns it as the median', () => {
    const t = createLatencyTracker();
    t.note(45);
    expect(t.median()).toBe(45);
  });

  it('caps the sample buffer at 5 (FIFO eviction)', () => {
    const t = createLatencyTracker();
    for (let i = 1; i <= 7; i++) t.note(i * 10);
    expect(t._samples()).toEqual([30, 40, 50, 60, 70]);
  });

  it('median picks the middle value of an odd-length buffer', () => {
    const t = createLatencyTracker();
    [10, 200, 50].forEach((s) => t.note(s));
    expect(t.median()).toBe(50);
  });

  it('median averages the two middle values for an even-length buffer', () => {
    const t = createLatencyTracker();
    [10, 200, 50, 80].forEach((s) => t.note(s));
    // Sorted: [10, 50, 80, 200] → (50+80)/2 = 65.
    expect(t.median()).toBe(65);
  });

  it('rounds the median to an integer for clean display', () => {
    const t = createLatencyTracker();
    [10, 11].forEach((s) => t.note(s));
    expect(t.median()).toBe(11); // (10+11)/2 = 10.5 → round-half-up → 11
  });

  it('shrugs off a single outlier when the buffer is full', () => {
    const t = createLatencyTracker();
    [50, 50, 50, 50, 5000].forEach((s) => t.note(s));
    // Sorted: [50, 50, 50, 50, 5000] → median is 50 (3rd of 5).
    expect(t.median()).toBe(50);
  });

  it('ignores negative / non-finite samples', () => {
    const t = createLatencyTracker();
    t.note(-10);
    t.note(Number.NaN);
    t.note(Number.POSITIVE_INFINITY);
    expect(t._samples()).toEqual([]);
  });

  it('reset clears all samples and notifies', () => {
    const t = createLatencyTracker();
    let calls = 0;
    t.subscribe(() => calls++);
    t.note(50);
    expect(calls).toBe(1);
    t.reset();
    expect(calls).toBe(2);
    expect(t.median()).toBeNull();
  });

  it('reset on an empty tracker is a no-op (no notify)', () => {
    const t = createLatencyTracker();
    let calls = 0;
    t.subscribe(() => calls++);
    t.reset();
    expect(calls).toBe(0);
  });

  it('notifies subscribers on every note', () => {
    const t = createLatencyTracker();
    let calls = 0;
    t.subscribe(() => calls++);
    t.note(10);
    t.note(20);
    t.note(30);
    expect(calls).toBe(3);
  });

  it('unsubscribe stops further notifications', () => {
    const t = createLatencyTracker();
    let calls = 0;
    const off = t.subscribe(() => calls++);
    t.note(10);
    off();
    t.note(20);
    expect(calls).toBe(1);
  });
});

describe('bandFor', () => {
  it('< 100ms → good', () => {
    expect(bandFor(0)).toBe('good');
    expect(bandFor(45)).toBe('good');
    expect(bandFor(99)).toBe('good');
  });

  it('100-299ms → ok', () => {
    expect(bandFor(100)).toBe('ok');
    expect(bandFor(200)).toBe('ok');
    expect(bandFor(299)).toBe('ok');
  });

  it('>= 300ms → poor', () => {
    expect(bandFor(300)).toBe('poor');
    expect(bandFor(800)).toBe('poor');
    expect(bandFor(5000)).toBe('poor');
  });
});
