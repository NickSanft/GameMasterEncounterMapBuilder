import { nid } from '../util/id.js';

export interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  startedAt: number;
}

export const PING_DURATION_MS = 1500;
export const DEFAULT_PING_COLOR = '#ff9f43';

export interface PingManager {
  add(x: number, y: number, color?: string): void;
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
    add(x: number, y: number, color: string = DEFAULT_PING_COLOR) {
      pings.push({ id: nid(), x, y, color, startedAt: performance.now() });
      startTickerIfNeeded();
    },
    getActive() {
      return pings;
    },
  };
}
