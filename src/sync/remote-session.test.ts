import { describe, it, expect, vi } from 'vitest';
import { createRemoteSession } from './remote-session.js';
import type { PeerState, RemotePeer } from './remote-peer.js';
import type { SyncEnvelope } from './messages.js';

/**
 * Stub `RemotePeer` implementation. Tracks `close()` calls + lets
 * tests drive state transitions to verify the session mirrors them.
 */
function createStubPeer(role: 'host' | 'guest' = 'host'): RemotePeer & {
  setState: (s: PeerState) => void;
  closeCount: number;
} {
  let state: PeerState = 'new';
  let closeCount = 0;
  const stateListeners = new Set<(s: PeerState) => void>();
  const stub: RemotePeer & { setState: (s: PeerState) => void; closeCount: number } = {
    role,
    getState: () => state,
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    onMessage() { return () => {}; },
    send(_env: SyncEnvelope) { /* noop */ },
    close() {
      closeCount++;
      state = 'closed';
      for (const l of stateListeners) l(state);
    },
    setState(next: PeerState) {
      if (state === next) return;
      state = next;
      for (const l of stateListeners) l(state);
    },
    get closeCount() { return closeCount; },
  };
  return stub;
}

describe('createRemoteSession', () => {
  it('starts idle with no active peer', () => {
    const s = createRemoteSession();
    expect(s.getActivePeer()).toBeNull();
    expect(s.getState()).toBe('idle');
  });

  it('attachPeer sets the peer + notifies subscribers', () => {
    const s = createRemoteSession();
    const fired = vi.fn();
    s.subscribe(fired);
    const peer = createStubPeer();
    s.attachPeer(peer);
    expect(s.getActivePeer()).toBe(peer);
    expect(fired).toHaveBeenCalledTimes(1);
    expect(fired).toHaveBeenCalledWith({ peer, state: 'new' });
  });

  it('mirrors peer state transitions out to session subscribers', () => {
    const s = createRemoteSession();
    const peer = createStubPeer();
    s.attachPeer(peer);
    const states: Array<PeerState | 'idle'> = [];
    s.subscribe((e) => states.push(e.state));
    peer.setState('connecting');
    peer.setState('connected');
    peer.setState('disconnected');
    expect(states).toEqual(['connecting', 'connected', 'disconnected']);
  });

  it('attachPeer(new) closes + replaces the previous peer', () => {
    const s = createRemoteSession();
    const first = createStubPeer();
    const second = createStubPeer();
    s.attachPeer(first);
    s.attachPeer(second);
    expect(first.closeCount).toBe(1);
    expect(s.getActivePeer()).toBe(second);
  });

  it('disconnect() closes the peer + returns to idle', () => {
    const s = createRemoteSession();
    const peer = createStubPeer();
    s.attachPeer(peer);
    s.disconnect();
    expect(peer.closeCount).toBe(1);
    expect(s.getActivePeer()).toBeNull();
    expect(s.getState()).toBe('idle');
  });

  it('disconnect() with no peer is a no-op', () => {
    const s = createRemoteSession();
    const fired = vi.fn();
    s.subscribe(fired);
    s.disconnect();
    expect(fired).not.toHaveBeenCalled();
  });

  it('the detach fn returned by attachPeer triggers disconnect when called', () => {
    const s = createRemoteSession();
    const peer = createStubPeer();
    const detach = s.attachPeer(peer);
    detach();
    expect(peer.closeCount).toBe(1);
    expect(s.getActivePeer()).toBeNull();
  });

  it('the detach fn is a no-op if a different peer is now active', () => {
    const s = createRemoteSession();
    const first = createStubPeer();
    const second = createStubPeer();
    const detach = s.attachPeer(first);
    s.attachPeer(second);
    // `first` was already closed by the replace. Calling detach
    // shouldn't disconnect `second`.
    detach();
    expect(s.getActivePeer()).toBe(second);
    expect(second.closeCount).toBe(0);
  });

  it('subscribe returns an unsubscribe fn', () => {
    const s = createRemoteSession();
    const fired = vi.fn();
    const unsub = s.subscribe(fired);
    const peer = createStubPeer();
    s.attachPeer(peer);
    expect(fired).toHaveBeenCalledTimes(1);
    unsub();
    peer.setState('connected');
    // After unsubscribe, no more notifications.
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('after the peer enters `closed`, the session stays on the peer until disconnect()', () => {
    // Closed-but-not-detached lets the UI show "Disconnected (click
    // to reconnect)" with the peer ref still accessible. Only an
    // explicit `disconnect()` or `attachPeer(new)` actually removes
    // the peer from the session.
    const s = createRemoteSession();
    const peer = createStubPeer();
    s.attachPeer(peer);
    peer.close();
    expect(s.getState()).toBe('closed');
    expect(s.getActivePeer()).toBe(peer);
  });
});
