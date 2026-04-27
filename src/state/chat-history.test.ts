/**
 * Phase 119 — chat-history tests.
 */
import { describe, it, expect } from 'vitest';
import {
  createChatHistory,
  spectatorShouldRenderChat,
  type ChatMessage,
} from './chat-history.js';

function msg(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: over.id ?? 'm-' + Math.random().toString(36).slice(2),
    senderId: over.senderId ?? 'p-1',
    senderName: over.senderName ?? 'Alice',
    senderRole: over.senderRole ?? 'gm',
    text: over.text ?? 'hello',
    visibility: over.visibility ?? 'shared',
    timestamp: over.timestamp ?? 1000,
  };
}

describe('createChatHistory', () => {
  it('starts empty', () => {
    const log = createChatHistory();
    expect(log.entries()).toEqual([]);
    expect(log.size()).toBe(0);
  });

  it('records messages in arrival order', () => {
    const log = createChatHistory();
    log.add(msg({ id: 'a', text: 'first' }));
    log.add(msg({ id: 'b', text: 'second' }));
    expect(log.entries().map((m) => m.text)).toEqual(['first', 'second']);
  });

  it('dedupes by id (re-broadcast / sync echo is a silent no-op)', () => {
    const log = createChatHistory();
    log.add(msg({ id: 'a', text: 'once' }));
    log.add(msg({ id: 'a', text: 'twice' })); // same id, different text
    expect(log.entries()).toHaveLength(1);
    expect(log.entries()[0]!.text).toBe('once');
  });

  it('drops messages with empty id', () => {
    const log = createChatHistory();
    log.add(msg({ id: '' }));
    expect(log.entries()).toEqual([]);
  });

  it('caps at maxEntries (oldest evicted)', () => {
    const log = createChatHistory({ maxEntries: 3 });
    log.add(msg({ id: 'a' }));
    log.add(msg({ id: 'b' }));
    log.add(msg({ id: 'c' }));
    log.add(msg({ id: 'd' }));
    expect(log.entries().map((m) => m.id)).toEqual(['b', 'c', 'd']);
  });

  it('eviction frees the dedupe slot — re-add with same id post-eviction works', () => {
    const log = createChatHistory({ maxEntries: 2 });
    log.add(msg({ id: 'a', text: 'first' }));
    log.add(msg({ id: 'b' }));
    log.add(msg({ id: 'c' })); // evicts 'a'
    log.add(msg({ id: 'a', text: 'reborn' })); // pushes b out, then trims c+a stays
    const ids = log.entries().map((m) => m.id);
    expect(ids).toEqual(['c', 'a']);
    expect(log.entries()[1]!.text).toBe('reborn');
  });

  it('clear empties + notifies', () => {
    const log = createChatHistory();
    let calls = 0;
    log.subscribe(() => calls++);
    log.add(msg({ id: 'a' }));
    expect(calls).toBe(1);
    log.clear();
    expect(log.entries()).toEqual([]);
    expect(calls).toBe(2);
  });

  it('clear when already empty is a silent no-op', () => {
    const log = createChatHistory();
    let calls = 0;
    log.subscribe(() => calls++);
    log.clear();
    expect(calls).toBe(0);
  });

  it('post-clear, the previously-seen id can be re-added', () => {
    const log = createChatHistory();
    log.add(msg({ id: 'a' }));
    log.clear();
    log.add(msg({ id: 'a' })); // would otherwise be deduped
    expect(log.entries()).toHaveLength(1);
  });

  it('subscribe / unsubscribe round-trip', () => {
    const log = createChatHistory();
    let calls = 0;
    const off = log.subscribe(() => calls++);
    log.add(msg({ id: 'a' }));
    off();
    log.add(msg({ id: 'b' }));
    expect(calls).toBe(1);
  });
});

describe('spectatorShouldRenderChat', () => {
  it('renders shared messages', () => {
    expect(spectatorShouldRenderChat(msg({ visibility: 'shared' }))).toBe(true);
  });

  it('drops gm-only messages', () => {
    expect(spectatorShouldRenderChat(msg({ visibility: 'gm-only' }))).toBe(false);
  });
});
