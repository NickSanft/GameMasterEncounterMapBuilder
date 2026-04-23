import type { SyncMessage } from './messages.js';
import { BROADCAST_CHANNEL_NAME as CHANNEL_NAME } from '../util/constants.js';

export { CHANNEL_NAME };

/**
 * Minimum interface that a remote transport (e.g. a WebRTC peer)
 * must satisfy to plug into `SyncChannel.attachRemote`. Matches the
 * public surface of the `RemotePeer` type in `remote-peer.ts`, but
 * narrower so tests can attach stubs.
 *
 * Why no dedicated `RemotePeer` dependency here: keeps `channel.ts`
 * free of WebRTC-specific imports for environments that don't have
 * a peer connection API (tests, headless build tooling).
 */
export interface AttachableRemote {
  send(msg: SyncMessage): void;
  onMessage(fn: (msg: SyncMessage) => void): () => void;
}

export interface SyncChannel {
  send(msg: SyncMessage): void;
  onMessage(fn: (msg: SyncMessage) => void): () => void;
  /**
   * Phase 62 — attach a remote transport (WebRTC peer, etc.) so that
   * outbound `send()` calls fan out to BroadcastChannel PLUS every
   * attached remote, and the remote's inbound messages get routed to
   * the channel's `onMessage` listeners just like local BC messages.
   *
   * No loop worry even though both directions are wired: BroadcastChannel
   * doesn't echo to the sending tab, and we operate a STAR topology
   * (GM is always the hub — Spectators connect to the GM, Spectators
   * don't re-broadcast to each other), so a message never comes back
   * to its origin via a different transport.
   *
   * Returns a detach function — use when the peer disconnects.
   */
  attachRemote(remote: AttachableRemote): () => void;
  close(): void;
}

export function createSyncChannel(): SyncChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  const listeners = new Set<(msg: SyncMessage) => void>();
  const attachedRemotes = new Set<AttachableRemote>();
  const remoteUnsubscribes = new Map<AttachableRemote, () => void>();

  bc.onmessage = (ev: MessageEvent<SyncMessage>) => {
    for (const l of listeners) l(ev.data);
  };

  return {
    send(msg) {
      bc.postMessage(msg);
      for (const r of attachedRemotes) {
        try {
          r.send(msg);
        } catch (err) {
          console.warn('[sync-channel] remote send failed', err);
        }
      }
    },
    onMessage(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    attachRemote(remote) {
      if (attachedRemotes.has(remote)) {
        return remoteUnsubscribes.get(remote) ?? (() => {});
      }
      attachedRemotes.add(remote);
      const off = remote.onMessage((msg) => {
        for (const l of listeners) l(msg);
      });
      const detach = () => {
        off();
        attachedRemotes.delete(remote);
        remoteUnsubscribes.delete(remote);
      };
      remoteUnsubscribes.set(remote, detach);
      return detach;
    },
    close() {
      bc.close();
      for (const off of remoteUnsubscribes.values()) off();
      remoteUnsubscribes.clear();
      attachedRemotes.clear();
      listeners.clear();
    },
  };
}
