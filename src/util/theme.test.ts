import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme } from './theme.js';
import { ALL_THEMES, THEME_LABELS } from '../state/preferences.js';

describe('applyTheme', () => {
  beforeEach(() => {
    document.body.className = '';
  });

  it('applies no theme class for the default `dark` theme', () => {
    applyTheme('dark');
    // Dark is the `:root` baseline — no body class needed for it.
    expect(document.body.className).toBe('');
  });

  it('adds the `theme-light` class for the legacy light theme', () => {
    applyTheme('light');
    expect(document.body.classList.contains('theme-light')).toBe(true);
  });

  it.each(['parchment', 'console', 'purple-dusk'] as const)(
    'adds the `theme-%s` class for the corresponding Phase 59 variant',
    (theme) => {
      applyTheme(theme);
      expect(document.body.classList.contains(`theme-${theme}`)).toBe(true);
    },
  );

  it('clears the previous theme class when switching to a new theme', () => {
    applyTheme('parchment');
    expect(document.body.classList.contains('theme-parchment')).toBe(true);
    applyTheme('console');
    expect(document.body.classList.contains('theme-parchment')).toBe(false);
    expect(document.body.classList.contains('theme-console')).toBe(true);
  });

  it('clears every theme-* class when switching back to dark', () => {
    applyTheme('purple-dusk');
    expect(document.body.classList.contains('theme-purple-dusk')).toBe(true);
    applyTheme('dark');
    expect(document.body.classList.contains('theme-purple-dusk')).toBe(false);
    // No `theme-dark` class is added; dark is the baseline.
    expect(document.body.className).toBe('');
  });

  it('preserves non-theme body classes (high-contrast, reduced-motion, etc.)', () => {
    document.body.classList.add('high-contrast', 'reduced-motion');
    applyTheme('parchment');
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    expect(document.body.classList.contains('reduced-motion')).toBe(true);
    expect(document.body.classList.contains('theme-parchment')).toBe(true);
  });
});

describe('Theme constants', () => {
  it('ALL_THEMES contains every Theme value exactly once', () => {
    const set = new Set(ALL_THEMES);
    expect(set.size).toBe(ALL_THEMES.length);
    expect(ALL_THEMES).toEqual(['dark', 'light', 'parchment', 'console', 'purple-dusk']);
  });

  it('THEME_LABELS has a non-empty label for every theme', () => {
    for (const t of ALL_THEMES) {
      expect(THEME_LABELS[t].length).toBeGreaterThan(0);
    }
  });
});
