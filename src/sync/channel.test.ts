import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSyncChannel, type AttachableRemote } from './channel.js';
import type { SyncMessage } from './messages.js';

/**
 * Minimal BroadcastChannel stub that mirrors the global so vitest
 * (which is jsdom) can exercise the `SyncChannel` interface. Each
 * `new BroadcastChannel(name)` gets wired into a shared registry so
 * sends from one instance are delivered to other instances with the
 * same name (mimicking browser behavior), with the browser
 * guarantee that a sender does NOT receive its own messages.
 */
class MockBroadcastChannel {
  static registry = new Map<string, Set<MockBroadcastChannel>>();
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(public name: string) {
    let set = MockBroadcastChannel.registry.get(name);
    if (!set) {
      set = new Set();
      MockBroadcastChannel.registry.set(name, set);
    }
    set.add(this);
  }
  postMessage(data: unknown) {
    const set = MockBroadcastChannel.registry.get(this.name);
    if (!set) return;
    for (const ch of set) {
      if (ch === this) continue;
      ch.onmessage?.({ data } as MessageEvent);
    }
  }
  close() {
    MockBroadcastChannel.registry.get(this.name)?.delete(this);
  }
}

beforeEach(() => {
  MockBroadcastChannel.registry.clear();
  (globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
    MockBroadcastChannel as unknown as typeof BroadcastChannel;
});

/**
 * Stub remote transport: records every `send()` + exposes `emit()`
 * so a test can simulate an inbound message from the peer.
 */
function createStubRemote(): AttachableRemote & {
  sent: SyncMessage[];
  emit(msg: SyncMessage): void;
} {
  const sent: SyncMessage[] = [];
  const listeners = new Set<(msg: SyncMessage) => void>();
  return {
    send(msg) {
      sent.push(msg);
    },
    onMessage(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    sent,
    emit(msg) {
      for (const l of listeners) l(msg);
    },
  };
}

const HELLO: SyncMessage = { type: 'hello', from: 'gm' };
const PING: SyncMessage = { type: 'ping', x: 1, y: 2 };

describe('createSyncChannel', () => {
  it('returns null when BroadcastChannel is unavailable', () => {
    const orig = (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
    delete (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
    expect(createSyncChannel()).toBeNull();
    (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = orig;
  });

  it('same-origin sends get delivered to other BC listeners (not self)', () => {
    const a = createSyncChannel()!;
    const b = createSyncChannel()!;
    const aReceived: SyncMessage[] = [];
    const bReceived: SyncMessage[] = [];
    a.onMessage((m) => aReceived.push(m));
    b.onMessage((m) => bReceived.push(m));
    a.send(HELLO);
    expect(aReceived).toEqual([]);
    expect(bReceived).toEqual([HELLO]);
  });
});

describe('SyncChannel.attachRemote', () => {
  it('fans outgoing sends to the attached remote', () => {
    const ch = createSyncChannel()!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.send(HELLO);
    ch.send(PING);
    expect(remote.sent).toEqual([HELLO, PING]);
  });

  it('routes incoming remote messages to the channel\'s onMessage listeners', () => {
    const ch = createSyncChannel()!;
    const remote = createStubRemote();
    const received: SyncMessage[] = [];
    ch.onMessage((m) => received.push(m));
    ch.attachRemote(remote);
    remote.emit(PING);
    expect(received).toEqual([PING]);
  });

  it('fans to multiple remotes independently', () => {
    const ch = createSyncChannel()!;
    const r1 = createStubRemote();
    const r2 = createStubRemote();
    ch.attachRemote(r1);
    ch.attachRemote(r2);
    ch.send(HELLO);
    expect(r1.sent).toEqual([HELLO]);
    expect(r2.sent).toEqual([HELLO]);
  });

  it('detach stops fan-out for that remote only', () => {
    const ch = createSyncChannel()!;
    const r1 = createStubRemote();
    const r2 = createStubRemote();
    const detach1 = ch.attachRemote(r1);
    ch.attachRemote(r2);
    ch.send(HELLO);
    detach1();
    ch.send(PING);
    expect(r1.sent).toEqual([HELLO]);
    expect(r2.sent).toEqual([HELLO, PING]);
  });

  it('detach also stops routing of that remote\'s inbound messages', () => {
    const ch = createSyncChannel()!;
    const remote = createStubRemote();
    const received: SyncMessage[] = [];
    ch.onMessage((m) => received.push(m));
    const detach = ch.attachRemote(remote);
    remote.emit(PING);
    detach();
    remote.emit(HELLO);
    expect(received).toEqual([PING]);
  });

  it('attaching the same remote twice is idempotent (no duplicate sends)', () => {
    const ch = createSyncChannel()!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.attachRemote(remote);
    ch.send(HELLO);
    expect(remote.sent).toEqual([HELLO]);
  });

  it('close() detaches every remote (future sends bypass it)', () => {
    const ch = createSyncChannel()!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.close();
    // After close, the remote should be detached — even if a later
    // send somehow goes through, the remote doesn't receive it.
    // (Whether post-close send throws is BC-implementation-defined
    // and not our contract.)
    try { ch.send(PING); } catch { /* closed BC may throw */ }
    expect(remote.sent).toEqual([]);
  });

  it('send failures in a remote do not block sends to other remotes', () => {
    const ch = createSyncChannel()!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const bad: AttachableRemote = {
      send() { throw new Error('peer unreachable'); },
      onMessage() { return () => {}; },
    };
    const good = createStubRemote();
    ch.attachRemote(bad);
    ch.attachRemote(good);
    ch.send(HELLO);
    expect(good.sent).toEqual([HELLO]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
