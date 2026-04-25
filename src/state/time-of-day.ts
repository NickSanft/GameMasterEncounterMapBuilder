/**
 * Phase 80 — time-of-day tint palette + helpers.
 *
 * Pure module — no DOM. The renderer composes the result on top of
 * the existing scene layers; the GM-side picker imports `TIME_LABELS`
 * to populate its `<option>`s; tests pin the palette mappings.
 *
 * Each tint is a {color, opacity} pair. The renderer's existing
 * `drawSceneTint` helper accepts those directly. `'none'` and `'day'`
 * both mean "no overlay" — we keep them distinct so the dropdown
 * value reflects user intent ("scene is at midday" vs "scene has
 * no time set").
 *
 * Why no `'day'` overlay? A noticeable midday tint over an already-
 * light map would just wash it out. The "day" choice is preserved
 * as a labeling option (so the GM can mark "yes, this is daytime"
 * for clarity) but renders as a no-op.
 */

import type { TimeOfDay } from './types.js';

export interface TimeTint {
  color: string;
  opacity: number;
}

/** Visual tint per kind. `none` and `day` are no-ops. */
export const TIME_TINTS: Record<TimeOfDay, TimeTint | null> = {
  none: null,
  day: null,
  // Warm orange-pink with a hint of yellow — that "first light" feel.
  dawn: { color: '#ff9966', opacity: 0.18 },
  // Deeper orange-red — the long shadows of late afternoon.
  dusk: { color: '#d35400', opacity: 0.22 },
  // Deep cool blue — moonlight + shadow. A notch heavier so the
  // contrast against tokens reads as "we're in the dark."
  night: { color: '#0e1a3a', opacity: 0.42 },
};

/** Display label for the GM-side picker dropdown. */
export const TIME_LABELS: Record<TimeOfDay, string> = {
  none: 'No time set',
  dawn: 'Dawn',
  day: 'Day',
  dusk: 'Dusk',
  night: 'Night',
};

/**
 * Resolve the renderable tint for a `TimeOfDay`. Returns `null` for
 * kinds that should skip the tint pass entirely.
 */
export function tintFor(time: TimeOfDay): TimeTint | null {
  return TIME_TINTS[time] ?? null;
}
