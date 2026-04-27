/**
 * Phase 122 — token-move-history tests.
 */
import { describe, it, expect } from 'vitest';
import { createTokenMoveHistory } from './token-move-history.js';

describe('createTokenMoveHistory', () => {
  it('starts empty', () => {
    const h = createTokenMoveHistory();
    expect(h.size()).toBe(0);
    expect(h.peekLast()).toBeNull();
  });

  it('records moves + popLast returns them in LIFO order', () => {
    const h = createTokenMoveHistory();
    h.record({ tokenId: 'a', fromX: 0, fromY: 0, toX: 1, toY: 1 });
    h.record({ tokenId: 'a', fromX: 1, fromY: 1, toX: 2, toY: 2 });
    expect(h.size()).toBe(2);
    expect(h.popLast()?.toX).toBe(2);
    expect(h.popLast()?.toX).toBe(1);
    expect(h.popLast()).toBeNull();
  });

  it('peekLast does not consume', () => {
    const h = createTokenMoveHistory();
    h.record({ tokenId: 'a', fromX: 0, fromY: 0, toX: 1, toY: 1 });
    expect(h.peekLast()?.toX).toBe(1);
    expect(h.size()).toBe(1);
  });

  it('skips no-op moves (from == to)', () => {
    const h = createTokenMoveHistory();
    h.record({ tokenId: 'a', fromX: 5, fromY: 5, toX: 5, toY: 5 });
    expect(h.size()).toBe(0);
    expect(h.peekLast()).toBeNull();
  });

  it('caps at maxEntries (oldest evicted)', () => {
    const h = createTokenMoveHistory({ maxEntries: 2 });
    h.record({ tokenId: 'a', fromX: 0, fromY: 0, toX: 1, toY: 0 });
    h.record({ tokenId: 'b', fromX: 0, fromY: 0, toX: 2, toY: 0 });
    h.record({ tokenId: 'c', fromX: 0, fromY: 0, toX: 3, toY: 0 });
    expect(h.size()).toBe(2);
    // Oldest ('a') evicted; 'b' is now the bottom.
    expect(h.popLast()?.tokenId).toBe('c');
    expect(h.popLast()?.tokenId).toBe('b');
  });

  it('clear drops every entry', () => {
    const h = createTokenMoveHistory();
    h.record({ tokenId: 'a', fromX: 0, fromY: 0, toX: 1, toY: 1 });
    h.clear();
    expect(h.size()).toBe(0);
    expect(h.peekLast()).toBeNull();
  });

  it('uses the now seam when timestamp is omitted', () => {
    let t = 1234;
    const h = createTokenMoveHistory({ now: () => t });
    h.record({ tokenId: 'a', fromX: 0, fromY: 0, toX: 1, toY: 1 });
    expect(h.peekLast()?.timestamp).toBe(1234);
    t = 5678;
    h.record({ tokenId: 'b', fromX: 0, fromY: 0, toX: 1, toY: 1 });
    expect(h.peekLast()?.timestamp).toBe(5678);
  });

  it('honors an explicit timestamp on the entry', () => {
    const h = createTokenMoveHistory({ now: () => 999 });
    h.record({
      tokenId: 'a',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 1,
      timestamp: 42,
    });
    expect(h.peekLast()?.timestamp).toBe(42);
  });
});
