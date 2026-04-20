import type { ID, SessionState, Token, ViewMode } from '../state/types.js';
import type { ImageProvider } from './layer-background.js';
import type { LabelSize } from '../state/preferences.js';
import { shapeForBorderColor, type MarkerShape } from '../state/team-colors.js';
import { isTokenFullyHidden } from './fog-visibility.js';
import type { DragOverlay } from '../input/context.js';
import { hpBarColor, hpFraction } from '../state/token-hp.js';
import { getConditionPreset } from '../state/conditions.js';

const NO_IMAGE: ImageProvider = () => null;

const LABEL_SIZE_MULTIPLIER: Record<LabelSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};

export interface TokenRenderOptions {
  labelSize: LabelSize;
  showColorblindMarkers: boolean;
  mode: ViewMode;
  dragOverlay?: DragOverlay | null;
  activeInitiativeTokenId?: ID | null;
}

const DEFAULT_OPTIONS: TokenRenderOptions = {
  labelSize: 'medium',
  showColorblindMarkers: false,
  mode: 'gm',
};

function withOverlay(
  token: Token,
  overlay: DragOverlay | null | undefined,
  cellSize: number,
): Token {
  if (!overlay || !overlay.ids.includes(token.id)) return token;
  if (overlay.deltaX === 0 && overlay.deltaY === 0) return token;
  return {
    ...token,
    x: token.x + overlay.deltaX / cellSize,
    y: token.y + overlay.deltaY / cellSize,
  };
}

