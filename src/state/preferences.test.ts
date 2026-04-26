import { describe, it, expect } from 'vitest';
import { createPreferences, DEFAULT_PREFERENCES } from './preferences.js';
import { PREFERENCES_KEY } from '../util/constants.js';

describe('createPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    const prefs = createPreferences();
    expect(prefs.get().labelSize).toBe(DEFAULT_PREFERENCES.labelSize);
    expect(prefs.get().highContrast).toBe(DEFAULT_PREFERENCES.highContrast);
    expect(prefs.get().persistCamera).toBe(DEFAULT_PREFERENCES.persistCamera);
    expect(prefs.get().theme).toBe('dark');
  });

  it('persists theme changes to localStorage', () => {
    const prefs = createPreferences();
    prefs.update({ theme: 'light' });
    const raw = localStorage.getItem(PREFERENCES_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).theme).toBe('light');
  });

  it('reset() restores every field to defaults', () => {
    const prefs = createPreferences();
    prefs.update({
      theme: 'light',
      labelSize: 'large',
      highContrast: true,
      colorblindMarkers: true,
      gmFogOpacity: 0.8,
    });
    prefs.reset();
    expect(prefs.get().theme).toBe('dark');
    expect(prefs.get().labelSize).toBe('medium');
    expect(prefs.get().highContrast).toBe(false);
    expect(prefs.get().colorblindMarkers).toBe(false);
    expect(prefs.get().gmFogOpacity).toBe(DEFAULT_PREFERENCES.gmFogOpacity);
  });

  it('reset() notifies subscribers', () => {
    const prefs = createPreferences();
    let latest = prefs.get();
    prefs.subscribe((p) => {
      latest = p;
    });
    prefs.update({ theme: 'light' });
    expect(latest.theme).toBe('light');
    prefs.reset();
    expect(latest.theme).toBe('dark');
  });

  it('persists updates to localStorage', () => {
    const prefs = createPreferences();
    prefs.update({ labelSize: 'large', highContrast: true });
    const raw = localStorage.getItem(PREFERENCES_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.labelSize).toBe('large');
    expect(parsed.highContrast).toBe(true);
  });

  it('loads existing preferences from localStorage', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ labelSize: 'small', gmFogOpacity: 0.7 }),
    );
    const prefs = createPreferences();
    expect(prefs.get().labelSize).toBe('small');
    expect(prefs.get().gmFogOpacity).toBe(0.7);
  });

  it('fills missing fields with defaults when loading partial blobs', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ highContrast: true }),
    );
    const prefs = createPreferences();
    expect(prefs.get().highContrast).toBe(true);
    expect(prefs.get().labelSize).toBe(DEFAULT_PREFERENCES.labelSize);
  });

  it('falls back to defaults on malformed JSON', () => {
    localStorage.setItem(PREFERENCES_KEY, 'not json');
    const prefs = createPreferences();
    expect(prefs.get().labelSize).toBe(DEFAULT_PREFERENCES.labelSize);
  });

  it('notifies subscribers on update', () => {
    const prefs = createPreferences();
    let latest = prefs.get();
    prefs.subscribe((p) => {
      latest = p;
    });
    prefs.update({ labelSize: 'large' });
    expect(latest.labelSize).toBe('large');
  });

  it('unsubscribe stops notifications', () => {
    const prefs = createPreferences();
    let count = 0;
    const off = prefs.subscribe(() => {
      count++;
    });
    off();
    prefs.update({ labelSize: 'small' });
    expect(count).toBe(0);
  });

  it('defaults diagnostics toggles to false', () => {
    const prefs = createPreferences();
    expect(prefs.get().showDiagnostics).toBe(false);
    expect(prefs.get().showSpectatorViewport).toBe(false);
  });

  it('persists and loads diagnostics toggles', () => {
    const a = createPreferences();
    a.update({ showDiagnostics: true, showSpectatorViewport: true });
    const b = createPreferences();
    expect(b.get().showDiagnostics).toBe(true);
    expect(b.get().showSpectatorViewport).toBe(true);
  });

  it('reset() clears diagnostics toggles', () => {
    const prefs = createPreferences();
    prefs.update({ showDiagnostics: true, showSpectatorViewport: true });
    prefs.reset();
    expect(prefs.get().showDiagnostics).toBe(false);
    expect(prefs.get().showSpectatorViewport).toBe(false);
  });
});

/**
 * Phase 91 — `prefers-contrast: more` auto-promotes the in-app
 * `highContrast` preference. Tests stub `window.matchMedia` so the OS
 * preference can be controlled deterministically.
 */
describe('createPreferences — Phase 91 (prefers-contrast: more)', () => {
  type MQL = MediaQueryList;
  const realMatchMedia = window.matchMedia;

  /** Stub matchMedia so a given query returns a specific `matches` value. */
  function stubMatchMedia(matchesByQuery: Record<string, boolean>) {
    window.matchMedia = ((query: string) => ({
      matches: matchesByQuery[query] ?? false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MQL)) as typeof window.matchMedia;
  }

  function restoreMatchMedia() {
    window.matchMedia = realMatchMedia;
  }

  it('seeds highContrast: true when the OS reports prefers-contrast: more', () => {
    stubMatchMedia({ '(prefers-contrast: more)': true });
    try {
      const prefs = createPreferences();
      expect(prefs.get().highContrast).toBe(true);
    } finally {
      restoreMatchMedia();
    }
  });

  it('seeds highContrast: false when the OS does NOT report prefers-contrast: more', () => {
    stubMatchMedia({ '(prefers-contrast: more)': false });
    try {
      const prefs = createPreferences();
      expect(prefs.get().highContrast).toBe(false);
    } finally {
      restoreMatchMedia();
    }
  });

  it('user stored preference WINS over the OS preference', () => {
    stubMatchMedia({ '(prefers-contrast: more)': true });
    try {
      // User has explicitly disabled high-contrast despite the OS being on.
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ highContrast: false }),
      );
      const prefs = createPreferences();
      expect(prefs.get().highContrast).toBe(false);
    } finally {
      restoreMatchMedia();
    }
  });

  it('user stored TRUE wins even when OS reports OFF', () => {
    stubMatchMedia({ '(prefers-contrast: more)': false });
    try {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ highContrast: true }),
      );
      const prefs = createPreferences();
      expect(prefs.get().highContrast).toBe(true);
    } finally {
      restoreMatchMedia();
    }
  });

  it('reset() goes back to the OS-derived default (not the static false)', () => {
    stubMatchMedia({ '(prefers-contrast: more)': true });
    try {
      const prefs = createPreferences();
      // First flip user preference OFF.
      prefs.update({ highContrast: false });
      expect(prefs.get().highContrast).toBe(false);
      // Reset → should re-pick up the OS preference.
      prefs.reset();
      expect(prefs.get().highContrast).toBe(true);
    } finally {
      restoreMatchMedia();
    }
  });

  it('prefers-reduced-motion + prefers-contrast: more both seed independently', () => {
    stubMatchMedia({
      '(prefers-reduced-motion: reduce)': true,
      '(prefers-contrast: more)': true,
    });
    try {
      const prefs = createPreferences();
      expect(prefs.get().reducedMotion).toBe(true);
      expect(prefs.get().highContrast).toBe(true);
    } finally {
      restoreMatchMedia();
    }
  });
});
