/**
 * Phase 104 — two-finger rotate math tests.
 *
 * Pure module — exercise `rotateStart` + `rotateUpdate` + `angleBetween`
 * with synthetic finger pairs. Rotations in radians; check approximate
 * equality with a small epsilon since trig functions accumulate
 * floating-point noise.
 */
import { describe, it, expect } from 'vitest';
import {
  rotateStart,
  rotateUpdate,
  angleBetween,
} from './two-finger-rotate.js';

const EPS = 1e-9;

const p = (x: number, y: number) => ({ x, y });

describe('angleBetween', () => {
  it('returns 0 for two points along +X axis', () => {
    expect(angleBetween(p(0, 0), p(10, 0))).toBeCloseTo(0, 9);
  });

  it('returns +PI/2 for two points along +Y axis', () => {
    expect(angleBetween(p(0, 0), p(0, 10))).toBeCloseTo(Math.PI / 2, 9);
  });

  it('returns +PI (or -PI) for opposite-X', () => {
    const a = angleBetween(p(0, 0), p(-10, 0));
    expect(Math.abs(Math.abs(a) - Math.PI)).toBeLessThan(EPS);
  });

  it('returns -PI/2 for points along -Y axis', () => {
    expect(angleBetween(p(0, 0), p(0, -10))).toBeCloseTo(-Math.PI / 2, 9);
  });
});

describe('rotateStart + rotateUpdate', () => {
  it('updating with the SAME finger positions returns the original baseRotation', () => {
    const snap = rotateStart(p(0, 0), p(10, 0), 0.7);
    expect(rotateUpdate(snap, p(0, 0), p(10, 0))).toBeCloseTo(0.7, 9);
  });

  it('twisting +PI/2 from horizontal adds +PI/2 to baseRotation', () => {
    const snap = rotateStart(p(0, 0), p(10, 0), 1.0);
    // Same anchor, second finger now points up — +PI/2 twist.
    expect(rotateUpdate(snap, p(0, 0), p(0, 10))).toBeCloseTo(1.0 + Math.PI / 2, 9);
  });

  it('twisting -PI/2 from horizontal subtracts PI/2 from baseRotation', () => {
    const snap = rotateStart(p(0, 0), p(10, 0), 0);
    expect(rotateUpdate(snap, p(0, 0), p(0, -10))).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('rotating both fingers (anchor + tip) by the same amount preserves rotation delta', () => {
    // Start: fingers along X, base rotation 0.
    const snap = rotateStart(p(0, 0), p(10, 0), 0);
    // Both fingers shifted in space but their relative angle is the same.
    expect(rotateUpdate(snap, p(50, 50), p(60, 50))).toBeCloseTo(0, 9);
  });

  it('captures the initial finger angle in the snapshot', () => {
    const snap = rotateStart(p(0, 0), p(0, 10), 0.5);
    expect(snap.startAngle).toBeCloseTo(Math.PI / 2, 9);
    expect(snap.baseRotation).toBe(0.5);
  });

  it('chained updates compose linearly', () => {
    const snap = rotateStart(p(0, 0), p(10, 0), 0);
    // First a +PI/4 twist.
    const r1 = rotateUpdate(
      snap,
      p(0, 0),
      p(Math.cos(Math.PI / 4) * 10, Math.sin(Math.PI / 4) * 10),
    );
    expect(r1).toBeCloseTo(Math.PI / 4, 9);
    // Then a +PI/2 twist from the original.
    const r2 = rotateUpdate(snap, p(0, 0), p(0, 10));
    expect(r2).toBeCloseTo(Math.PI / 2, 9);
  });

  it('a negative baseRotation is preserved when fingers are unchanged', () => {
    const snap = rotateStart(p(0, 0), p(10, 0), -1.5);
    expect(rotateUpdate(snap, p(0, 0), p(10, 0))).toBeCloseTo(-1.5, 9);
  });
});
