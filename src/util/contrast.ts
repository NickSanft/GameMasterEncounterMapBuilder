/**
 * Phase 89 — WCAG 2.1 contrast helpers.
 *
 * Pure functions for computing relative luminance + contrast ratios
 * per WCAG 2.1 §1.4.3 and §1.4.11. The themes ship hex strings; the
 * regression test in `theme-contrast.test.ts` resolves those at test
 * time and asserts that every (text, background) pair meets the
 * applicable threshold.
 *
 * Formula reference: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *   For each sRGB component (R, G, B normalized to 0..1):
 *     c_linear = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
 *   L = 0.2126·R + 0.7152·G + 0.0722·B
 *
 * Contrast ratio (WCAG §1.4.3):
 *   (L_lighter + 0.05) / (L_darker + 0.05)
 *
 * Threshold cheat sheet:
 *   - AA  normal text  : 4.5:1
 *   - AA  large text   : 3:1   (≥ 18 pt, or ≥ 14 pt bold)
 *   - AA  UI component : 3:1   (focus rings, icon buttons, etc.)
 *   - AAA normal text  : 7:1
 *   - AAA large text   : 4.5:1
 */

/** Parse `#rgb`, `#rrggbb`, or `#rrggbbaa` to a `[0..255, 0..255, 0..255]` triple. Alpha is ignored. */
export function parseHex(hex: string): readonly [number, number, number] {
  if (typeof hex !== 'string') {
    throw new Error(`parseHex: expected string, got ${typeof hex}`);
  }
  const trimmed = hex.trim();
  const m = /^#?([0-9a-fA-F]{3,8})$/.exec(trimmed);
  if (!m) throw new Error(`parseHex: not a hex color: ${hex}`);
  const body = m[1]!;
  let r: number, g: number, b: number;
  if (body.length === 3) {
    r = parseInt(body[0]! + body[0]!, 16);
    g = parseInt(body[1]! + body[1]!, 16);
    b = parseInt(body[2]! + body[2]!, 16);
  } else if (body.length === 6 || body.length === 8) {
    r = parseInt(body.slice(0, 2), 16);
    g = parseInt(body.slice(2, 4), 16);
    b = parseInt(body.slice(4, 6), 16);
  } else {
    throw new Error(`parseHex: unsupported hex length: ${hex}`);
  }
  return [r, g, b];
}

function srgbToLinear(c8bit: number): number {
  const c = c8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1 §Relative_luminance. Range: [0, 1]. */
export function relativeLuminance(rgb: readonly [number, number, number]): number {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two colors per WCAG 2.1 §1.4.3.
 *
 * Returns a number in [1, 21]:
 *   - 1   = identical colors
 *   - 4.5 = WCAG AA threshold for normal text
 *   - 7   = WCAG AAA threshold for normal text
 *   - 21  = pure white on pure black
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG threshold lookup. Use these constants to keep call sites readable. */
export const WCAG = {
  AA_NORMAL_TEXT: 4.5,
  AA_LARGE_TEXT: 3,
  AA_UI_COMPONENT: 3,
  AAA_NORMAL_TEXT: 7,
  AAA_LARGE_TEXT: 4.5,
} as const;

/** True iff the pair meets the given threshold. */
export function meetsThreshold(a: string, b: string, threshold: number): boolean {
  return contrastRatio(a, b) >= threshold;
}

/**
 * Format a ratio as `4.52:1` for log / error messages — three sig figs
 * is the standard WCAG report format.
 */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
