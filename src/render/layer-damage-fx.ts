/**
 * Phase 77 — floating damage / heal numbers above tokens.
 *
 * Renders one number per active effect. The number rises ~30px while
 * fading out over ~1.4s. Damage = red, heal = green. Black stroke
 * around the text so the number stays legible against any token /
 * background combination.
 *
 * Effects are pruned by the manager (`createDamageFxManager`); this
 * layer is purely visual.
 */

import type { Token } from '../state/types.js';
import {
  DAMAGE_FX_DURATION_MS,
  DAMAGE_FX_RISE_PX,
  type DamageFx,
} from '../state/damage-fx-manager.js';

const DAMAGE_COLOR = '#ef5350';
const HEAL_COLOR = '#66bb6a';
const STROKE_COLOR = 'rgba(0, 0, 0, 0.85)';
const FONT = 'bold 22px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export function drawDamageFx(
  ctx: CanvasRenderingContext2D,
  fxs: readonly DamageFx[],
  tokens: readonly Token[],
  cellSize: number,
  now: number,
): void {
  if (fxs.length === 0) return;

  // Build a tokenId → token lookup once per frame so the inner loop
  // stays O(n + m), not O(n*m).
  const byId = new Map<string, Token>();
  for (const t of tokens) byId.set(t.id, t);

  ctx.save();
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;

  for (const fx of fxs) {
    const t = byId.get(fx.tokenId);
    if (!t) continue;
    const elapsed = now - fx.startedAt;
    const progress = Math.min(1, Math.max(0, elapsed / DAMAGE_FX_DURATION_MS));
    if (progress >= 1) continue;

    // Eased fade — keep the number fully visible for the first ~30%
    // of the lifetime, then fade out smoothly.
    const fade =
      progress < 0.3 ? 1 : 1 - (progress - 0.3) / 0.7;
    // Eased rise — slight ease-out so the number decelerates as it
    // floats up. Looks more "settled" than a linear rise.
    const easedRise = 1 - Math.pow(1 - progress, 2);

    const isHeal = fx.amount < 0;
    const magnitude = Math.abs(fx.amount);
    const label = isHeal ? `+${magnitude}` : `−${magnitude}`;
    const color = isHeal ? HEAL_COLOR : DAMAGE_COLOR;

    // Token center → top edge → above the token (with the rise).
    const cx = (t.x + t.size / 2) * cellSize;
    const topY = t.y * cellSize;
    const y = topY - 6 - easedRise * DAMAGE_FX_RISE_PX;

    ctx.globalAlpha = fade;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.fillStyle = color;
    ctx.strokeText(label, cx, y);
    ctx.fillText(label, cx, y);
  }

  ctx.restore();
}
