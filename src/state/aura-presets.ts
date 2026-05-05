/**
 * Phase 159 — aura presets.
 *
 * A canonical list of common D&D 5e (and similar TTRPG) auras the
 * GM can stamp onto a token without having to type the radius / color
 * / label every time. The values match the 5e SRD where possible
 * (Bless / Spirit Guardians / Aura of Protection / Bardic Inspiration);
 * the colors are intentionally distinct from each other so multiple
 * stacked auras stay legible.
 *
 * Pure data + a tiny "build a fresh aura instance" factory. The
 * editor adds a new aura to the token by calling
 * `instantiateAuraPreset(preset)` — that produces a brand-new id,
 * matching the `Aura` interface in `state/types.ts`. Each call
 * returns a fresh object so consecutive stamps don't collide.
 */

import type { Aura } from './types.js';
import { nid } from '../util/id.js';

/**
 * A reusable aura template. `radiusFeet` keeps the spec grid-agnostic
 * — the editor converts it to world pixels using the active grid's
 * `feetPerSquare`. `visibility` defaults to `'shared'` because the
 * common case is "everyone at the table sees the radius" — a GM can
 * still flip it to `'gm'` after stamping.
 */
export interface AuraPreset {
  /** Stable id used as the dropdown's option value. */
  id: string;
  /** Display label in the picker + on the aura ring tag. */
  label: string;
  /** Radius in feet. Editor converts via `feetPerSquare`. */
  radiusFeet: number;
  /** Hex `#RRGGBB`. Picked to be distinct across the preset set. */
  color: string;
  /**
   * Default visibility for new instances. `'shared'` shows on both
   * GM and Spectator canvases; `'gm'` is GM-only.
   */
  visibility: 'gm' | 'shared';
}

export const AURA_PRESETS: readonly AuraPreset[] = [
  {
    id: 'bless',
    label: 'Bless',
    radiusFeet: 30,
    color: '#4fc3f7',
    visibility: 'shared',
  },
  {
    id: 'bane',
    label: 'Bane',
    radiusFeet: 30,
    color: '#7e57c2',
    visibility: 'shared',
  },
  {
    id: 'spirit-guardians',
    label: 'Spirit Guardians',
    radiusFeet: 15,
    color: '#ffd54f',
    visibility: 'shared',
  },
  {
    id: 'aura-of-protection',
    label: 'Aura of Protection',
    radiusFeet: 10,
    color: '#ffb74d',
    visibility: 'shared',
  },
  {
    id: 'aura-of-courage',
    label: 'Aura of Courage',
    radiusFeet: 10,
    color: '#ff8a65',
    visibility: 'shared',
  },
  {
    id: 'spirit-shroud',
    label: 'Spirit Shroud',
    radiusFeet: 10,
    color: '#5c6bc0',
    visibility: 'shared',
  },
  {
    id: 'darkness',
    label: 'Darkness',
    radiusFeet: 15,
    color: '#212121',
    visibility: 'shared',
  },
  {
    id: 'daylight',
    label: 'Daylight',
    radiusFeet: 60,
    color: '#fff59d',
    visibility: 'shared',
  },
];

/**
 * Build a fresh `Aura` instance from a preset, given the current
 * grid's `feetPerSquare` and `cellSize` so the radius converts to
 * world pixels (the in-memory representation `Aura.radius` uses).
 *
 * Each call mints a new `id` so consecutive stamps of the same
 * preset don't collide on the token's auras list.
 */
export function instantiateAuraPreset(
  preset: AuraPreset,
  feetPerSquare: number,
  cellSize: number,
): Aura {
  const radiusPx = (preset.radiusFeet / feetPerSquare) * cellSize;
  return {
    id: nid(),
    label: preset.label,
    radius: radiusPx,
    color: preset.color,
    visibility: preset.visibility,
  };
}
