/**
 * Phase 104 — pure math for two-finger rotation.
 *
 * Mirrors the shape of `pinch.ts`: a `rotateStart(p1, p2, baseRotation)`
 * captures the initial finger angle + the AoE's pre-gesture rotation, and
 * `rotateUpdate(snapshot, p1, p2)` returns the new rotation as the user
 * twists the two fingers.
 *
 * Used by the AoE tool while a cone / line preview is in flight: the
 * first finger holds the apex (or origin) at the position it was at when
 * the second finger landed; rotating the second finger around that apex
 * rotates the AoE. Lifting either finger commits.
 *
 * Rotation is in radians, anchored to the initial finger pair so a small
 * twist doesn't snap the AoE to a totally different angle.
 */

export interface RotatePoint {
  x: number;
  y: number;
}

export interface RotateSnapshot {
  /** Angle (radians, atan2-style) between the two fingers at gesture start. */
  startAngle: number;
  /** The AoE's rotation before the gesture began, in radians. */
  baseRotation: number;
}

/**
 * Begin a two-finger rotate. Returns the snapshot to thread through
 * subsequent `rotateUpdate` calls.
 */
export function rotateStart(
  p1: RotatePoint,
  p2: RotatePoint,
  baseRotation: number,
): RotateSnapshot {
  return {
    startAngle: angleBetween(p1, p2),
    baseRotation,
  };
}

/**
 * Compute the new rotation as the user twists the two fingers.
 * The result is `baseRotation + (currentAngle − startAngle)` —
 * a small twist becomes a small delta from the original rotation,
 * not a wholesale jump to the absolute angle.
 */
export function rotateUpdate(
  snap: RotateSnapshot,
  p1: RotatePoint,
  p2: RotatePoint,
): number {
  const current = angleBetween(p1, p2);
  return snap.baseRotation + (current - snap.startAngle);
}

/**
 * Angle (radians) of the vector from `p1` to `p2`. Same convention
 * `aoePlacementFromDrag` uses (`Math.atan2(dy, dx)`) so wiring rotates
 * the AoE in the same orientation as a single-finger drag would have.
 */
export function angleBetween(p1: RotatePoint, p2: RotatePoint): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
