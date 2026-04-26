/**
 * Phase 89 — programmatic WCAG contrast verification across every
 * theme. The token palettes live in `src/ui/styles.css`; this test
 * mirrors them as a lookup table + asserts that every text + UI
 * component pair meets the applicable WCAG threshold.
 *
 * If a theme's tokens drift below threshold (a future palette tweak
 * that didn't account for contrast), this test fails with a clear
 * diff: "expected ≥ 4.50:1, got 3.92:1 for fg-muted on bg-elev in
 * theme-parchment".
 *
 * The themes referenced here are the source of truth — kept in sync
 * with styles.css by the periodic audit (a CSS-side change to a token
 * value MUST also be reflected here, otherwise this test will hide
 * the regression). A future polish could parse styles.css at test
 * time to make this automatic.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio, formatRatio, WCAG } from './contrast.js';

interface ThemePalette {
  name: string;
  bg: string;
  bgElev: string;
  fg: string;
  fgMuted: string;
  accent: string;
}

const THEMES: readonly ThemePalette[] = [
  {
    name: 'dark',
    bg: '#1b1d22',
    bgElev: '#24272d',
    fg: '#e7e9ee',
    fgMuted: '#a0a4ad',
    accent: '#c44a3a',
  },
  {
    name: 'light',
    bg: '#f3f4f7',
    bgElev: '#ffffff',
    fg: '#1d1f24',
    fgMuted: '#5d636e',
    accent: '#c44a3a',
  },
  {
    name: 'parchment',
    bg: '#f4ecd8',
    bgElev: '#fbf6e8',
    fg: '#3a2e1f',
    fgMuted: '#776747', // Phase 89 — bumped from #7a6a4d (4.46:1) for AA
    accent: '#8b4513',
  },
  {
    name: 'console',
    bg: '#0a0e0a',
    bgElev: '#121712',
    fg: '#9affb0',
    fgMuted: '#5c8a66',
    accent: '#00ff7f',
  },
  {
    name: 'purple-dusk',
    bg: '#1a1532',
    bgElev: '#241e3d',
    fg: '#e8e4f5',
    fgMuted: '#9c93b8',
    accent: '#bb7cff',
  },
];

describe('Phase 89 — WCAG contrast across every theme', () => {
  describe.each(THEMES)('theme: $name', (t) => {
    it(`fg on bg meets AA normal-text (${WCAG.AA_NORMAL_TEXT}:1)`, () => {
      const ratio = contrastRatio(t.fg, t.bg);
      expect(
        ratio,
        `theme-${t.name} fg ${t.fg} on bg ${t.bg} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
    });

    it(`fg on bg-elev meets AA normal-text (${WCAG.AA_NORMAL_TEXT}:1)`, () => {
      const ratio = contrastRatio(t.fg, t.bgElev);
      expect(
        ratio,
        `theme-${t.name} fg ${t.fg} on bg-elev ${t.bgElev} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
    });

    it(`fg-muted on bg meets AA large-text (${WCAG.AA_LARGE_TEXT}:1)`, () => {
      // fg-muted is used for secondary labels, hint text, captions —
      // typically smaller than the primary text. AA's large-text
      // threshold (3:1) is the practical bar; sub-3:1 is illegible.
      // Phase 89 also raises everything to the AA_NORMAL bar where
      // possible (see assertion below) but keeps this as the floor.
      const ratio = contrastRatio(t.fgMuted, t.bg);
      expect(
        ratio,
        `theme-${t.name} fg-muted ${t.fgMuted} on bg ${t.bg} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_LARGE_TEXT);
    });

    it(`fg-muted on bg meets AA normal-text (${WCAG.AA_NORMAL_TEXT}:1) — Phase 89 polish`, () => {
      // Tighter assertion: fg-muted should ideally clear the normal-text
      // bar on the primary background too. Anything that fails here
      // got bumped during Phase 89.
      const ratio = contrastRatio(t.fgMuted, t.bg);
      expect(
        ratio,
        `theme-${t.name} fg-muted ${t.fgMuted} on bg ${t.bg} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
    });

    it(`fg-muted on bg-elev meets AA normal-text (${WCAG.AA_NORMAL_TEXT}:1)`, () => {
      const ratio = contrastRatio(t.fgMuted, t.bgElev);
      expect(
        ratio,
        `theme-${t.name} fg-muted ${t.fgMuted} on bg-elev ${t.bgElev} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
    });

    it(`accent on bg meets AA UI-component (${WCAG.AA_UI_COMPONENT}:1)`, () => {
      const ratio = contrastRatio(t.accent, t.bg);
      expect(
        ratio,
        `theme-${t.name} accent ${t.accent} on bg ${t.bg} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_UI_COMPONENT);
    });

    it(`accent on bg-elev meets AA UI-component (${WCAG.AA_UI_COMPONENT}:1)`, () => {
      const ratio = contrastRatio(t.accent, t.bgElev);
      expect(
        ratio,
        `theme-${t.name} accent ${t.accent} on bg-elev ${t.bgElev} = ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(WCAG.AA_UI_COMPONENT);
    });
  });
});
