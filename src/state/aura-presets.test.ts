/**
 * Phase 159 — aura preset tests.
 */
import { describe, it, expect } from 'vitest';
import { AURA_PRESETS, instantiateAuraPreset } from './aura-presets.js';

describe('AURA_PRESETS (Phase 159)', () => {
  it('is a non-empty list', () => {
    expect(AURA_PRESETS.length).toBeGreaterThan(0);
  });

  it('every preset has a unique id', () => {
    const ids = new Set(AURA_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(AURA_PRESETS.length);
  });

  it('every preset has a unique label', () => {
    const labels = new Set(AURA_PRESETS.map((p) => p.label));
    expect(labels.size).toBe(AURA_PRESETS.length);
  });

  it('every preset has a valid hex color', () => {
    for (const p of AURA_PRESETS) {
      expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('every preset has a positive radius', () => {
    for (const p of AURA_PRESETS) {
      expect(p.radiusFeet).toBeGreaterThan(0);
    }
  });

  it('every preset has a valid visibility', () => {
    for (const p of AURA_PRESETS) {
      expect(['gm', 'shared']).toContain(p.visibility);
    }
  });
});

describe('instantiateAuraPreset (Phase 159)', () => {
  const bless = AURA_PRESETS.find((p) => p.id === 'bless')!;

  it('converts radiusFeet to world pixels using the active grid', () => {
    // 30 ft / 5 ft-per-square = 6 squares × 50 px/cell = 300 px.
    const aura = instantiateAuraPreset(bless, 5, 50);
    expect(aura.radius).toBe(300);
  });

  it('respects custom feetPerSquare (10 ft squares)', () => {
    // 30 ft / 10 = 3 squares × 50 = 150 px.
    const aura = instantiateAuraPreset(bless, 10, 50);
    expect(aura.radius).toBe(150);
  });

  it('respects custom cellSize', () => {
    // 30 ft / 5 = 6 squares × 80 px = 480 px.
    const aura = instantiateAuraPreset(bless, 5, 80);
    expect(aura.radius).toBe(480);
  });

  it('mints a fresh id on every call so consecutive stamps do not collide', () => {
    const a = instantiateAuraPreset(bless, 5, 50);
    const b = instantiateAuraPreset(bless, 5, 50);
    expect(a.id).not.toBe(b.id);
  });

  it('copies the preset label, color, and visibility', () => {
    const aura = instantiateAuraPreset(bless, 5, 50);
    expect(aura.label).toBe(bless.label);
    expect(aura.color).toBe(bless.color);
    expect(aura.visibility).toBe(bless.visibility);
  });
});
