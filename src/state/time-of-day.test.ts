import { describe, it, expect } from 'vitest';
import { tintFor, TIME_TINTS, TIME_LABELS } from './time-of-day.js';

describe('tintFor', () => {
  it('returns null for none', () => {
    expect(tintFor('none')).toBeNull();
  });

  it('returns null for day (intentional no-op)', () => {
    expect(tintFor('day')).toBeNull();
  });

  it('returns a {color, opacity} tint for dawn / dusk / night', () => {
    for (const kind of ['dawn', 'dusk', 'night'] as const) {
      const tint = tintFor(kind);
      expect(tint).not.toBeNull();
      expect(tint!.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tint!.opacity).toBeGreaterThan(0);
      expect(tint!.opacity).toBeLessThanOrEqual(1);
    }
  });

  it('night is the heaviest tint (most opaque)', () => {
    const dawn = tintFor('dawn')!;
    const dusk = tintFor('dusk')!;
    const night = tintFor('night')!;
    expect(night.opacity).toBeGreaterThan(dawn.opacity);
    expect(night.opacity).toBeGreaterThan(dusk.opacity);
  });
});

describe('TIME_TINTS / TIME_LABELS', () => {
  it('TIME_TINTS covers every TimeOfDay variant', () => {
    expect(Object.keys(TIME_TINTS).sort()).toEqual([
      'dawn',
      'day',
      'dusk',
      'night',
      'none',
    ]);
  });

  it('TIME_LABELS covers every variant with a non-empty string', () => {
    for (const k of Object.keys(TIME_TINTS) as Array<keyof typeof TIME_LABELS>) {
      expect(TIME_LABELS[k]).toBeTruthy();
    }
  });
});
