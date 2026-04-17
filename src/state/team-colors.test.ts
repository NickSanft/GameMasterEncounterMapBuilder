import { describe, it, expect } from 'vitest';
import { TEAM_PRESETS, shapeForBorderColor } from './team-colors.js';

describe('TEAM_PRESETS', () => {
  it('contains five presets with distinct shapes', () => {
    expect(TEAM_PRESETS.length).toBe(5);
    const shapes = new Set(TEAM_PRESETS.map((p) => p.shape));
    expect(shapes.size).toBe(5);
  });

  it('has unique colors for every preset', () => {
    const colors = new Set(TEAM_PRESETS.map((p) => p.color.toLowerCase()));
    expect(colors.size).toBe(TEAM_PRESETS.length);
  });
});

describe('shapeForBorderColor', () => {
  it('returns null for null input', () => {
    expect(shapeForBorderColor(null)).toBeNull();
  });

  it('returns the correct shape for each preset color', () => {
    for (const preset of TEAM_PRESETS) {
      expect(shapeForBorderColor(preset.color)).toBe(preset.shape);
    }
  });

  it('is case-insensitive', () => {
    const preset = TEAM_PRESETS[0]!;
    expect(shapeForBorderColor(preset.color.toUpperCase())).toBe(preset.shape);
  });

  it('returns null for non-preset colors', () => {
    expect(shapeForBorderColor('#123456')).toBeNull();
    expect(shapeForBorderColor('#ffffff')).toBeNull();
  });
});
