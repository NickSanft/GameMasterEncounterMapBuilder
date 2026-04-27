/**
 * Phase 121 — auto-generated scene thumbnails.
 *
 * Pre-121, a scene only got a thumbnail when the GM explicitly
 * SWITCHED away from it (the outgoing-save path in `switchToScene`).
 * That meant a freshly-created scene + first session of edits showed
 * the placeholder "(no thumbnail)" tile in the Scenes modal until you
 * left the scene at least once. Phase 121 closes that gap by tying a
 * thumbnail capture into the regular auto-save loop.
 *
 * To avoid spamming the IDB with thumbnail rewrites on every keystroke
 * — auto-save fires ~200ms after every state change — this module
 * exposes a throttle gate keyed by scene id: `shouldCapture(sceneId)`
 * returns `true` at most once per `minIntervalMs`. The very first
 * call for a given id always returns `true`, so a new scene gets a
 * fresh thumbnail on the first save.
 *
 * Pure module with a clock seam (`now?`) for tests. The helper holds
 * its state in-process; reload re-mints it (acceptable — the worst
 * case is one extra capture right after reload).
 */

export interface SceneThumbnailThrottleOptions {
  /**
   * Min time between captures FOR THE SAME SCENE id. Defaults to
   * 10 s (10000 ms) — captures are cheap (a small offscreen canvas
   * draw + a JPEG re-encode at ~240 px wide) but writing to IDB
   * repeatedly during a high-edit burst is wasteful.
   */
  minIntervalMs?: number;
  /** Test seam — defaults to `Date.now()`. */
  now?(): number;
}

export interface SceneThumbnailThrottle {
  /**
   * Should the caller capture + persist a thumbnail for `sceneId`
   * RIGHT NOW? Returns `true` the first time it sees a given id and
   * thereafter at most once per `minIntervalMs`. Calling this method
   * counts as a capture for throttle purposes — i.e. consecutive
   * calls 1ms apart with the same id return `true` then `false`.
   */
  shouldCapture(sceneId: string): boolean;
  /**
   * Forget every per-scene last-capture record. Useful when the
   * scenes catalog is wholesale-replaced (e.g. import flow). After
   * a reset, the next call to `shouldCapture(id)` always returns true.
   */
  reset(): void;
  /**
   * Forget the last-capture record for a single scene id. Called when
   * a scene is deleted so a future scene with the recycled id (rare
   * but possible) doesn't inherit a stale "wait 9s" gate.
   */
  forget(sceneId: string): void;
}

const DEFAULT_MIN_INTERVAL_MS = 10_000;

export function createSceneThumbnailThrottle(
  opts: SceneThumbnailThrottleOptions = {},
): SceneThumbnailThrottle {
  const minIntervalMs = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const now = opts.now ?? (() => Date.now());
  const lastCapture = new Map<string, number>();

  return {
    shouldCapture(sceneId: string): boolean {
      if (!sceneId) return false;
      const t = now();
      const prev = lastCapture.get(sceneId);
      if (prev === undefined || t - prev >= minIntervalMs) {
        lastCapture.set(sceneId, t);
        return true;
      }
      return false;
    },
    reset() {
      lastCapture.clear();
    },
    forget(sceneId: string) {
      lastCapture.delete(sceneId);
    },
  };
}
