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

  describe('Phase 84 — peer summaries + freshPeers', () => {
    const summaryA = { lastModified: 1_000, tokenCount: 5, sceneName: 'A' };
    const summaryB = { lastModified: 2_000, tokenCount: 8, sceneName: 'B' };

    it('captures the per-peer summary on noteHeartbeat', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer-1', 1_000, summaryA);
      const fresh = d.freshPeers(1_000);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toEqual({
        tabId: 'peer-1',
        lastSeen: 1_000,
        summary: summaryA,
      });
    });

    it('updates the summary as newer heartbeats arrive', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer-1', 1_000, summaryA);
      d.noteHeartbeat('peer-1', 2_000, summaryB);
      const fresh = d.freshPeers(2_000);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]?.summary).toEqual(summaryB);
      expect(fresh[0]?.lastSeen).toBe(2_000);
    });

    it('omits stale peers from freshPeers', () => {
      const d = createConflictDetector('own', { stalenessMs: 1_000 });
      d.noteHeartbeat('stale', 0, summaryA);
      d.noteHeartbeat('fresh', 1_000, summaryB);
      const fresh = d.freshPeers(1_500);
      expect(fresh.map((p) => p.tabId)).toEqual(['fresh']);
    });

    it('lists peers in deterministic tabId-asc order', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('zzz', 1_000, summaryA);
      d.noteHeartbeat('aaa', 1_000, summaryA);
      d.noteHeartbeat('mmm', 1_000, summaryA);
      const fresh = d.freshPeers(1_000);
      expect(fresh.map((p) => p.tabId)).toEqual(['aaa', 'mmm', 'zzz']);
    });

    it('returns a copy from freshPeers — caller mutation is local', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer', 1_000, summaryA);
      const fresh = d.freshPeers(1_000);
      fresh[0]!.summary = null;
      const fresh2 = d.freshPeers(1_000);
      expect(fresh2[0]?.summary).toEqual(summaryA);
    });

    it('a heartbeat without a summary is recorded with summary: null', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer', 1_000);
      const fresh = d.freshPeers(1_000);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]?.summary).toBeNull();
    });

    it('a later heartbeat without a summary preserves the previous summary', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer', 1_000, summaryA);
      d.noteHeartbeat('peer', 2_000); // no summary this time
      const fresh = d.freshPeers(2_000);
      expect(fresh[0]?.summary).toEqual(summaryA);
      expect(fresh[0]?.lastSeen).toBe(2_000);
    });

    it('passing summary: null explicitly clears the prior summary', () => {
      const d = createConflictDetector('own', { stalenessMs: 5_000 });
      d.noteHeartbeat('peer', 1_000, summaryA);
      d.noteHeartbeat('peer', 2_000, null);
      const fresh = d.freshPeers(2_000);
      expect(fresh[0]?.summary).toBeNull();
    });

    it('reset() also clears summaries', () => {
      const d = createConflictDetector('own');
      d.noteHeartbeat('peer', 1_000, summaryA);
      d.reset();
      expect(d.freshPeers(1_000)).toEqual([]);
    });

    it('ignores own-tab heartbeats including their summaries', () => {
      const d = createConflictDetector('own');
      d.noteHeartbeat('own', 1_000, summaryA);
      expect(d.freshPeers(1_000)).toEqual([]);
    });
  });
});
