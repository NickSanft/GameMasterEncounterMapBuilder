/**
 * Rotation helpers. The canonical representation is radians, clockwise
 * from "up" (negative-Y on a screen). Helpers keep the value in
 * `[0, 2π)` for consistent serialization and renderer predictability.
 */

export const TAU = Math.PI * 2;

/** Wrap any finite number of radians into `[0, 2π)`. */
export function normalizeRotation(radians: number): number {
  if (!Number.isFinite(radians)) return 0;
  const wrapped = radians % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

/** Convert radians to degrees, always reported in `[0, 360)` for UI. */
export function radiansToDegrees(radians: number): number {
  return (normalizeRotation(radians) * 180) / Math.PI;
}

/** Convert degrees to radians, tolerant of any finite input. */
export function degreesToRadians(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return normalizeRotation((degrees * Math.PI) / 180);
}

/**
 * Rotate by `deltaRadians`, wrapping around. Used by the `, / .` keyboard
 * shortcuts and the Prev/Next icon buttons.
 */
export function rotateBy(radians: number, deltaRadians: number): number {
  return normalizeRotation(radians + deltaRadians);
}

/**
 * Snap to the nearest increment (in radians). Typical values:
 *   - 45° snap:  `Math.PI / 4`
 *   - 90° snap:  `Math.PI / 2`
 *   - 15° snap:  `Math.PI / 12`
 */
export function snapRotation(radians: number, stepRadians: number): number {
  if (!Number.isFinite(stepRadians) || stepRadians <= 0) {
    return normalizeRotation(radians);
  }
  const r = normalizeRotation(radians);
  const steps = Math.round(r / stepRadians);
  return normalizeRotation(steps * stepRadians);
}

/** Convenience: snap to nearest 45° facing (the 8-compass directions). */
export function snapTo45(radians: number): number {
  return snapRotation(radians, Math.PI / 4);
}

/** Convenience: snap to nearest 90° facing (N/E/S/W). */
export function snapTo90(radians: number): number {
  return snapRotation(radians, Math.PI / 2);
}

/**
 * Compass label ("N", "NE", …) for a given rotation. Useful for the
 * token-editor readout and aria-live announcements. Rotations that don't
 * snap cleanly round to the nearest 45°.
 */
const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function compass8Direction(radians: number): (typeof COMPASS_8)[number] {
  const step = Math.PI / 4;
  const r = normalizeRotation(radians);
  const idx = Math.round(r / step) % 8;
  return COMPASS_8[idx]!;
}
