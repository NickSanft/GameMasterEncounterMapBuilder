import type { SyncMessage } from './messages.js';
import { BROADCAST_CHANNEL_NAME as CHANNEL_NAME } from '../util/constants.js';

export { CHANNEL_NAME };

export interface SyncChannel {
  send(msg: SyncMessage): void;
  onMessage(fn: (msg: SyncMessage) => void): () => void;
  close(): void;
}

export function createSyncChannel(): SyncChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  const listeners = new Set<(msg: SyncMessage) => void>();

  bc.onmessage = (ev: MessageEvent<SyncMessage>) => {
    for (const l of listeners) l(ev.data);
  };

  return {
    send(msg) {
      bc.postMessage(msg);
    },
    onMessage(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      bc.close();
      listeners.clear();
    },
  };
}
