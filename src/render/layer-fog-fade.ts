/**
 * Phase 78 — fog-reveal fade-in overlay.
 *
 * Drawn AFTER `drawFog` so the cells we paint sit on top of the
 * (already-revealed → transparent) base. For each in-flight fade,
 * we draw a darkening square at the cell position with an alpha that
 * eases from 1 (fully dark, indistinguishable from un-revealed fog)
 * down to 0 (fully transparent, baseline). Net visual: the reveal
 * "blooms in" instead of cutting.
 *
 * The fill color matches the host canvas's "un-revealed" appearance:
 *   - Spectator: solid black (the same color the base fog layer paints
 *     for hidden cells).
 *   - GM: the GM's chosen fog tint at the configured opacity (so the
 *     fade matches the surrounding fog as it dissolves).
 *
 * Reduced-motion: caller sets `fadeMs` to 0 (the fade renders nothing).
 * That's the only knob — we don't gate inside the layer.
 */

import { FOG_FADE_MS, type FogFadeCell } from './fog-fade-tracker.js';

export interface FogFadeRenderOptions {
  /** Tint color for the fading overlay (same as the base-fog tint). */
  color: string;
  /** Base opacity at progress=0. For Spectator pass 1; for GM pass `gmOpacity`. */
  baseOpacity: number;
  /** Override for reduced-motion (pass 0 to disable). Defaults to FOG_FADE_MS. */
  fadeMs?: number;
}

export function drawFogFade(
  ctx: CanvasRenderingContext2D,
  cells: readonly FogFadeCell[],
  cellSize: number,
  now: number,
  options: FogFadeRenderOptions,
): void {
  if (cells.length === 0) return;
  const fadeMs = options.fadeMs ?? FOG_FADE_MS;
  if (fadeMs <= 0) return;

  ctx.save();
  ctx.fillStyle = options.color;
  for (const c of cells) {
    const elapsed = now - c.startedAt;
    if (elapsed >= fadeMs) continue;
    if (elapsed < 0) continue; // clock-skew safety
    const t = elapsed / fadeMs;
    // Ease-out cubic: stays dark a moment, then fades quickly. Reads
    // as a "bloom in" rather than a linear ramp.
    const eased = 1 - Math.pow(1 - t, 3);
    const alpha = options.baseOpacity * (1 - eased);
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillRect(c.x * cellSize, c.y * cellSize, cellSize, cellSize);
  }
  ctx.restore();
}
