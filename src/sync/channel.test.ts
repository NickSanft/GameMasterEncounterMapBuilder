import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSyncChannel, type AttachableRemote } from './channel.js';
import type { SyncEnvelope, SyncMessage } from './messages.js';

// Phase 66 — channel construction now needs a sender id (used to
// stamp every outbound envelope + drop self-echoes from forwarded
// remote traffic). Tests use stable per-channel ids; "self" vs
// "other" matters for the dedup tests below.
const SELF = 'self-tab';
const OTHER = 'other-tab';

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
 * so a test can simulate an inbound message from the peer. Phase 66
 * shifted the wire format to envelopes — both `sent` + `emit` work
 * in envelopes now.
 */
function createStubRemote(): AttachableRemote & {
  sent: SyncEnvelope[];
  emit(env: SyncEnvelope): void;
} {
  const sent: SyncEnvelope[] = [];
  const listeners = new Set<(env: SyncEnvelope) => void>();
  return {
    send(env) {
      sent.push(env);
    },
    onMessage(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    sent,
    emit(env) {
      for (const l of listeners) l(env);
    },
  };
}

function envelope(senderId: string, payload: SyncMessage): SyncEnvelope {
  return { senderId, timestamp: 1, payload };
}

const HELLO: SyncMessage = { type: 'hello', from: 'gm' };
const PING: SyncMessage = { type: 'ping', x: 1, y: 2 };

describe('createSyncChannel', () => {
  it('returns null when BroadcastChannel is unavailable', () => {
    const orig = (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
    delete (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
    expect(createSyncChannel(SELF)).toBeNull();
    (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = orig;
  });

  it('same-origin sends get delivered to other BC listeners (not self)', () => {
    const a = createSyncChannel(SELF)!;
    const b = createSyncChannel(OTHER)!;
    const aReceived: SyncMessage[] = [];
    const bReceived: SyncMessage[] = [];
    a.onMessage((m) => aReceived.push(m));
    b.onMessage((m) => bReceived.push(m));
    a.send(HELLO);
    expect(aReceived).toEqual([]);
    expect(bReceived).toEqual([HELLO]);
  });

  it('Phase 66 — onMessage receives the full envelope as a 2nd arg', () => {
    const a = createSyncChannel(SELF)!;
    const b = createSyncChannel(OTHER)!;
    const envelopes: SyncEnvelope[] = [];
    b.onMessage((_msg, env) => envelopes.push(env));
    a.send(HELLO);
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]?.senderId).toBe(SELF);
    expect(envelopes[0]?.payload).toEqual(HELLO);
    expect(typeof envelopes[0]?.timestamp).toBe('number');
  });

  it('Phase 66 — drops malformed wire data (no envelope shape)', () => {
    const a = createSyncChannel(SELF)!;
    const b = createSyncChannel(OTHER)!;
    const received: SyncMessage[] = [];
    b.onMessage((m) => received.push(m));
    // Bypass the typed `send` and post a raw non-envelope payload
    // to mimic a future-version peer or corrupted message.
    const aBc = (a as unknown as { send: unknown });
    void aBc;
    const bcInstance = MockBroadcastChannel.registry
      .get('gm-encounter-maps-sync')
      ?.values()
      .next().value;
    bcInstance?.postMessage({ legacy: true } as unknown);
    expect(received).toEqual([]);
  });
});

describe('SyncChannel.attachRemote', () => {
  it('fans outgoing sends to the attached remote (wrapped in envelopes)', () => {
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.send(HELLO);
    ch.send(PING);
    expect(remote.sent).toHaveLength(2);
    expect(remote.sent[0]?.payload).toEqual(HELLO);
    expect(remote.sent[1]?.payload).toEqual(PING);
    expect(remote.sent[0]?.senderId).toBe(SELF);
  });

  it('routes incoming remote messages to the channel\'s onMessage listeners', () => {
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    const received: SyncMessage[] = [];
    ch.onMessage((m) => received.push(m));
    ch.attachRemote(remote);
    remote.emit(envelope(OTHER, PING));
    expect(received).toEqual([PING]);
  });

  it('Phase 66 — drops self-echoes (envelope.senderId === own id)', () => {
    // Defense against WebRTC peer forwarding our own message back.
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    const received: SyncMessage[] = [];
    ch.onMessage((m) => received.push(m));
    ch.attachRemote(remote);
    remote.emit(envelope(SELF, HELLO));
    expect(received).toEqual([]);
    // Same payload from a different sender goes through normally.
    remote.emit(envelope(OTHER, HELLO));
    expect(received).toEqual([HELLO]);
  });

  it('fans to multiple remotes independently', () => {
    const ch = createSyncChannel(SELF)!;
    const r1 = createStubRemote();
    const r2 = createStubRemote();
    ch.attachRemote(r1);
    ch.attachRemote(r2);
    ch.send(HELLO);
    expect(r1.sent[0]?.payload).toEqual(HELLO);
    expect(r2.sent[0]?.payload).toEqual(HELLO);
  });

  it('detach stops fan-out for that remote only', () => {
    const ch = createSyncChannel(SELF)!;
    const r1 = createStubRemote();
    const r2 = createStubRemote();
    const detach1 = ch.attachRemote(r1);
    ch.attachRemote(r2);
    ch.send(HELLO);
    detach1();
    ch.send(PING);
    expect(r1.sent).toHaveLength(1);
    expect(r1.sent[0]?.payload).toEqual(HELLO);
    expect(r2.sent.map((e) => e.payload)).toEqual([HELLO, PING]);
  });

  it('detach also stops routing of that remote\'s inbound messages', () => {
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    const received: SyncMessage[] = [];
    ch.onMessage((m) => received.push(m));
    const detach = ch.attachRemote(remote);
    remote.emit(envelope(OTHER, PING));
    detach();
    remote.emit(envelope(OTHER, HELLO));
    expect(received).toEqual([PING]);
  });

  it('attaching the same remote twice is idempotent (no duplicate sends)', () => {
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.attachRemote(remote);
    ch.send(HELLO);
    expect(remote.sent).toHaveLength(1);
  });

  it('close() detaches every remote (future sends bypass it)', () => {
    const ch = createSyncChannel(SELF)!;
    const remote = createStubRemote();
    ch.attachRemote(remote);
    ch.close();
    try { ch.send(PING); } catch { /* closed BC may throw */ }
    expect(remote.sent).toEqual([]);
  });

  it('send failures in a remote do not block sends to other remotes', () => {
    const ch = createSyncChannel(SELF)!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const bad: AttachableRemote = {
      send() { throw new Error('peer unreachable'); },
      onMessage() { return () => {}; },
    };
    const good = createStubRemote();
    ch.attachRemote(bad);
    ch.attachRemote(good);
    ch.send(HELLO);
    expect(good.sent[0]?.payload).toEqual(HELLO);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