export function drawTokens(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  highlightIds: ReadonlySet<ID>,
  getImage: ImageProvider = NO_IMAGE,
  options: TokenRenderOptions = DEFAULT_OPTIONS,
): void {
  const { cellSize } = state.grid;
  const labelScale = LABEL_SIZE_MULTIPLIER[options.labelSize];
  const overlay = options.dragOverlay ?? null;
  const draggedIds =
    overlay && (overlay.deltaX !== 0 || overlay.deltaY !== 0) ? overlay.ids : [];

  const unselected: Token[] = [];
  const selected: Token[] = [];
  for (const t of state.tokens) {
    if (options.mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    const display = withOverlay(t, overlay, cellSize);
    if (highlightIds.has(t.id)) selected.push(display);
    else unselected.push(display);
  }

  function isDragged(t: Token): boolean {
    return draggedIds.includes(t.id);
  }

  const activeId = options.activeInitiativeTokenId ?? null;

  for (const t of unselected) {
    drawTokenBody(
      ctx,
      t,
      cellSize,
      false,
      getImage,
      options.showColorblindMarkers,
      isDragged(t),
      t.id === activeId,
    );
  }
  for (const t of selected) {
    drawTokenBody(
      ctx,
      t,
      cellSize,
      true,
      getImage,
      options.showColorblindMarkers,
      isDragged(t),
      t.id === activeId,
    );
  }
  for (const t of unselected) {
    drawTokenLabel(ctx, t, cellSize, labelScale, false, isDragged(t));
  }
  for (const t of selected) {
    drawTokenLabel(ctx, t, cellSize, labelScale, true, isDragged(t));
  }
  // HP bars and condition chips live on top of labels / active-turn rings so
  // they remain legible regardless of layering beneath.
  for (const t of state.tokens) {
    if (options.mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    const display = withOverlay(t, overlay, cellSize);
    drawTokenStatus(ctx, display, cellSize, options.mode, labelScale, isDragged(t));
  }
}

const DRAG_GHOST_ALPHA = 0.6;

function drawTokenBody(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  highlighted: boolean,
  getImage: ImageProvider,
  showMarkers: boolean,
  isDragged: boolean,
  activeTurn: boolean,
): void {
  const cx = (t.x + t.size / 2) * cellSize;
  const cy = (t.y + t.size / 2) * cellSize;
  const r = (t.size * cellSize) / 2 - 4;

  ctx.save();
  if (isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;

  const img = t.imageId ? getImage(t.imageId) : null;

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = t.color;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.stroke();

  if (t.borderColor) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = t.borderColor;
    ctx.stroke();
  }

  // Facing notch — a small outward wedge at the token's rotation angle.
  // Only drawn for rotated tokens, so unrotated tokens stay visually clean.
  if (t.rotation !== 0) {
    drawFacingNotch(ctx, cx, cy, r, t.rotation, t.borderColor);
  }

  if (activeTurn) {
    const ar = r + (t.borderColor ? 7 : 4);
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffb300';
    ctx.shadowColor = 'rgba(255, 179, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, ar, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (highlighted) {
    const hr = r + (t.borderColor ? 6 : 3) + (activeTurn ? 4 : 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd966';
    ctx.beginPath();
    ctx.arc(cx, cy, hr, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (showMarkers && t.borderColor) {
    const shape = shapeForBorderColor(t.borderColor);
    if (shape) {
      const markerCx = cx + r * 0.72;
      const markerCy = cy - r * 0.72;
      const markerR = Math.max(7, r * 0.24);
      drawMarker(ctx, shape, markerCx, markerCy, markerR, t.borderColor);
    }
  }
  ctx.restore();
}

function drawTokenLabel(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  labelScale: number,
  selected: boolean,
  isDragged: boolean,
): void {
  const cx = (t.x + t.size / 2) * cellSize;
  const cy = (t.y + t.size / 2) * cellSize;
  const r = (t.size * cellSize) / 2 - 4;

  ctx.save();
  if (isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;

  const baseFontSize = Math.max(11, cellSize * 0.22);
  const fontSize = baseFontSize * labelScale;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(t.label);
  const padX = 6;
  const padY = 3;
  const labelW = metrics.width + padX * 2;
  const labelH = fontSize + padY * 2;
  const labelX = cx - labelW / 2;
  const labelY = cy + r + (t.borderColor ? 8 : 6);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  roundRect(ctx, labelX, labelY, labelW, labelH, 3);
  ctx.fill();

  if (selected) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffd966';
    roundRect(ctx, labelX, labelY, labelW, labelH, 3);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillText(t.label, cx, labelY + padY);

  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  shape: MarkerShape,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.92, cy + r * 0.7);
      ctx.lineTo(cx - r * 0.92, cy + r * 0.7);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8);
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
    case 'circle':
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

/**
 * Draw HP bar + numeric readout (below the label) and condition chips
 * (above the token). Called once per token after body + label layers so
 * status glyphs always sit on top.
 */
function drawTokenStatus(
  ctx: CanvasRenderingContext2D,
  t: Token,
  cellSize: number,
  mode: ViewMode,
  labelScale: number,
  isDragged: boolean,
): void {
  ctx.save();
  if (isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;

  const cx = (t.x + t.size / 2) * cellSize;
  const cy = (t.y + t.size / 2) * cellSize;
  const r = (t.size * cellSize) / 2 - 4;

  // Conditions chip row — drawn above the token, left-to-right.
  if (t.conditions.length > 0) {
    const chipR = Math.max(5, cellSize * 0.09);
    const gap = chipR * 0.5;
    const total = t.conditions.length;
    const rowWidth = total * (chipR * 2) + (total - 1) * gap;
    let x = cx - rowWidth / 2 + chipR;
    const y = cy - r - chipR - 4;
    for (const id of t.conditions) {
      const preset = getConditionPreset(id);
      const color = preset?.color ?? '#888888';
      ctx.beginPath();
      ctx.arc(x, y, chipR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.stroke();
      // Show glyph at larger scales only (otherwise it's unreadable).
      if (chipR >= 9 && preset) {
        const fontSize = Math.max(8, chipR * 1.0);
        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Pick white or black text for contrast against the chip color.
        ctx.fillStyle = preferBlackText(color) ? '#000' : '#fff';
        ctx.fillText(preset.symbol, x, y);
      }
      x += chipR * 2 + gap;
    }
  }

  // HP bar + readout — drawn below the label.
  if (t.hp) {
    // Players see shared HP only; GM always sees it. Spectator sees shared HP
    // as exact numbers; gm-only HP still occupies the layout slot on GM view
    // so batch-editing tokens doesn't look jarring.
    const isSharedOrGm = mode === 'gm' || t.hp.visibility === 'shared';
    if (isSharedOrGm) {
      const baseFontSize = Math.max(11, cellSize * 0.22);
      const labelH = baseFontSize * labelScale + 6;
      const barW = Math.max(cellSize * 0.8 * t.size, 36);
      const barH = Math.max(5, cellSize * 0.07);
      const barX = cx - barW / 2;
      const barY = cy + r + (t.borderColor ? 8 : 6) + labelH + 4;

      // Bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      roundRect(ctx, barX, barY, barW, barH, 2);
      ctx.fill();

      // Bar fill
      const frac = hpFraction(t.hp);
      ctx.fillStyle = hpBarColor(frac);
      roundRect(ctx, barX + 1, barY + 1, (barW - 2) * frac, barH - 2, 1.5);
      ctx.fill();

      // Outline
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      roundRect(ctx, barX, barY, barW, barH, 2);
      ctx.stroke();

      // Numeric readout
      const hpFontSize = Math.max(10, cellSize * 0.16) * labelScale;
      ctx.font = `600 ${hpFontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      const text = `${t.hp.current} / ${t.hp.max}`;
      const textY = barY + barH + 2;
      ctx.strokeText(text, cx, textY);
      ctx.fillText(text, cx, textY);

      // GM-only tag so the GM knows players can't see it.
      if (t.hp.visibility === 'gm' && mode === 'gm') {
        ctx.font = `600 ${hpFontSize * 0.7}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 179, 0, 0.9)';
        ctx.fillText('(GM)', cx, textY + hpFontSize + 1);
      }
    }
  }

  ctx.restore();
}

/**
 * Draw a small outward-pointing triangle at the token's facing angle.
 * `rotation` is measured clockwise from "up" (negative Y), so the tip
 * sits at angle `(rotation - π/2)` in canvas standard coordinates.
 */
function drawFacingNotch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
  borderColor: string | null,
): void {
  const tipR = r + (borderColor ? 6 : 4);
  const baseR = r + 1;
  const halfWidth = Math.max(4, r * 0.22);
  // Canvas-standard angle: 0 = +X, π/2 = +Y. Our rotation = 0 means
  // "facing up" (negative Y), i.e. canvas angle -π/2.
  const angle = rotation - Math.PI / 2;
  const tipX = cx + Math.cos(angle) * tipR;
  const tipY = cy + Math.sin(angle) * tipR;
  // Left/right base points, perpendicular to the facing direction.
  const leftA = angle + Math.PI / 2;
  const rightA = angle - Math.PI / 2;
  const blx = cx + Math.cos(angle) * baseR + Math.cos(leftA) * halfWidth;
  const bly = cy + Math.sin(angle) * baseR + Math.sin(leftA) * halfWidth;
  const brx = cx + Math.cos(angle) * baseR + Math.cos(rightA) * halfWidth;
  const bry = cy + Math.sin(angle) * baseR + Math.sin(rightA) * halfWidth;

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(blx, bly);
  ctx.lineTo(brx, bry);
  ctx.closePath();
  ctx.fillStyle = borderColor ?? '#ffd966';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.stroke();
}

/** Hex color → should we use dark text on top for contrast? */
function preferBlackText(hex: string): boolean {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Relative luminance (simplified)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 160;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
