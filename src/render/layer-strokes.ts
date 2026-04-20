import type { DrawStroke, ViewMode } from '../state/types.js';

export interface StrokesRenderOptions {
  mode: ViewMode;
  /** In-progress (not yet committed) stroke overlay. */
  preview?: DrawStroke | null;
}

/**
 * Render freehand strokes above the annotation layer. GM-only strokes
 * are skipped on the Spectator canvas and drawn with a dashed outline
 * on the GM canvas so the GM can see at a glance what the players can't.
 */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly DrawStroke[],
  options: StrokesRenderOptions,
): void {
  for (const stroke of strokes) {
    if (options.mode === 'spectator' && stroke.visibility === 'gm') continue;
    drawSingleStroke(ctx, stroke, options.mode, /* isPreview */ false);
  }
  if (options.preview) {
    drawSingleStroke(ctx, options.preview, options.mode, /* isPreview */ true);
  }
}

function drawSingleStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  mode: ViewMode,
  isPreview: boolean,
): void {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(0.5, stroke.width);
  ctx.globalAlpha = isPreview ? 0.8 : 1;

  // GM-only: draw a dashed halo underneath in a subtle way so the GM can
  // identify which strokes are hidden from players.
  if (mode === 'gm' && stroke.visibility === 'gm' && !isPreview) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(0.5, stroke.width + 3);
    drawStrokePath(ctx, stroke.points);
    ctx.restore();
  }

  drawStrokePath(ctx, stroke.points);

  // Single-point "dot" strokes need a filled circle — stroking a
  // zero-length path produces nothing.
  if (stroke.points.length === 1) {
    const p = stroke.points[0]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.75, stroke.width / 2), 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
  }

  ctx.restore();
}

function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  // Basic polyline — rounded joins + caps make this look smooth without
  // a full bezier pass.
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}
