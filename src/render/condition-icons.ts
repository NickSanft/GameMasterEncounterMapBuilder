/**
 * Phase 138 — SVG path data for the 17 condition presets defined in
 * `state/conditions.ts`, plus a render helper that draws the icon
 * centered inside a circular chip on the canvas.
 *
 * Each path is authored in a **24 × 24 viewBox centered at (12, 12)**.
 * The renderer scales + translates to draw inside the existing
 * Phase 50 condition chip (the one painted above each token in
 * `layer-tokens.ts`). `Path2D` instances are built lazily on first
 * use and cached, so a busy combat round paints the same icon many
 * times without re-parsing the SVG path string each frame.
 *
 * Icon design constraints:
 *   - Distinguishable at chipR = 9 px (the threshold below which
 *     the existing letter-glyph path skipped the glyph entirely —
 *     same threshold here).
 *   - Renderable as a single fill OR a single stroke (we use stroke
 *     for crisp shapes against the colored chip background; thicker
 *     monochrome lines read better than gradient-filled shapes at
 *     small sizes).
 *   - Conventional silhouettes (heart for charmed, lightning for
 *     paralyzed, etc.) so a GM scanning the canvas mid-fight can
 *     recognize the condition by shape alone.
 *
 * Pre-Phase-138 the chip showed a 1-2 letter glyph (`Co` for
 * concentrating, `Pt` for petrified, etc.). The glyph approach
 * worked but required reading; icons leverage shape recognition
 * which is faster + more language-agnostic.
 */

const PATHS: Record<string, string> = {
  // Eye outline + slash through it.
  blinded: 'M3 12 Q12 6 21 12 Q12 18 3 12 Z M5 5 L19 19',
  // Heart.
  charmed: 'M12 20 C 4 14 4 6 12 8 C 20 6 20 14 12 20 Z',
  // Concentric rings (target / focused-eye).
  concentrating:
    'M12 3 A 9 9 0 1 0 12.001 3 Z M12 7 A 5 5 0 1 0 12.001 7 Z M12 11 A 1 1 0 1 0 12.001 11 Z',
  // Ear silhouette + slash.
  deafened: 'M9 6 Q15 4 17 9 Q19 14 13 17 L13 14 M5 5 L19 19',
  // Two stacked Z letters.
  exhaustion: 'M5 7 L11 7 L5 15 L11 15 M13 11 L19 11 L13 17 L19 17',
  // Exclamation point.
  frightened: 'M11 4 L13 4 L12 14 Z M11 17 L13 17 L13 19 L11 19 Z',
  // Two side-by-side rings (chain-link).
  grappled:
    'M8 12 A 4 4 0 1 0 8.01 12 Z M16 12 A 4 4 0 1 0 16.01 12 Z',
  // Diagonal X.
  incapacitated: 'M5 5 L19 19 M19 5 L5 19',
  // Dashed circle (segments) — invisible.
  invisible:
    'M4 12 A 8 8 0 0 1 12 4 M16 5 A 8 8 0 0 1 20 12 M20 14 A 8 8 0 0 1 14 20 M10 19 A 8 8 0 0 1 4 14',
  // Lightning bolt zigzag.
  paralyzed: 'M14 3 L7 13 L11 13 L9 21 L17 10 L13 10 L14 3 Z',
  // Pointy-top hexagon (stone block).
  petrified: 'M12 3 L20 8 L20 16 L12 21 L4 16 L4 8 Z',
  // Teardrop (poison).
  poisoned: 'M12 3 Q18 11 16 17 A 4 4 0 0 1 8 17 Q6 11 12 3 Z',
  // Horizontal supine figure (line + small head).
  prone: 'M3 16 L21 16 M7 13 A 2 2 0 1 0 7.01 13 Z',
  // Bind / hash (4 perpendicular bars).
  restrained: 'M4 9 L20 9 M4 15 L20 15 M9 4 L9 20 M15 4 L15 20',
  // 5-point star.
  stunned:
    'M12 3 L14.5 10 L22 10 L16 14.5 L18.5 22 L12 17.5 L5.5 22 L8 14.5 L2 10 L9.5 10 Z',
  // Crescent moon (sleeping).
  unconscious: 'M14 4 A 9 9 0 1 0 14 20 A 6 6 0 1 1 14 4 Z',
  // Plus / medical cross (for the bloodied "below half HP" flag — visually
  // distinct from poisoned's teardrop despite both being damage-themed).
  bloodied:
    'M10 4 L14 4 L14 10 L20 10 L20 14 L14 14 L14 20 L10 20 L10 14 L4 14 L4 10 L10 10 Z',
};

/**
 * Lazy `Path2D` cache. Built on first lookup per id, retained for
 * the lifetime of the page. Total memory is bounded by the 17
 * preset ids; unknown ids return `null` and the caller falls back
 * (existing pre-138 code paints just the colored chip).
 */
const CACHE = new Map<string, Path2D>();

export function getConditionIconPath(id: string): Path2D | null {
  const cached = CACHE.get(id);
  if (cached) return cached;
  const raw = PATHS[id];
  if (!raw) return null;
  const path = new Path2D(raw);
  CACHE.set(id, path);
  return path;
}

/**
 * Test-only — drop the cache. Lets unit tests verify the lazy-build
 * path runs on first lookup without leaking state across tests.
 */
export function _resetIconCache(): void {
  CACHE.clear();
}

/**
 * Render the icon for `id` centered at `(cx, cy)` with chip radius
 * `chipR`. The icon is scaled to fit ~70% of the chip diameter and
 * stroked with `strokeStyle` (typically picked by `preferBlackText`
 * for contrast against the chip's fill color). Returns `false` when
 * `id` has no preset icon (caller falls back — currently a no-op
 * since the chip's color already disambiguates somewhat).
 *
 * Save / restore the canvas state around this call externally — the
 * helper assumes it can mutate the transform freely.
 */
export function drawConditionIcon(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  chipR: number,
  strokeStyle: string,
): boolean {
  const path = getConditionIconPath(id);
  if (!path) return false;
  // 70% of the chip diameter, normalized to the 24x24 viewBox.
  const targetSize = chipR * 1.4;
  const scale = targetSize / 24;
  ctx.save();
  // Translate so the viewBox center (12, 12) lands at (cx, cy).
  ctx.translate(cx - 12 * scale, cy - 12 * scale);
  ctx.scale(scale, scale);
  ctx.lineWidth = Math.max(1.5, 2 / scale);
  ctx.strokeStyle = strokeStyle;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.restore();
  return true;
}

/**
 * Test helper — list the ids for which an icon exists. Lets the
 * unit suite assert "every CONDITION_PRESETS id has an icon."
 */
export function listIconIds(): string[] {
  return Object.keys(PATHS);
}
