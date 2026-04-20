/**
 * Tiny wrapper around a localStorage boolean used to distinguish a
 * clean shutdown (`beforeunload` ran) from a crash / force-close.
 *
 *   Boot flow:
 *     1. `consumeDirtyFlag()` reads the previous value AND flips the
 *        flag to `true` (we're dirty until we cleanly exit).
 *     2. If it returned `true`, we were dirty at boot — previous
 *        session crashed. Caller shows the recovery banner.
 *     3. `markDirty()` is cheap / idempotent; call on every state
 *        change. It's a no-op once the flag is already `true`.
 *     4. `markClean()` is called from `beforeunload`. Flips back to
 *        `false` so the next boot sees a clean exit.
 */

export const DIRTY_FLAG_KEY = 'gm-encounter-maps-dirty';

function read(): boolean {
  try {
    return localStorage.getItem(DIRTY_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function write(value: boolean): void {
  try {
    if (value) localStorage.setItem(DIRTY_FLAG_KEY, '1');
    else localStorage.removeItem(DIRTY_FLAG_KEY);
  } catch {
    /* quota / privacy mode — safely ignored */
  }
}

/**
 * Atomically read the old dirty flag AND set it to `true` (we're now
 * dirty until shutdown). Returns the OLD value — callers use that to
 * decide whether to show the "restored from autosave" banner.
 */
export function consumeDirtyFlag(): boolean {
  const was = read();
  write(true);
  return was;
}

/** Ensure the flag is `true`. Cheap no-op once already set. */
export function markDirty(): void {
  if (read()) return;
  write(true);
}

/** Clear the flag — graceful-shutdown signal for the next boot. */
export function markClean(): void {
  write(false);
}

/** Test-only: observe current value without mutation. */
export function _peekDirtyFlag(): boolean {
  return read();
}
