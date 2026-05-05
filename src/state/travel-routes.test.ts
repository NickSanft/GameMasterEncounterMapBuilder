/**
 * Phase 158 — travel-route helper tests.
 */
import { describe, it, expect } from 'vitest';
import { routeTotalWorldPx, formatRouteDistance } from './travel-routes.js';

describe('routeTotalWorldPx (Phase 158)', () => {
  it('returns 0 for a 1-point route (defensive)', () => {
    expect(routeTotalWorldPx({ points: [{ x: 0, y: 0 }] })).toBe(0);
  });

  it('returns 0 for an empty points array (defensive)', () => {
    expect(routeTotalWorldPx({ points: [] })).toBe(0);
  });

  it('measures a horizontal segment', () => {
    expect(
      routeTotalWorldPx({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      }),
    ).toBe(100);
  });

  it('measures a 3-4-5 triangle correctly (Pythagorean)', () => {
    expect(
      routeTotalWorldPx({
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ],
      }),
    ).toBe(5);
  });

  it('sums multiple segments', () => {
    // Two 100-px horizontal hops in a row.
    expect(
      routeTotalWorldPx({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 200, y: 0 },
        ],
      }),
    ).toBe(200);
  });

  it('handles a closed-ish loop without dedup', () => {
    expect(
      routeTotalWorldPx({
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 0, y: 0 },
        ],
      }),
    ).toBe(100);
  });
});

describe('formatRouteDistance (Phase 158)', () => {
  it('formats squares with the "sq" suffix', () => {
    // 200 px / 50 cellSize = 4 sq.
    expect(formatRouteDistance(200, 50, 5, 'squares')).toBe('4 sq');
  });

  it('formats feet using feetPerSquare', () => {
    // 200 px / 50 = 4 sq * 5 ft = 20 ft.
    expect(formatRouteDistance(200, 50, 5, 'feet')).toBe('20 ft');
  });

  it('rounds non-integer squares', () => {
    // 75 px / 50 cellSize = 1.5 sq → 2 sq.
    expect(formatRouteDistance(75, 50, 5, 'squares')).toBe('2 sq');
  });

  it('returns empty string for zero cell size (defensive)', () => {
    expect(formatRouteDistance(100, 0, 5, 'feet')).toBe('');
  });

  it('respects custom feetPerSquare (10 ft squares)', () => {
    // 100 px / 50 = 2 sq * 10 ft = 20 ft.
    expect(formatRouteDistance(100, 50, 10, 'feet')).toBe('20 ft');
  });
});
