/**
 * Central aria-live announcer. Produces two visually-hidden live regions —
 * one `polite` (default), one `assertive` — so the app can narrate events
 * to screen-reader users without shoving focus around.
 *
 * Usage:
 *   const announcer = createAnnouncer();
 *   announcer.announce('Switched to Select tool');
 *   announcer.announce('Another GM tab detected', 'assertive');
 *
 * Phase 90 — polite announcements are rate-limited to one per
 * `MIN_INTERVAL_MS` (default 600 ms) so combat-heavy bursts don't
 * drown out screen-reader users. Within a single interval, only the
 * LATEST polite announcement is queued — the user hears the most
 * recent state instead of a backlog of stale ones (e.g. tabbing
 * through 5 tokens in 200 ms announces only the final selection).
 *
 * Repeat suppression: identical polite messages within
 * `REPEAT_SUPPRESS_MS` (default 1500 ms) are dropped, so the
 * Phase 84 conflict-banner heartbeat ("Warning: another GM tab is
 * open") doesn't re-announce on every 2 s tick.
 *
 * Assertive announcements bypass the queue + the repeat filter —
 * those are "you NEED to hear this right now" (errors, conflicts,
 * permission revocations, etc.).
 *
 * The same text in a row would be merged by some screen readers
 * (because the DOM mutation is a no-op); we guard that by appending
 * a zero-width space toggle so repeats are honoured at the DOM level.
 */
export type AnnouncerPriority = 'polite' | 'assertive';

export interface AnnouncerOptions {
  /**
   * Minimum gap between polite announcements, in milliseconds.
   * Defaults to 600 ms — about how long it takes a screen reader to
   * read a short phrase. Lower values let more announcements through
   * but risk overwhelming the user; higher values mean faster events
   * get queued behind the rate-limit.
   */
  minIntervalMs?: number;
  /**
   * Window during which an identical polite message is suppressed.
   * Defaults to 1500 ms. Set to 0 to disable repeat-suppression
   * entirely (every distinct call announces).
   */
  repeatSuppressMs?: number;
  /**
   * Test seam — defaults to `Date.now()`. Tests pass a fake clock so
   * the queue + suppress-window can be exercised without real time.
   */
  now?(): number;
  /**
   * Test seam — defaults to `setTimeout` / `clearTimeout`. Tests
   * substitute a fake timer queue so they can advance synthetic time.
   */
  setTimer?(fn: () => void, delay: number): unknown;
  clearTimer?(handle: unknown): void;
}

export interface AnnouncerHandle {
  /** Queue a new announcement. Polite calls coalesce; assertive bypasses. */
  announce(message: string, priority?: AnnouncerPriority): void;
  /** Force-flush the polite queue immediately. Test helper. */
  flush(): void;
  /** Unmount the regions from the DOM. Mostly for tests. */
  destroy(): void;
  /** Read the current text of a region (test helper). */
  readCurrent(priority?: AnnouncerPriority): string;
}

const DEFAULT_MIN_INTERVAL_MS = 600;
const DEFAULT_REPEAT_SUPPRESS_MS = 1500;

export function createAnnouncer(
  parent: HTMLElement = document.body,
  opts: AnnouncerOptions = {},
): AnnouncerHandle {
  const polite = makeRegion('polite');
  const assertive = makeRegion('assertive');
  parent.appendChild(polite);
  parent.appendChild(assertive);

  const minIntervalMs = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const repeatSuppressMs = opts.repeatSuppressMs ?? DEFAULT_REPEAT_SUPPRESS_MS;
  const now = opts.now ?? (() => Date.now());
  const setTimer =
    opts.setTimer ?? ((fn, delay) => window.setTimeout(fn, delay));
  const clearTimer =
    opts.clearTimer ??
    ((handle) => {
      if (handle !== null && handle !== undefined) {
        window.clearTimeout(handle as number);
      }
    });

  // Toggle flag — flips on every write so the DOM mutation is always
  // visible to screen readers even when the text doesn't change.
  let toggle = false;

  // Polite-queue state.
  let pending: string | null = null;
  let pendingTimer: unknown = null;
  let lastFlushAt = -Infinity;
  let lastPoliteText: string | null = null;
  let lastPoliteAt = -Infinity;

  function writeRegion(region: HTMLElement, message: string): void {
    toggle = !toggle;
    region.textContent = toggle ? `${message}\u00A0` : message;
  }

  function flushPolite(): void {
    if (pendingTimer !== null) {
      clearTimer(pendingTimer);
      pendingTimer = null;
    }
    if (pending !== null) {
      writeRegion(polite, pending);
      lastFlushAt = now();
      lastPoliteText = pending;
      lastPoliteAt = lastFlushAt;
      pending = null;
    }
  }

  function schedulePoliteFlush(): void {
    if (pendingTimer !== null) return;
    const elapsed = now() - lastFlushAt;
    const wait = Math.max(0, minIntervalMs - elapsed);
    pendingTimer = setTimer(() => {
      pendingTimer = null;
      if (pending !== null) {
        writeRegion(polite, pending);
        lastFlushAt = now();
        lastPoliteText = pending;
        lastPoliteAt = lastFlushAt;
        pending = null;
      }
    }, wait);
  }

  function announce(
    message: string,
    priority: AnnouncerPriority = 'polite',
  ): void {
    if (priority === 'assertive') {
      // Cancel any pending polite write — the assertive message takes
      // over the user's attention; queueing the polite one behind it
      // would be noisy.
      if (pendingTimer !== null) {
        clearTimer(pendingTimer);
        pendingTimer = null;
        pending = null;
      }
      writeRegion(assertive, message);
      return;
    }

    // Repeat suppression — drop identical messages inside the window.
    // Compares against either the last actually-announced text OR the
    // currently-pending text so a flurry of "X / X / X" calls collapses
    // into a single announcement regardless of whether any have
    // flushed yet.
    const tooSoonRepeat =
      repeatSuppressMs > 0 &&
      lastPoliteText === message &&
      now() - lastPoliteAt < repeatSuppressMs;
    const pendingRepeat = pending === message;
    if (tooSoonRepeat || pendingRepeat) return;

    // New message overwrites any pending one — last-write-wins inside
    // the rate-limit window so the user hears the freshest state.
    pending = message;
    schedulePoliteFlush();
  }

  function destroy(): void {
    if (pendingTimer !== null) {
      clearTimer(pendingTimer);
      pendingTimer = null;
    }
    polite.remove();
    assertive.remove();
  }

  function readCurrent(priority: AnnouncerPriority = 'polite'): string {
    const region = priority === 'assertive' ? assertive : polite;
    // Strip the trailing NBSP used for repeat-forcing.
    return (region.textContent ?? '').replace(/\u00A0$/, '');
  }

  return { announce, flush: flushPolite, destroy, readCurrent };
}

function makeRegion(priority: AnnouncerPriority): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.dataset.announcer = priority;
  return el;
}
