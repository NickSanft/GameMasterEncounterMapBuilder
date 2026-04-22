/**
 * GM-side lighting overlay (Phase 57).
 *
 * Each token with a `light` setting paints two halos onto the GM canvas:
 *
 *   - The outer (`dim`) radius — clipped by the worker-supplied
 *     visibility polygon so walls cast shadows. Painted as a faint warm
 *     fill so the GM can see "this is the edge of the lantern light."
 *   - The inner (`bright`) radius — same polygon clip but drawn as a
 *     simple filled circle, slightly more opaque. Lets the GM tell at
 *     a glance "the candle vs the lantern halo."
 *
 * The Spectator canvas does NOT call this layer — Spectator consumes
 * the lighting via `spectatorEffectiveFog` in the entry, which AND-masks
 * fog with the rasterized lighting polygons. Drawing translucent halos
 * on Spectator would defeat the point of fog masking (players would see
 * "there is darkness here" instead of just empty fog).
 *
 * No-ops when `polygons` is empty or `mode === 'spectator'` — keeps the
 * frame hot path zero-cost on legacy maps with no lights set up.
 */

import type { SessionState, ViewMode } from '../state/types.js';
import type { LosPoint } from '../state/los.js';

export interface LightingLayerOptions {
  mode: ViewMode;
  zoom: number;
  /**
   * One polygon per LIGHT source, in the same order as `collectLights`
   * yields them — i.e. `state.tokens.filter(t => t.light)`. The renderer
   * walks tokens to find each light's center + bright radius, then
   * intersects that with the matching polygon (so walls clip the bright
   * halo same as the dim halo).
   */
  polygons?: readonly (readonly LosPoint[])[] | null;
}

const DIM_OPACITY = 0.07;
const BRIGHT_OPACITY = 0.15;

export function drawLighting(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  options: LightingLayerOptions,
): void {
  if (options.mode !== 'gm') return;
  const polys = options.polygons;
  if (!polys || polys.length === 0) return;
  // Pair each polygon with its source token by walking the same filter
  // collectLights uses. If the two lists drift (e.g. a token was deleted
  // between the worker request and the response) we silently skip the
  // mismatch — the next frame's request will reconcile.
  const lightTokens = state.tokens.filter((t) => !!t.light);
  const cellSize = state.grid.cellSize;
  const count = Math.min(lightTokens.length, polys.length);
  if (count === 0) return;

  for (let i = 0; i < count; i++) {
    const t = lightTokens[i]!;
    const poly = polys[i]!;
    if (!t.light) continue;
    if (poly.length < 3) continue;
    const cx = (t.x + t.size / 2) * cellSize;
    const cy = (t.y + t.size / 2) * cellSize;
    const color = t.light.color || '#ffe1a4';

    // Build the polygon path once and clip against it for both halos.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0]!.x, poly[0]!.y);
    for (let j = 1; j < poly.length; j++) {
      const p = poly[j]!;
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();

    // Dim halo — fills the whole clipped polygon.
    ctx.globalAlpha = DIM_OPACITY;
    ctx.fillStyle = color;
    ctx.fill();

    // Bright halo — same color, slightly more opaque, but only the
    // bright-radius circle (also clipped by walls via the path above).
    if (t.light.bright > 0) {
      ctx.globalAlpha = BRIGHT_OPACITY;
      ctx.beginPath();
      ctx.arc(cx, cy, t.light.bright, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
