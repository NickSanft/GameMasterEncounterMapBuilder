/**
 * Pure math for two-finger pinch-pan-zoom.
 *
 * The pan-zoom handler tracks two active pointers; `pinchStart` captures
 * the centroid + finger distance at the moment the second finger lands,
 * and `pinchUpdate` turns the current (centroid, distance) into a new
 * camera. The camera is adjusted so the centroid stays over the same
 * world point — same trick as wheel-zoom-to-cursor, generalised to the
 * midpoint between two fingers.
 */
import type { Camera } from '../state/types.js';

export interface PinchPoint {
  x: number;
  y: number;
}

export interface PinchSnapshot {
  /** Centroid (midpoint) of the two fingers in canvas CSS pixels. */
  centroid: PinchPoint;
  /** Straight-line distance between the two fingers in CSS pixels. */
  distance: number;
  /** Camera + zoom at the moment the gesture began. */
  camera: Camera;
  /** World-space point under the centroid when the gesture began. */
  anchorWorld: PinchPoint;
}

/** Build a snapshot from two active finger positions + current camera. */
export function pinchStart(
  a: PinchPoint,
  b: PinchPoint,
  camera: Camera,
): PinchSnapshot {
  const centroid = centroidOf(a, b);
  const distance = distanceBetween(a, b);
  const anchorWorld = {
    x: camera.x + centroid.x / camera.zoom,
    y: camera.y + centroid.y / camera.zoom,
  };
  return { centroid, distance, camera: { ...camera }, anchorWorld };
}

export interface PinchUpdateOptions {
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Given the original snapshot + two new finger positions, compute the new
 * camera. Zoom is scaled by `currentDist / startDist`; pan shifts the
 * camera so the centroid keeps pointing at `snapshot.anchorWorld`.
 *
 * Guards against degenerate inputs (zero start distance) by leaving zoom
 * unchanged — so a user who starts a pinch with fingers already touching
 * won't see runaway scale factors.
 */
export function pinchUpdate(
  snapshot: PinchSnapshot,
  a: PinchPoint,
  b: PinchPoint,
  options: PinchUpdateOptions = {},
): Camera {
  const { minZoom = 0.1, maxZoom = 8 } = options;
  const centroid = centroidOf(a, b);
  const distance = distanceBetween(a, b);
  const startDist = snapshot.distance;
  const scale = startDist > 0 ? distance / startDist : 1;
  const rawZoom = snapshot.camera.zoom * scale;
  const zoom = Math.min(maxZoom, Math.max(minZoom, rawZoom));
  // Keep the world point under the gesture centroid stationary.
  const camX = snapshot.anchorWorld.x - centroid.x / zoom;
  const camY = snapshot.anchorWorld.y - centroid.y / zoom;
  return { x: camX, y: camY, zoom };
}

export function centroidOf(a: PinchPoint, b: PinchPoint): PinchPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distanceBetween(a: PinchPoint, b: PinchPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
