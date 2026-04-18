import type { AoeTemplate, SessionState, ViewMode } from '../state/types.js';
import { isAoeVisible } from '../input/hit-test-aoe.js';
import type { DragOverlay } from '../input/context.js';

const DRAG_GHOST_ALPHA = 0.6;

export interface AoeRenderOptions {
  mode: ViewMode;
  highlightIds: ReadonlySet<string>;
  preview?: AoePreview | null;
  dragOverlay?: DragOverlay | null;
}

/** A live (un-committed) AoE being dragged by the user. */
export interface AoePreview extends Omit<AoeTemplate, 'id' | 'visibility'> {}

function withOverlay(t: AoeTemplate, overlay: DragOverlay | null | undefined): AoeTemplate {
  if (!overlay || !overlay.ids.includes(t.id)) return t;
  if (overlay.deltaX === 0 && overlay.deltaY === 0) return t;
  return { ...t, x: t.x + overlay.deltaX, y: t.y + overlay.deltaY };
}

export function drawAoeTemplates(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  options: AoeRenderOptions,
): void {
  const { cols, rows, cellSize } = state.grid;
  const overlay = options.dragOverlay ?? null;
  const isActiveOverlay =
    overlay !== null && (overlay.deltaX !== 0 || overlay.deltaY !== 0);
  for (const t of state.aoeTemplates) {
    if (!isAoeVisible(t, state.fog, cols, rows, cellSize, options.mode)) continue;
    const display = withOverlay(t, overlay);
    const isDragged = isActiveOverlay && overlay!.ids.includes(t.id);
    drawAoe(ctx, display, {
      highlighted: options.highlightIds.has(t.id),
      gmOnly: t.visibility === 'gm',
      isPreview: false,
      isDragged,
    });
  }
  if (options.preview) {
    drawAoe(ctx, options.preview, {
      highlighted: false,
      gmOnly: false,
      isPreview: true,
      isDragged: false,
    });
  }
}

interface DrawFlags {
  highlighted: boolean;
  gmOnly: boolean;
  isPreview: boolean;
  isDragged: boolean;
}

function drawAoe(
  ctx: CanvasRenderingContext2D,
  t: Omit<AoeTemplate, 'id' | 'visibility'>,
  flags: DrawFlags,
): void {
  ctx.save();
  if (flags.isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;
  ctx.fillStyle = t.color;
  ctx.strokeStyle = t.color;
  ctx.lineWidth = 2;
  const baseAlpha = flags.isPreview ? 0.35 : 0.28;
  ctx.globalAlpha = flags.isDragged ? DRAG_GHOST_ALPHA * baseAlpha : baseAlpha;

  switch (t.kind) {
    case 'sphere':
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, t.length), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.stroke();
      break;
    case 'cone': {
      const halfRad = ((t.width / 2) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.arc(t.x, t.y, Math.max(1, t.length), t.rotation - halfRad, t.rotation + halfRad);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.stroke();
      break;
    }
    case 'line': {
      const thickness = Math.max(2, t.width);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.fillRect(0, -thickness / 2, Math.max(1, t.length), thickness);
      ctx.globalAlpha = 0.95;
      ctx.strokeRect(0, -thickness / 2, Math.max(1, t.length), thickness);
      ctx.restore();
      break;
    }
    case 'cube': {
      const w = Math.max(1, t.length);
      const h = Math.max(1, t.width);
      ctx.fillRect(t.x, t.y, w, h);
      ctx.globalAlpha = 0.95;
      ctx.strokeRect(t.x, t.y, w, h);
      break;
    }
  }

  // GM-only indicator: dashed inner ring/box
  if (flags.gmOnly) {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    strokeOutline(ctx, t);
    ctx.restore();
  }

  // Selection highlight
  if (flags.highlighted) {
    ctx.save();
    ctx.strokeStyle = '#ffd966';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    strokeOutline(ctx, t, 4);
    ctx.restore();
  }

  // Anchor dot
  if (!flags.isPreview) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(anchorX(t), anchorY(t), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.stroke();
  }

  ctx.restore();
}

function anchorX(t: Omit<AoeTemplate, 'id' | 'visibility'>): number {
  if (t.kind === 'cube') return t.x + t.length / 2;
  return t.x;
}
function anchorY(t: Omit<AoeTemplate, 'id' | 'visibility'>): number {
  if (t.kind === 'cube') return t.y + t.width / 2;
  return t.y;
}

function strokeOutline(
  ctx: CanvasRenderingContext2D,
  t: Omit<AoeTemplate, 'id' | 'visibility'>,
  pad = 0,
): void {
  switch (t.kind) {
    case 'sphere':
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, t.length + pad), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'cone': {
      const halfRad = ((t.width / 2) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.arc(
        t.x,
        t.y,
        Math.max(1, t.length + pad),
        t.rotation - halfRad,
        t.rotation + halfRad,
      );
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'line': {
      const thickness = Math.max(2, t.width) + pad * 2;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.strokeRect(-pad, -thickness / 2, Math.max(1, t.length + pad * 2), thickness);
      ctx.restore();
      break;
    }
    case 'cube':
      ctx.strokeRect(
        t.x - pad,
        t.y - pad,
        Math.max(1, t.length + pad * 2),
        Math.max(1, t.width + pad * 2),
      );
      break;
  }
}
