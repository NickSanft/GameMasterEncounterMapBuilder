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
    ctx.restore();
  }
}
