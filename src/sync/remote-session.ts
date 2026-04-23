/**
 * Remote Play session state (Phase 64).
 *
 * Phase 62 kept the active `RemotePeer` as a local variable inside
 * the `mountRemotePlayModal` closure — fine for the single-flow
 * modal-centric UX, but it meant no other UI could observe whether
 * a connection was live. Phase 64 needs a persistent
 * connection-status chip outside the modal + a reconnection flow
 * that survives closing the modal, so we extract the peer
 * ownership into this small session object. The modal reads / writes
 * it; the status chip reads it; the entries wire the session into
 * `channel.attachRemote` + subscribe to its state transitions.
 *
 * Design:
 *   - **Single active peer at a time.** The MVP doesn't support
 *     multiple simultaneous remote connections (no mesh — star
 *     topology only, and only one peer per tab). Swapping peers
 *     closes the previous one cleanly.
 *   - **Passive observer.** The session doesn't create peers; it
 *     just tracks whichever peer the modal instantiated. That
 *     keeps the signaling logic in one place (the modal) instead
 *     of split across two modules.
 *   - **Survives modal close.** Closing the modal just hides its
 *     DOM — it doesn't touch the session. Connections persist.
 *     `disconnect()` is the only way to tear down, exposed both
 *     from the modal and from a status-chip "Disconnect" button.
 */

import type { RemotePeer, PeerState } from './remote-peer.js';

export interface RemoteSession {
  /** Current active peer, or `null` when idle. */
  getActivePeer(): RemotePeer | null;
  /**
   * High-level state of the session (the peer's state if any peer
   * is attached, otherwise `'idle'`). `'idle'` is the rest state
   * before a peer has been created + after `disconnect()`.
   */
  getState(): PeerState | 'idle';
  /**
   * Attach a newly-created peer. Closes + replaces any previously
   * attached peer. Returns a detach fn that calls `disconnect()`
   * if called — same semantics as the equivalent on `SyncChannel`.
   */
  attachPeer(peer: RemotePeer): () => void;
  /** Tear down the active peer (if any) and return to `'idle'`. */
  disconnect(): void;
  /**
   * Subscribe to peer changes: fires on attach, detach, and every
   * peer-state transition. The listener always gets the CURRENT
   * peer + its state (not just the transition).
   */
  subscribe(
    listener: (event: { peer: RemotePeer | null; state: PeerState | 'idle' }) => void,
  ): () => void;
}

export function createRemoteSession(): RemoteSession {
  let peer: RemotePeer | null = null;
  let peerStateUnsubscribe: (() => void) | null = null;
  const listeners = new Set<
    (event: { peer: RemotePeer | null; state: PeerState | 'idle' }) => void
  >();

  function currentState(): PeerState | 'idle' {
    return peer ? peer.getState() : 'idle';
  }

  function notify(): void {
    const snap = { peer, state: currentState() };
    for (const l of listeners) l(snap);
  }

  function detachInternal(): void {
    if (peerStateUnsubscribe) {
      peerStateUnsubscribe();
      peerStateUnsubscribe = null;
    }
    peer = null;
  }

  function attachPeer(next: RemotePeer): () => void {
    // Replace the current peer cleanly.
    if (peer && peer !== next) {
      peer.close();
      detachInternal();
    }
    peer = next;
    // Mirror the peer's state transitions out to session subscribers
    // so the status chip updates without each observer having to
    // subscribe to the peer directly.
    peerStateUnsubscribe = next.onStateChange(() => notify());
    notify();
    return () => {
      if (peer === next) disconnect();
    };
  }

  function disconnect(): void {
    const current = peer;
    if (!current) return;
    detachInternal();
    current.close();
    notify();
  }

  return {
    getActivePeer: () => peer,
    getState: currentState,
    attachPeer,
    disconnect,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
