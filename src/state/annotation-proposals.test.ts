/**
 * Phase 120 — annotation-proposals tests.
 */
import { describe, it, expect } from 'vitest';
import {
  createAnnotationProposals,
  type AnnotationProposal,
} from './annotation-proposals.js';

function proposal(over: Partial<AnnotationProposal> = {}): AnnotationProposal {
  return {
    id: over.id ?? 'p-' + Math.random().toString(36).slice(2),
    senderId: over.senderId ?? 'spec-1',
    senderName: over.senderName ?? 'Bob',
    x: over.x ?? 100,
    y: over.y ?? 200,
    text: over.text ?? 'check this',
    color: over.color ?? '#fdd835',
    timestamp: over.timestamp ?? 1000,
  };
}

describe('createAnnotationProposals', () => {
  it('starts empty', () => {
    const q = createAnnotationProposals();
    expect(q.entries()).toEqual([]);
    expect(q.size()).toBe(0);
  });

  it('records proposals in arrival order', () => {
    const q = createAnnotationProposals();
    q.add(proposal({ id: 'a', text: 'first' }));
    q.add(proposal({ id: 'b', text: 'second' }));
    expect(q.entries().map((p) => p.text)).toEqual(['first', 'second']);
  });

  it('dedupes by id (re-broadcast is a silent no-op)', () => {
    const q = createAnnotationProposals();
    q.add(proposal({ id: 'a', text: 'once' }));
    q.add(proposal({ id: 'a', text: 'twice' })); // same id, different text
    expect(q.entries()).toHaveLength(1);
    expect(q.entries()[0]!.text).toBe('once');
  });

  it('drops proposals with empty id', () => {
    const q = createAnnotationProposals();
    q.add(proposal({ id: '' }));
    expect(q.entries()).toEqual([]);
  });

  it('caps at maxEntries (oldest evicted)', () => {
    const q = createAnnotationProposals({ maxEntries: 3 });
    q.add(proposal({ id: 'a' }));
    q.add(proposal({ id: 'b' }));
    q.add(proposal({ id: 'c' }));
    q.add(proposal({ id: 'd' }));
    expect(q.entries().map((p) => p.id)).toEqual(['b', 'c', 'd']);
  });

  it('eviction frees the dedupe slot', () => {
    const q = createAnnotationProposals({ maxEntries: 2 });
    q.add(proposal({ id: 'a', text: 'first' }));
    q.add(proposal({ id: 'b' }));
    q.add(proposal({ id: 'c' })); // evicts 'a'
    q.add(proposal({ id: 'a', text: 'reborn' }));
    const ids = q.entries().map((p) => p.id);
    expect(ids).toEqual(['c', 'a']);
    expect(q.entries()[1]!.text).toBe('reborn');
  });

  it('remove drops the matching entry + frees the dedupe slot', () => {
    const q = createAnnotationProposals();
    q.add(proposal({ id: 'a' }));
    q.add(proposal({ id: 'b' }));
    q.remove('a');
    expect(q.entries().map((p) => p.id)).toEqual(['b']);
    // Re-add after remove works (slot freed).
    q.add(proposal({ id: 'a', text: 'again' }));
    expect(q.entries().map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('remove of unknown id is a silent no-op', () => {
    const q = createAnnotationProposals();
    let calls = 0;
    q.subscribe(() => calls++);
    q.add(proposal({ id: 'a' }));
    expect(calls).toBe(1);
    q.remove('nope');
    expect(calls).toBe(1);
  });

  it('clear empties + notifies', () => {
    const q = createAnnotationProposals();
    let calls = 0;
    q.subscribe(() => calls++);
    q.add(proposal({ id: 'a' }));
    expect(calls).toBe(1);
    q.clear();
    expect(q.entries()).toEqual([]);
    expect(calls).toBe(2);
  });

  it('clear when already empty is a silent no-op', () => {
    const q = createAnnotationProposals();
    let calls = 0;
    q.subscribe(() => calls++);
    q.clear();
    expect(calls).toBe(0);
  });

  it('subscribe / unsubscribe round-trip', () => {
    const q = createAnnotationProposals();
    let calls = 0;
    const off = q.subscribe(() => calls++);
    q.add(proposal({ id: 'a' }));
    off();
    q.add(proposal({ id: 'b' }));
    expect(calls).toBe(1);
  });
});
