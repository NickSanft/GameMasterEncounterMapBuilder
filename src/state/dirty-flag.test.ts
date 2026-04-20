import { describe, it, expect, beforeEach } from 'vitest';
import {
  DIRTY_FLAG_KEY,
  consumeDirtyFlag,
  markDirty,
  markClean,
  _peekDirtyFlag,
} from './dirty-flag.js';

beforeEach(() => {
  localStorage.removeItem(DIRTY_FLAG_KEY);
});

describe('dirty-flag', () => {
  it('returns false on a fresh localStorage and sets the flag to true', () => {
    const was = consumeDirtyFlag();
    expect(was).toBe(false);
    expect(_peekDirtyFlag()).toBe(true);
  });

  it('returns true when the previous session left the flag set', () => {
    // Simulate a prior crashed session.
    localStorage.setItem(DIRTY_FLAG_KEY, '1');
    expect(consumeDirtyFlag()).toBe(true);
    // And it stays `true` after the consume (we're still running).
    expect(_peekDirtyFlag()).toBe(true);
  });

  it('markDirty is idempotent — no-op when already dirty', () => {
    markDirty();
    expect(_peekDirtyFlag()).toBe(true);
    markDirty();
    expect(_peekDirtyFlag()).toBe(true);
    markDirty();
    expect(_peekDirtyFlag()).toBe(true);
  });

  it('markClean clears the flag for the next boot', () => {
    markDirty();
    markClean();
    expect(_peekDirtyFlag()).toBe(false);
    // After a clean exit, next boot sees `false`.
    expect(consumeDirtyFlag()).toBe(false);
  });

  it('complete lifecycle: boot → run → crash → re-boot detects the crash', () => {
    // Cold boot (LS empty).
    expect(consumeDirtyFlag()).toBe(false);
    // App runs; a state change ensures dirty (cheap re-call).
    markDirty();
    // Page crashes — markClean is never called.
    // Next boot:
    expect(consumeDirtyFlag()).toBe(true); // detects crash
    markClean(); // user acknowledges banner / graceful exit
    // The boot after THAT:
    expect(consumeDirtyFlag()).toBe(false);
  });

  it('handles string values other than "1" as clean', () => {
    localStorage.setItem(DIRTY_FLAG_KEY, '');
    expect(consumeDirtyFlag()).toBe(false);
    localStorage.setItem(DIRTY_FLAG_KEY, '0');
    markClean();
    expect(_peekDirtyFlag()).toBe(false);
  });
});
