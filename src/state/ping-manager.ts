import { nid } from '../util/id.js';

export interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  startedAt: number;
  /**
   * Phase 146 — display name of the player who emitted the ping.
   * Optional — local pings or pings from peers without identity
   * registry entries fall back to no label. The renderer draws a
   * pill above the ping when this is non-empty.
   */
  senderName?: string;
}

export const PING_DURATION_MS = 1500;
export const DEFAULT_PING_COLOR = '#ff9f43';

export interface PingManager {
  add(x: number, y: number, color?: string, senderName?: string): void;
  getActive(): readonly Ping[];
}

export function createPingManager(onTick: () => void): PingManager {
  let pings: Ping[] = [];
  let ticking = false;

  function startTickerIfNeeded() {
    if (ticking) return;
    ticking = true;
    const step = () => {
      const now = performance.now();
      const next: Ping[] = [];
      for (const p of pings) {
        if (now - p.startedAt < PING_DURATION_MS) next.push(p);
      }
      pings = next;
      onTick();
      if (pings.length === 0) {
        ticking = false;
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return {
    add(
      x: number,
      y: number,
      color: string = DEFAULT_PING_COLOR,
      senderName?: string,
    ) {
      const entry: Ping = { id: nid(), x, y, color, startedAt: performance.now() };
      if (senderName !== undefined && senderName.length > 0) {
        entry.senderName = senderName;
      }
      pings.push(entry);
      startTickerIfNeeded();
    },
    getActive() {
      return pings;
    },
  };
}
