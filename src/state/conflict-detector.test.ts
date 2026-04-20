import { describe, it, expect } from 'vitest';
import { createConflictDetector } from './conflict-detector.js';

describe('createConflictDetector', () => {
  it('is not in conflict when no heartbeats have been seen', () => {
    const d = createConflictDetector('own');
    expect(d.hasConflict(1_000)).toBe(false);
    expect(d.peers()).toEqual([]);
  });

  it('ignores heartbeats from our own tab id', () => {
    const d = createConflictDetector('own');
    d.noteHeartbeat('own', 1_000);
    expect(d.hasConflict(1_000)).toBe(false);
    expect(d.peers()).toEqual([]);
  });

  it('declares a conflict on the first heartbeat from another tab', () => {
    const d = createConflictDetector('own');
    d.noteHeartbeat('peer-1', 1_000);
    expect(d.hasConflict(1_000)).toBe(true);
    expect(d.peers()).toEqual(['peer-1']);
  });

  it('clears the conflict once all peer heartbeats go stale', () => {
    const d = createConflictDetector('own', { stalenessMs: 5_000 });
    d.noteHeartbeat('peer-1', 1_000);
    // Within window
    expect(d.hasConflict(5_999)).toBe(true);
    // Just out of window
    expect(d.hasConflict(6_001)).toBe(false);
  });

  it('respects a custom stalenessMs', () => {
    const d = createConflictDetector('own', { stalenessMs: 1_000 });
    d.noteHeartbeat('peer', 0);
    expect(d.hasConflict(500)).toBe(true);
    expect(d.hasConflict(1_500)).toBe(false);
  });

  it('tracks multiple peers; conflict persists while any peer is fresh', () => {
    const d = createConflictDetector('own', { stalenessMs: 5_000 });
    d.noteHeartbeat('peer-1', 0);
    d.noteHeartbeat('peer-2', 3_000);
    expect(d.hasConflict(6_000)).toBe(true); // peer-2 still fresh
    expect(d.hasConflict(10_000)).toBe(false); // both stale
  });

  it('reset() forgets every peer', () => {
    const d = createConflictDetector('own');
    d.noteHeartbeat('peer-1', 1_000);
    d.reset();
    expect(d.hasConflict(1_000)).toBe(false);
    expect(d.peers()).toEqual([]);
  });
});
