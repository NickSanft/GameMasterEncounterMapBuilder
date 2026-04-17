import type { SyncMessage } from './messages.js';

export const CHANNEL_NAME = 'dnd-maps-session';

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
