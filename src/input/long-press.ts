/**
 * Phase 103 — touch long-press → context menu.
 *
 * On the desktop the GM gets a context menu by right-clicking. On a
 * touch device there's no "right" button — every long-press would
 * historically trigger the OS-level callout (text-select, image
 * actions). We hijack that affordance for our own context menu so
 * tablet GMs can reach the same actions desktop GMs reach via
 * right-click.
 *
 * The detector watches for a single-finger pointerdown of type
 * `touch`. After `LONGPRESS_HOLD_MS` (default 500 ms) of:
 *   - The finger STILL being down,
 *   - It hasn't moved more than `LONGPRESS_MOVE_THRESHOLD_PX`,
 *   - No second finger has landed,
 * the helper fires the `onLongPress` callback with the touch's
 * client x / y. Callers typically dispatch a synthetic `contextmenu`
 * event there to reuse the existing right-click menu wiring.
 *
 * Cancels on:
 *   - `pointerup` / `pointercancel` (finger lifted before hold)
 *   - Movement beyond threshold (the gesture turned into a pan / draw)
 *   - A second pointerdown (gesture upgraded to pinch)
 *
 * Pure module — no DOM-element ownership, no styles. Tests stub the
 * `now()` + `setTimeout()` seams to drive deterministic timing.
 */

export const LONGPRESS_HOLD_MS = 500;
export const LONGPRESS_MOVE_THRESHOLD_PX = 10;

export interface LongPressOptions {
  /** Hold duration in milliseconds (default `LONGPRESS_HOLD_MS`). */
  holdMs?: number;
  /** Move slop in px before the press is treated as a drag (default 10). */
  moveThresholdPx?: number;
  /**
   * Called when the timer expires successfully. The `clientX`/`clientY`
   * are the original touchdown coordinates so the menu opens where the
   * user pressed (not where their finger drifted to).
   */
  onLongPress(x: number, y: number): void;
  /**
   * Optional timer seam — defaults to `window.setTimeout` /
   * `clearTimeout`. Tests pass a fake scheduler so timing assertions
   * don't depend on real timers.
   */
  setTimer?(cb: () => void, ms: number): unknown;
  /** Companion to `setTimer`. */
  clearTimer?(handle: unknown): void;
}

export interface LongPressHandle {
  /** Detach all event listeners. */
  destroy(): void;
}

/**
 * Attach a touch long-press detector to `target`. Returns a handle
 * with `destroy()` to remove the listeners again.
 *
 * The detector listens for `pointerdown` with `pointerType === 'touch'`.
 * Mouse / pen pointers are ignored — those have a real right-click /
 * barrel-button affordance and don't need this.
 */
export function attachLongPress(
  target: HTMLElement,
  opts: LongPressOptions,
): LongPressHandle {
  const holdMs = opts.holdMs ?? LONGPRESS_HOLD_MS;
  const moveThreshold = opts.moveThresholdPx ?? LONGPRESS_MOVE_THRESHOLD_PX;
  const setTimer =
    opts.setTimer ??
    ((cb: () => void, ms: number) => window.setTimeout(cb, ms));
  const clearTimer =
    opts.clearTimer ?? ((handle: unknown) => window.clearTimeout(handle as number));

  /**
   * Track every finger currently on the target so we can cancel
   * when a second one lands. Only the FIRST finger is the candidate
   * for a long-press; once a second comes down, the gesture has
   * upgraded (likely a pinch) and we abandon.
   */
  let trackedPointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let timerHandle: unknown = null;

  function reset() {
    trackedPointerId = null;
    if (timerHandle !== null) {
      clearTimer(timerHandle);
      timerHandle = null;
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (trackedPointerId !== null) {
      // Second (or third…) finger — abandon the candidate. Pinch or
      // multi-touch tools take over from here.
      reset();
      return;
    }
    trackedPointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    timerHandle = setTimer(() => {
      // Race guard: the timer might fire just after a pointerup. We
      // null out trackedPointerId in reset() before firing the
      // callback so a stale timer is a silent no-op.
      if (trackedPointerId === null) return;
      timerHandle = null;
      const px = startX;
      const py = startY;
      // Reset BEFORE firing so the callback can dispatch synthetic
      // events without re-entering the detector mid-call.
      trackedPointerId = null;
      opts.onLongPress(px, py);
    }, holdMs);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (trackedPointerId === null || e.pointerId !== trackedPointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy > moveThreshold * moveThreshold) {
      reset();
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (trackedPointerId === null) return;
    if (e.pointerId === trackedPointerId) {
      reset();
    }
  }

  function onPointerCancel(e: PointerEvent) {
    onPointerUp(e);
  }

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerCancel);

  return {
    destroy() {
      reset();
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}

/**
 * Convenience: fire a synthetic `contextmenu` event at `(x, y)` on
 * `target`. Used by the host to reuse the existing right-click menu
 * wiring after a long-press lands. Bubbles + cancels by default,
 * matching a real contextmenu event.
 */
export function dispatchSyntheticContextMenu(
  target: HTMLElement,
  x: number,
  y: number,
): void {
  const ev = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 2,
  });
  target.dispatchEvent(ev);
}

/**
 * Convenience: fire a synthetic `pointercancel` for the active touch
 * gesture so any tool that started a single-finger drag (Draw stroke,
 * Token drag, etc.) abandons it cleanly before the menu opens.
 *
 * Mirrors the `cancelPointerForTools` helper in `pan-zoom.ts`.
 */
export function dispatchPointerCancel(
  target: HTMLElement,
  pointerId: number,
): void {
  const ev = new PointerEvent('pointercancel', {
    pointerId,
    pointerType: 'touch',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(ev);
}
