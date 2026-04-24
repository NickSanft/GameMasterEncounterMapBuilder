import type { SyncEnvelope, SyncMessage } from './messages.js';
import { BROADCAST_CHANNEL_NAME as CHANNEL_NAME } from '../util/constants.js';

export { CHANNEL_NAME };

/**
 * Minimum interface that a remote transport (e.g. a WebRTC peer)
 * must satisfy to plug into `SyncChannel.attachRemote`. Matches the
 * public surface of the `RemotePeer` type in `remote-peer.ts`, but
 * narrower so tests can attach stubs.
 *
 * Phase 66 — every message on the wire is an `SyncEnvelope`
 * (`{senderId, timestamp, payload}`). Remote transports forward the
 * envelope verbatim; only the channel layer wraps + unwraps.
 */
export interface AttachableRemote {
  send(env: SyncEnvelope): void;
  onMessage(fn: (env: SyncEnvelope) => void): () => void;
}

export interface SyncChannel {
  send(msg: SyncMessage): void;
  /**
   * Phase 66 — listeners receive both the unwrapped `payload` AND
   * the full envelope. Most existing callsites only care about
   * `msg`; the second arg is there for future features that need
   * attribution (per-Spectator permissions, latency, conflict UI).
   */
  onMessage(fn: (msg: SyncMessage, env: SyncEnvelope) => void): () => void;
  /**
   * Phase 62 — attach a remote transport (WebRTC peer, etc.) so that
   * outbound `send()` calls fan out to BroadcastChannel PLUS every
   * attached remote, and the remote's inbound messages get routed to
   * the channel's `onMessage` listeners just like local BC messages.
   *
   * Self-echo guard (Phase 66): inbound envelopes whose
   * `senderId` matches our own are silently dropped. BC doesn't
   * echo on its own; the guard exists so a WebRTC peer forwarding
   * our message back over the star topology can't deliver it twice.
   *
   * Returns a detach function — use when the peer disconnects.
   */
  attachRemote(remote: AttachableRemote): () => void;
  close(): void;
}

/**
 * Construct a sync channel scoped to this tab.
 *
 * @param senderId  This tab's `PlayerIdentity.id` — stamped on every
 *                  outgoing envelope so peers can attribute messages
 *                  to a specific player + so the channel can drop
 *                  self-echoes from forwarded WebRTC traffic.
 */
export function createSyncChannel(senderId: string): SyncChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  const listeners = new Set<(msg: SyncMessage, env: SyncEnvelope) => void>();
  const attachedRemotes = new Set<AttachableRemote>();
  const remoteUnsubscribes = new Map<AttachableRemote, () => void>();

  function deliver(env: SyncEnvelope): void {
    // Self-echo guard — see the JSDoc on `attachRemote`.
    if (env.senderId === senderId) return;
    for (const l of listeners) l(env.payload, env);
  }

  function looksLikeEnvelope(value: unknown): value is SyncEnvelope {
    return (
      !!value &&
      typeof value === 'object' &&
      'senderId' in (value as object) &&
      'payload' in (value as object) &&
      'timestamp' in (value as object)
    );
  }

  bc.onmessage = (ev: MessageEvent<unknown>) => {
    if (!looksLikeEnvelope(ev.data)) return;
    deliver(ev.data);
  };

  return {
    send(msg) {
      const env: SyncEnvelope = {
        senderId,
        timestamp: Date.now(),
        payload: msg,
      };
      bc.postMessage(env);
      for (const r of attachedRemotes) {
        try {
          r.send(env);
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
      const off = remote.onMessage((env) => {
        if (!looksLikeEnvelope(env)) return;
        deliver(env);
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
