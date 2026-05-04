import type { Ping } from '../state/ping-manager.js';
import { PING_DURATION_MS } from '../state/ping-manager.js';

export function drawPings(
  ctx: CanvasRenderingContext2D,
  pings: readonly Ping[],
  cellSize: number,
  now: number,
): void {
  for (const p of pings) {
    const elapsed = now - p.startedAt;
    if (elapsed < 0 || elapsed > PING_DURATION_MS) continue;
    const t = elapsed / PING_DURATION_MS;
    const radius = cellSize * (0.3 + t * 1.2);
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot for quick eye anchor
    ctx.globalAlpha = Math.max(0, alpha - 0.15);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cellSize * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Phase 146 — sender attribution pill above the ping. Drawn at
    // a separate alpha (slower fade) so the name stays readable for
    // most of the ping's lifetime even as the ring expands + fades.
    if (p.senderName) {
      const labelAlpha = Math.max(0, 1 - t * 0.7);
      ctx.globalAlpha = labelAlpha;
      const fontSize = Math.max(10, cellSize * 0.18);
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      const metrics = ctx.measureText(p.senderName);
      const padX = 6;
      const padY = 3;
      const w = metrics.width + padX * 2;
      const h = fontSize + padY * 2;
      const tx = p.x - w / 2;
      const ty = p.y - radius - h - 4;
      ctx.fillStyle = p.color;
      // Rounded rectangle pill background.
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(tx + r, ty);
      ctx.lineTo(tx + w - r, ty);
      ctx.quadraticCurveTo(tx + w, ty, tx + w, ty + r);
      ctx.lineTo(tx + w, ty + h - r);
      ctx.quadraticCurveTo(tx + w, ty + h, tx + w - r, ty + h);
      ctx.lineTo(tx + r, ty + h);
      ctx.quadraticCurveTo(tx, ty + h, tx, ty + h - r);
      ctx.lineTo(tx, ty + r);
      ctx.quadraticCurveTo(tx, ty, tx + r, ty);
      ctx.closePath();
      ctx.fill();
      // White-or-black text for contrast against the ping's color.
      ctx.fillStyle = preferBlackText(p.color) ? '#000' : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.senderName, p.x, ty + h / 2);
    }

    ctx.restore();
  }
}

/**
 * Phase 146 — pick black or white text for the pill label based on
 * the ping color's perceived brightness. Same heuristic
 * `layer-tokens.ts` uses for token labels (kept inline here so the
 * pings layer doesn't pull a dep on the tokens layer).
 */
function preferBlackText(hex: string): boolean {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  // Luma per ITU-R BT.601 — same formula `theme-contrast.ts` uses.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6;
}
