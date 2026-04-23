import { describe, it, expect, vi } from 'vitest';
import {
  createTourController,
  GM_TOUR_STEPS,
  type TourStep,
} from './onboarding-tour.js';

const STEPS: TourStep[] = [
  { id: 'a', title: 'A', body: '...', target: null },
  { id: 'b', title: 'B', body: '...', target: '.thing' },
  { id: 'c', title: 'C', body: '...', target: null },
];

describe('createTourController', () => {
  it('throws on empty steps (defensive — would otherwise NPE on snapshot)', () => {
    expect(() => createTourController({ steps: [] })).toThrow(/non-empty/);
  });

  it('starts on step 0 with isFirst=true / isLast=false', () => {
    const t = createTourController({ steps: STEPS });
    const s = t.getState();
    expect(s.index).toBe(0);
    expect(s.total).toBe(3);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(false);
    expect(s.step.id).toBe('a');
  });

  it('next() advances + notifies subscribers', () => {
    const t = createTourController({ steps: STEPS });
    const states: number[] = [];
    t.subscribe((s) => states.push(s.index));
    t.next();
    expect(t.getState().index).toBe(1);
    expect(t.getState().step.id).toBe('b');
    expect(states).toEqual([1]);
  });

  it('next() on the last step is a no-op', () => {
    const t = createTourController({ steps: STEPS });
    const fired = vi.fn();
    t.goTo(STEPS.length - 1);
    t.subscribe(fired);
    t.next();
    expect(t.getState().index).toBe(STEPS.length - 1);
    expect(fired).not.toHaveBeenCalled();
  });

  it('prev() steps backward + bottom-clamps to step 0', () => {
    const t = createTourController({ steps: STEPS });
    t.next();
    t.next();
    expect(t.getState().index).toBe(2);
    t.prev();
    expect(t.getState().index).toBe(1);
    t.prev();
    t.prev();
    expect(t.getState().index).toBe(0);
  });

  it('isFirst / isLast flip at the boundaries', () => {
    const t = createTourController({ steps: STEPS });
    expect(t.getState().isFirst).toBe(true);
    expect(t.getState().isLast).toBe(false);
    t.next();
    expect(t.getState().isFirst).toBe(false);
    expect(t.getState().isLast).toBe(false);
    t.next();
    expect(t.getState().isLast).toBe(true);
  });

  it('goTo(n) jumps + clamps + skips notify when index is unchanged', () => {
    const t = createTourController({ steps: STEPS });
    const fired = vi.fn();
    t.subscribe(fired);
    t.goTo(99);
    expect(t.getState().index).toBe(2);
    expect(fired).toHaveBeenCalledTimes(1);
    // Same-index no-op.
    t.goTo(2);
    expect(fired).toHaveBeenCalledTimes(1);
    // Negative clamps.
    t.goTo(-5);
    expect(t.getState().index).toBe(0);
  });

  it('finish() fires onComplete exactly once + flips isComplete', () => {
    const onComplete = vi.fn();
    const t = createTourController({ steps: STEPS, onComplete });
    expect(t.isComplete()).toBe(false);
    t.finish();
    expect(t.isComplete()).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
    t.finish();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip() fires onSkip exactly once + flips isSkipped', () => {
    const onSkip = vi.fn();
    const t = createTourController({ steps: STEPS, onSkip });
    t.skip();
    expect(t.isSkipped()).toBe(true);
    expect(onSkip).toHaveBeenCalledTimes(1);
    t.skip();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('skip() after finish() is a no-op (one terminal state wins)', () => {
    const onSkip = vi.fn();
    const t = createTourController({ steps: STEPS, onSkip });
    t.finish();
    t.skip();
    expect(t.isSkipped()).toBe(false);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('subscribe returns an unsubscribe fn', () => {
    const t = createTourController({ steps: STEPS });
    const fired = vi.fn();
    const unsub = t.subscribe(fired);
    t.next();
    expect(fired).toHaveBeenCalledTimes(1);
    unsub();
    t.next();
    expect(fired).toHaveBeenCalledTimes(1);
  });
});

describe('GM_TOUR_STEPS', () => {
  it('has stable, non-empty content for every step', () => {
    expect(GM_TOUR_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const s of GM_TOUR_STEPS) {
      expect(s.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it('every non-null target uses a CSS-selector-shaped string', () => {
    for (const s of GM_TOUR_STEPS) {
      if (s.target !== null) {
        // Either a class (.foo), id (#foo), or element (.foo#bar) selector.
        expect(s.target).toMatch(/^[#.]?[a-zA-Z][\w-]*/);
      }
    }
  });

  it('step ids are unique', () => {
    const ids = GM_TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
