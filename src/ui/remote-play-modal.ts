/**
 * Lazy stub for the Remote Play modal (Phase 65).
 *
 * The full implementation lives in `./remote-play-modal-content.ts`
 * — about 2.8 KB brotli. Most users never open Remote Play (or
 * open it once per session at most), so we defer the load to the
 * first `.open()` call, same pattern as help-overlay + settings.
 *
 * The exposed `RemotePlayModalHandle` keeps its sync `open()` /
 * `close()` / `isOpen()` shape; callers don't change.
 */

import type { SyncChannel } from '../sync/channel.js';
import type { RemoteSession } from '../sync/remote-session.js';

export interface RemotePlayModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export interface RemotePlayModalOptions {
  channel: SyncChannel;
  /** Friendly label used in UI copy (`GM view` / `Spectator view`). */
  viewLabel: 'GM' | 'Spectator';
  /**
   * Phase 64 — shared session state. The modal attaches created
   * peers here so external observers (the connection-status chip +
   * the entry's full-state-rebroadcast logic) can react.
   */
  session?: RemoteSession;
}

export function mountRemotePlayModal(
  opts: RemotePlayModalOptions,
): RemotePlayModalHandle {
  type RealHandle = import('./remote-play-modal-content.js').RemotePlayModalHandle;
  let real: RealHandle | null = null;
  let loadPromise: Promise<RealHandle> | null = null;

  function load(): Promise<RealHandle> {
    if (real) return Promise.resolve(real);
    if (!loadPromise) {
      loadPromise = import('./remote-play-modal-content.js').then((mod) => {
        real = mod.buildRemotePlayModal(opts);
        return real;
      });
    }
    return loadPromise;
  }

  return {
    open() {
      void load().then((handle) => handle.open());
    },
    close() {
      real?.close();
    },
    isOpen() {
      return real?.isOpen() ?? false;
    },
  };
}
