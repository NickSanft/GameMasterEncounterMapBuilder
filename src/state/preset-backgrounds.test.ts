import { describe, it, expect } from 'vitest';
import { PRESET_BACKGROUNDS, resolvePresetUrl } from './preset-backgrounds.js';

describe('PRESET_BACKGROUNDS', () => {
  it('has at least one preset', () => {
    expect(PRESET_BACKGROUNDS.length).toBeGreaterThan(0);
  });

  it('has a unique id for each preset', () => {
    const ids = new Set(PRESET_BACKGROUNDS.map((p) => p.id));
    expect(ids.size).toBe(PRESET_BACKGROUNDS.length);
  });

  it('has non-empty name, description, and path for each preset', () => {
    for (const p of PRESET_BACKGROUNDS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.path.length).toBeGreaterThan(0);
      expect(p.path.endsWith('.svg')).toBe(true);
    }
  });
});

describe('resolvePresetUrl', () => {
  it('appends the preset path to the base URL', () => {
    const preset = PRESET_BACKGROUNDS[0]!;
    const url = resolvePresetUrl(preset);
    expect(url.endsWith(preset.path)).toBe(true);
  });

  it('includes exactly one slash between base and path', () => {
    const preset = PRESET_BACKGROUNDS[0]!;
    const url = resolvePresetUrl(preset);
    // no double slashes after the protocol portion
    const withoutScheme = url.replace(/^[a-z]+:\/\//, '');
    expect(withoutScheme).not.toMatch(/\/\//);
  });
});
