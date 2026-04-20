import { describe, it, expect } from 'vitest';
import {
  centroidOf,
  distanceBetween,
  pinchStart,
  pinchUpdate,
} from './pinch.js';
import { DEFAULT_CAMERA } from '../state/types.js';

describe('centroidOf / distanceBetween', () => {
  it('centroid is the midpoint', () => {
    expect(centroidOf({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('distance is straight-line hypot', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distanceBetween({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});

describe('pinchStart / pinchUpdate', () => {
  it('keeps camera + zoom unchanged when fingers do not move', () => {
    const cam = { x: 20, y: 30, zoom: 1.5 };
    const snap = pinchStart({ x: 100, y: 100 }, { x: 200, y: 200 }, cam);
    const next = pinchUpdate(snap, { x: 100, y: 100 }, { x: 200, y: 200 });
    expect(next.zoom).toBeCloseTo(cam.zoom, 6);
    expect(next.x).toBeCloseTo(cam.x, 6);
    expect(next.y).toBeCloseTo(cam.y, 6);
  });

  it('spreading fingers apart zooms in (new zoom > start zoom)', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    const snap = pinchStart({ x: 100, y: 100 }, { x: 200, y: 100 }, cam);
    // Fingers move apart, same centroid.
    const next = pinchUpdate(snap, { x: 50, y: 100 }, { x: 250, y: 100 });
    expect(next.zoom).toBeGreaterThan(cam.zoom);
  });

  it('pinching fingers together zooms out', () => {
    const cam = { x: 0, y: 0, zoom: 2 };
    const snap = pinchStart({ x: 100, y: 100 }, { x: 300, y: 100 }, cam);
    const next = pinchUpdate(snap, { x: 180, y: 100 }, { x: 220, y: 100 });
    expect(next.zoom).toBeLessThan(cam.zoom);
  });

  it('clamps zoom to provided min/max', () => {
    const cam = { ...DEFAULT_CAMERA, zoom: 4 };
    const snap = pinchStart({ x: 0, y: 0 }, { x: 100, y: 0 }, cam);
    // Huge spread → zoom should clamp.
    const next = pinchUpdate(snap, { x: 0, y: 0 }, { x: 10000, y: 0 }, { maxZoom: 8 });
    expect(next.zoom).toBe(8);
  });

  it('keeps the world point under the centroid stationary while zooming', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    // Fingers around a centroid at (150, 100).
    const snap = pinchStart({ x: 100, y: 100 }, { x: 200, y: 100 }, cam);
    // The world point under (150,100) at zoom 1 is (150, 100).
    expect(snap.anchorWorld).toEqual({ x: 150, y: 100 });
    // Spread fingers symmetrically around the same centroid.
    const next = pinchUpdate(snap, { x: 50, y: 100 }, { x: 250, y: 100 });
    // The centroid still maps to (150,100) in world space: world = cam + centroid / zoom.
    const worldX = next.x + 150 / next.zoom;
    const worldY = next.y + 100 / next.zoom;
    expect(worldX).toBeCloseTo(150, 5);
    expect(worldY).toBeCloseTo(100, 5);
  });

  it('falls back to unchanged zoom when start distance is zero', () => {
    const cam = { x: 0, y: 0, zoom: 2 };
    const snap = pinchStart({ x: 100, y: 100 }, { x: 100, y: 100 }, cam);
    const next = pinchUpdate(snap, { x: 50, y: 100 }, { x: 150, y: 100 });
    // No crash, zoom unchanged (the finger-delta math is ambiguous with 0 start dist).
    expect(next.zoom).toBe(cam.zoom);
  });

  it('centroid pan without zoom change moves the camera opposite to the gesture', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    const snap = pinchStart({ x: 100, y: 100 }, { x: 200, y: 100 }, cam);
    // Shift both fingers right by 50px — centroid moves from 150 → 200.
    const next = pinchUpdate(snap, { x: 150, y: 100 }, { x: 250, y: 100 });
    // Zoom is unchanged (distance identical).
    expect(next.zoom).toBeCloseTo(1, 6);
    // Camera moves left by the gesture delta (screen-pixels / zoom).
    expect(next.x).toBeCloseTo(-50, 6);
    expect(next.y).toBeCloseTo(0, 6);
  });
});
