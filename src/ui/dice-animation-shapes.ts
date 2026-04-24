/**
 * Phase 73 — pure helpers for the dice-tray animation.
 *
 * Split out of `dice-animation.ts` so the polygon math + face-text
 * logic can be unit-tested without a DOM. The animation module
 * itself deals with timing, SVG rendering, and keyframes.
 *
 * Design: each standard die (d4/d6/d8/d10/d12/d20/d100) renders as
 * a distinctive polygon silhouette with the face value bold-text'd
 * in the center. Not truly 3D — more like D&D Beyond's 2D animated
 * sprites — but visually distinct enough that "d6 vs d20" reads at
 * a glance during multi-die rolls. Non-standard sides (say `2d7`)
 * fall back to a generic hexagon.
 */

/**
 * Visual spec for a die silhouette — SVG polygon points (in a
 * `[-1, 1]` coordinate space that the renderer maps to the die's
 * on-screen box) plus a base color. Face text is rendered at the
 * origin with inherited styling.
 */
export interface DieShape {
  /** Canonical id — what `shapeForSides(n)` keyed off of. */
  id: string;
  /** SVG points attribute for a `<polygon>`. Coords in `[-1, 1]`. */
  points: string;
  /** Base fill color. The render layer brightens the "settled" state. */
  color: string;
  /**
   * Face-text anchor offset (Y delta in the [-1, 1] space) —
   * asymmetric polygons (triangle, kite) need the number pushed
   * slightly off-center for visual balance.
   */
  textOffsetY: number;
}

const D4: DieShape = {
  id: 'd4',
  // Upward-pointing triangle. Text nudged down so it sits inside
  // the thicker base of the triangle rather than the thin tip.
  points: '0,-1 0.95,0.8 -0.95,0.8',
  color: '#d93025',
  textOffsetY: 0.28,
};

const D6: DieShape = {
  id: 'd6',
  // Slightly inset square so the stroke doesn't cut off at the edges.
  points: '-0.92,-0.92 0.92,-0.92 0.92,0.92 -0.92,0.92',
  color: '#e65100',
  textOffsetY: 0,
};

const D8: DieShape = {
  id: 'd8',
  // Square rotated 45° → diamond silhouette (the classic d8 profile).
  points: '0,-1 1,0 0,1 -1,0',
  color: '#f9a825',
  textOffsetY: 0,
};

const D10: DieShape = {
  id: 'd10',
  // Kite-shaped pentagon — longer on top and bottom, pinched on the
  // sides. Reads as "d10" because real d10s have a similar profile.
  points: '0,-1 0.85,-0.2 0.55,0.95 -0.55,0.95 -0.85,-0.2',
  color: '#2e7d32',
  textOffsetY: 0.05,
};

const D12: DieShape = {
  id: 'd12',
  // Regular pentagon. Wider than the d10, less pinched.
  points: '0,-1 0.95,-0.31 0.59,0.81 -0.59,0.81 -0.95,-0.31',
  color: '#00838f',
  textOffsetY: 0.15,
};

const D20: DieShape = {
  id: 'd20',
  // Regular hexagon (pointy-top) — the classic d20 silhouette when
  // viewed from a corner.
  points: '0,-1 0.87,-0.5 0.87,0.5 0,1 -0.87,0.5 -0.87,-0.5',
  color: '#1a73e8',
  textOffsetY: 0,
};

const D100: DieShape = {
  id: 'd100',
  // Regular octagon — distinct from d20's hexagon, reads as "bigger /
  // rounder." We treat d100 as a single die showing 0-99 (rather than
  // rolling it as 2×d10 tens+ones, which the parser doesn't do anyway).
  points:
    '-0.38,-0.92 0.38,-0.92 0.92,-0.38 0.92,0.38 0.38,0.92 -0.38,0.92 -0.92,0.38 -0.92,-0.38',
  color: '#6a1b9a',
  textOffsetY: 0,
};

const FALLBACK: DieShape = {
  id: 'other',
  points: '0,-1 0.87,-0.5 0.87,0.5 0,1 -0.87,0.5 -0.87,-0.5',
  color: '#546e7a',
  textOffsetY: 0,
};

const STANDARD_SHAPES: Record<number, DieShape> = {
  4: D4,
  6: D6,
  8: D8,
  10: D10,
  12: D12,
  20: D20,
  100: D100,
};

