/**
 * Phase 83 — round-trip-time (RTT) tracker for the remote-play status chip.
 *
 * Pure logic: the tracker holds the last N RTT samples (in ms) and
 * exposes a smoothed median for UI display. Sample arrival is driven
 * by the entry — the entry sends `latency-probe` SyncMessages every
 * `PROBE_INTERVAL_MS`, the peer replies with `latency-probe-reply`
 * carrying the same probe id, and the entry calls `note(rtt)` with
 * the elapsed time.
 *
 * Median (not mean): a single packet-loss-induced 2 s outlier
 * shouldn't push the displayed value to 500 ms. Median over the last
 * 5 samples shrugs off one or two bad samples cleanly.
 *
 * `null` when no samples have arrived (display: just "Connected"
 * with no RTT suffix). A returned 0 is unlikely but valid (loopback /
 * very fast LAN).
 */

const SAMPLE_CAP = 5;

export interface LatencyTracker {
  /** Record a fresh RTT sample (in ms). */
  note(rtt: number): void;
  /** Median of the last N samples, or null when none have arrived yet. */
  median(): number | null;
  /** Drop all samples — call on disconnect so a reconnect starts fresh. */
  reset(): void;
  /** Subscribe; listener fires after every `note` or `reset`. */
  subscribe(listener: () => void): () => void;
  /** Test hook — current sample buffer. */
  _samples(): readonly number[];
}

export function createLatencyTracker(): LatencyTracker {
  let samples: number[] = [];
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  return {
    note(rtt) {
      if (!Number.isFinite(rtt) || rtt < 0) return;
      samples.push(rtt);
      if (samples.length > SAMPLE_CAP) {
        samples = samples.slice(samples.length - SAMPLE_CAP);
      }
      notify();
    },
    median() {
      if (samples.length === 0) return null;
      const sorted = [...samples].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
      }
      return Math.round(sorted[mid]!);
    },
    reset() {
      if (samples.length === 0) return;
      samples = [];
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _samples: () => samples.slice(),
  };
}

/** Inter-probe interval in ms. ~5s feels responsive without spamming the wire. */
export const PROBE_INTERVAL_MS = 5000;

/**
 * Color band for a given RTT — used by the status chip to paint the
 * latency suffix in green / amber / red. Boundaries pulled from
 * common gaming-net norms (sub-100ms feels instant, 100-300ms is
 * "you can tell," > 300ms is laggy).
 */
export type LatencyBand = 'good' | 'ok' | 'poor';

export function bandFor(rtt: number): LatencyBand {
  if (rtt < 100) return 'good';
  if (rtt < 300) return 'ok';
  return 'poor';
}