/**
 * Look up the polygon spec for a die with `sides` faces. Non-standard
 * sides (e.g. `d7`, `d30` from homebrew) fall back to a generic
 * hexagon so the animation still runs — just without a distinctive
 * silhouette.
 */
export function shapeForSides(sides: number): DieShape {
  return STANDARD_SHAPES[sides] ?? FALLBACK;
}

/**
 * Return the full list of face values for a die — `[1, 2, ..., sides]`
 * for standard dice, empty for degenerate / malformed sides.
 *
 * Used by the tumble-phase face cycler: during the tumble the
 * displayed number changes to a random member of this list every
 * ~60ms, then locks to the real rolled value on settle.
 */
export function faceValues(sides: number): number[] {
  if (!Number.isFinite(sides) || sides < 1) return [];
  const max = Math.min(9999, Math.floor(sides));
  const out: number[] = new Array(max);
  for (let i = 0; i < max; i++) out[i] = i + 1;
  return out;
}

/**
 * Pick a random face value for a die with `sides` faces. Injectable
 * `rng` for tests. Returns 0 for invalid input (matches the d100
 * convention of "00" being a valid face).
 */
export function randomFace(sides: number, rng: () => number = Math.random): number {
  if (!Number.isFinite(sides) || sides < 1) return 0;
  return Math.floor(rng() * Math.floor(sides)) + 1;
}

/**
 * Format a face value as its display label.
 *
 * - d100: show as 2-digit zero-padded ("05", "99", "00" for the
 *   max face — some tables play 100-as-0).
 * - Everything else: the number itself.
 */
export function faceLabel(sides: number, value: number): string {
  if (sides === 100) {
    const v = value % 100;
    return v.toString().padStart(2, '0');
  }
  return String(value);
}

/** Flat roll record suitable for driving one die's animation timeline. */
export interface FlatRoll {
  /** Die size (4, 6, 8, 10, 12, 20, 100, or non-standard). */
  sides: number;
  /** The actual rolled value that will settle. */
  value: number;
  /** `false` when this roll was dropped by a keep-highest/lowest filter. */
  kept: boolean;
  /** `+1` or `-1` — how this die's value contributes to the total. */
  sign: 1 | -1;
}

/**
 * Expand a dice-roll result's `groups` array into a flat list of
 * individual dice, in roll order. `4d6kh3` produces 4 FlatRolls,
 * one per die, with `kept: false` on the dropped one. The renderer
 * draws each as a separate polygon silhouette so the GM can see
 * which die got dropped.
 */
export function flattenGroups(
  groups: ReadonlyArray<{
    sides: number;
    sign: 1 | -1;
    rolls: readonly number[];
    kept: readonly boolean[];
  }>,
): FlatRoll[] {
  const out: FlatRoll[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.rolls.length; i++) {
      out.push({
        sides: g.sides,
        value: g.rolls[i]!,
        kept: g.kept[i] ?? true,
        sign: g.sign,
      });
    }
  }
  return out;
}

/**
 * Given a rolled value, pick a "tumble schedule" of random face
 * values for the animation. We want:
 *   - The sequence NOT to include the final value as its second-
 *     to-last frame (otherwise the settle looks like no-op).
 *   - Enough variety (~10 frames) that the tumble reads as random.
 *
 * Injectable `rng` for tests; defaults to `Math.random`.
 */
export function buildTumbleFrames(
  sides: number,
  finalValue: number,
  frameCount = 10,
  rng: () => number = Math.random,
): number[] {
  const frames: number[] = [];
  if (frameCount <= 0) return frames;
  const possible = faceValues(sides);
  // Degenerate: only one face (e.g. d1) → return the final value N times.
  if (possible.length <= 1) {
    for (let i = 0; i < frameCount; i++) frames.push(finalValue);
    return frames;
  }
  for (let i = 0; i < frameCount; i++) {
    let candidate: number;
    let attempts = 0;
    do {
      candidate = randomFace(sides, rng);
      attempts++;
      // Avoid repeating the previous frame (visual boringness) AND
      // avoid matching the final value on the last tumble frame
      // (so the settle is a visible "change").
      if (attempts > 10) break;
    } while (
      (i > 0 && candidate === frames[i - 1]) ||
      (i === frameCount - 1 && candidate === finalValue)
    );
    frames.push(candidate);
  }
  return frames;
}
