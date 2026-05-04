import type {
  GridConfig,
  ID,
  SessionState,
  Token,
  ViewMode,
} from '../state/types.js';
import type { ImageProvider } from './layer-background.js';
import type { LabelSize } from '../state/preferences.js';
import { shapeForBorderColor, type MarkerShape } from '../state/team-colors.js';
import { isTokenFullyHidden } from './fog-visibility.js';
import type { DragOverlay } from '../input/context.js';
import { hpBarColor, hpFraction } from '../state/token-hp.js';
import { getConditionPreset } from '../state/conditions.js';
import { drawConditionIcon } from './condition-icons.js';
import { groupTokensByStack } from '../state/token-stack.js';
import { tokenCenterWorld } from '../state/grid-coords.js';

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
  /**
   * Phase 126 — given an `ownerId` (a Spectator's playerId), return
   * the color tint to use for the owner-indicator dot painted on
   * owned tokens, or `null` if no color is known. Optional — when
   * absent, owned tokens still get a generic accent dot so the GM
   * can see "this is owned" at a glance.
   */
  getOwnerColor?: (ownerId: string) => string | null;
  /**
   * Phase 144 — when true, the active-turn ring renders at full
   * opacity (no pulse animation). Wired from `preferences.reducedMotion`
   * by the entries.
   */
  reducedMotion?: boolean;
  /**
   * Phase 144 — `performance.now()` at the start of the current
   * paint, used to drive the active-turn ring's sin-based pulse.
   * Optional; when omitted the ring renders at full opacity (same as
   * `reducedMotion: true`).
   */
  now?: number;
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

  // Phase 143 — three-bucket split. Pre-143 the loops walked
  //   { unselected → selected } for bodies + labels, then raw
  // `state.tokens` order for status + owner dots. The latter
  // meant a dragged token's HP / condition chips / owner indicator
  // could end up *underneath* an unselected token at the same
  // destination cell — the unselected token's status / owner pass
  // ran later in `state.tokens` order and painted on top of the
  // dragged ghost.
  //
  // Three buckets — `unselected`, `selectedNonDragged`, `dragged`
  // — make the dragged token paint LAST in every pass so nothing
  // overpaints it. The pass model (all bodies → all labels →
  // all status → all owners) is preserved so within-pass z-order
  // is unchanged for non-dragged tokens.
  const unselected: Token[] = [];
  const selectedNonDragged: Token[] = [];
  const dragged: Token[] = [];
  for (const t of state.tokens) {
    if (options.mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    const display = withOverlay(t, overlay, cellSize);
    if (draggedIds.includes(t.id)) dragged.push(display);
    else if (highlightIds.has(t.id)) selectedNonDragged.push(display);
    else unselected.push(display);
  }

  const activeId = options.activeInitiativeTokenId ?? null;
  // Phase 144 — pulse clock for the active-turn ring. `null` =
  // reduced-motion or no-clock caller (ring renders at full
  // opacity).
  const pulseTime: number | null =
    options.reducedMotion || typeof options.now !== 'number'
      ? null
      : options.now;

  // Phase 139 — auras render BELOW token bodies so the token icon
  // sits cleanly on top of its own emanation. GM-only auras are
  // hidden on the Spectator canvas (mirrors `visibility: 'gm'` for
  // walls + annotations).
  for (const t of state.tokens) {
    if (options.mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    if (t.auras.length === 0) continue;
    const display = withOverlay(t, overlay, cellSize);
    drawTokenAuras(ctx, display, state.grid, options.mode);
  }

  // Pass 1: bodies. unselected → selected → dragged.
  for (const t of unselected) {
    drawTokenBody(
      ctx, t, state.grid, false, getImage,
      options.showColorblindMarkers, false, t.id === activeId,
      pulseTime,
    );
  }
  for (const t of selectedNonDragged) {
    drawTokenBody(
      ctx, t, state.grid, true, getImage,
      options.showColorblindMarkers, false, t.id === activeId,
      pulseTime,
    );
  }
  for (const t of dragged) {
    drawTokenBody(
      ctx, t, state.grid, true, getImage,
      options.showColorblindMarkers, true, t.id === activeId,
      pulseTime,
    );
  }

  // Pass 2: labels.
  for (const t of unselected) {
    drawTokenLabel(ctx, t, state.grid, labelScale, false, false);
  }
  for (const t of selectedNonDragged) {
    drawTokenLabel(ctx, t, state.grid, labelScale, true, false);
  }
  for (const t of dragged) {
    drawTokenLabel(ctx, t, state.grid, labelScale, true, true);
  }

  // Pass 3: HP bars + condition chips. Phase 143 — bucketed (was
  // raw `state.tokens` order) so dragged tokens' status paints
  // last.
  for (const t of unselected) {
    drawTokenStatus(ctx, t, state.grid, options.mode, labelScale, false);
  }
  for (const t of selectedNonDragged) {
    drawTokenStatus(ctx, t, state.grid, options.mode, labelScale, false);
  }
  for (const t of dragged) {
    drawTokenStatus(ctx, t, state.grid, options.mode, labelScale, true);
  }

  // Pass 4: owner-indicator dots. Phase 126 → 143 — bucketed for
  // the same reason as status.
  for (const t of unselected) {
    if (!t.ownerId) continue;
    drawOwnerDot(ctx, t, state.grid, t.ownerId, options.getOwnerColor);
  }
  for (const t of selectedNonDragged) {
    if (!t.ownerId) continue;
    drawOwnerDot(ctx, t, state.grid, t.ownerId, options.getOwnerColor);
  }
  for (const t of dragged) {
    if (!t.ownerId) continue;
    drawOwnerDot(ctx, t, state.grid, t.ownerId, options.getOwnerColor);
  }

  // Stack-count badge — one per cell that contains ≥2 tokens. Drawn after
  // every other token pass so it always sits on top of the stack.
  drawStackBadges(ctx, state, cellSize, options.mode, overlay);
}

/**
 * Phase 126 — small filled dot anchored at the token's bottom-right
 * indicating the token is owned by a player. Tinted with the owner's
 * identity color when `getOwnerColor` returns one; falls back to the
 * accent yellow used by other "this is special" indicators.
 */
const OWNER_DOT_FALLBACK = '#ffd966';
function drawOwnerDot(
  ctx: CanvasRenderingContext2D,
  t: Token,
  grid: GridConfig,
  ownerId: string,
  getOwnerColor?: (id: string) => string | null,
): void {
  const center = tokenCenterWorld(t, grid);
  const cx = center.x;
  const cy = center.y;
  const cellSize = grid.cellSize;
  const r = (t.size * cellSize) / 2 - 4;
  const dotR = Math.max(4, r * 0.18);
  const offset = r * 0.72;
  const fill = getOwnerColor?.(ownerId) ?? OWNER_DOT_FALLBACK;
  ctx.save();
  // White outline ring underneath the colored dot so it stays visible
  // against any token color.
  ctx.beginPath();
  ctx.arc(cx + offset, cy + offset, dotR + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + offset, cy + offset, dotR, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

const DRAG_GHOST_ALPHA = 0.6;

/**
 * Phase 139 — draw the colored emanation rings centered on a token.
 * Auras render below token bodies so the token icon sits on top.
 * Each aura paints a translucent disk + a solid outline + an
 * optional label tag at the top edge of the disk.
 */
function drawTokenAuras(
  ctx: CanvasRenderingContext2D,
  t: Token,
  grid: GridConfig,
  mode: ViewMode,
): void {
  const center = tokenCenterWorld(t, grid);
  const cx = center.x;
  const cy = center.y;
  for (const aura of t.auras) {
    if (mode === 'spectator' && aura.visibility === 'gm') continue;
    if (!Number.isFinite(aura.radius) || aura.radius <= 0) continue;
    ctx.save();
    // Translucent fill + solid stroke for visibility against any
    // background; same opacity / line-width recipe used by the
    // Phase 31 AoE templates so auras + AoEs share visual language.
    ctx.fillStyle = withAlpha(aura.color, 0.18);
    ctx.strokeStyle = aura.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, aura.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Optional label tag at the top edge of the ring. Drawn as a
    // solid-color pill with white text so it pops against any
    // background.
    if (aura.label) {
      const fontSize = 11;
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      const metrics = ctx.measureText(aura.label);
      const padX = 6;
      const padY = 3;
      const w = metrics.width + padX * 2;
      const h = fontSize + padY * 2;
      const tx = cx - w / 2;
      const ty = cy - aura.radius - h - 2;
      ctx.fillStyle = aura.color;
      roundRect(ctx, tx, ty, w, h, 3);
      ctx.fill();
      ctx.fillStyle = preferBlackText(aura.color) ? '#000' : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(aura.label, cx, ty + h / 2);
    }
    ctx.restore();
  }
}

/**
 * Convert a #rrggbb hex color to an `rgba(r, g, b, a)` string. Used
 * by `drawTokenAuras` to paint a translucent fill from the
 * preset-color hex without parsing it through CSS each frame.
 * Falls back to a neutral gray if `hex` isn't a valid 6-digit code.
 */
function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return `rgba(160, 160, 160, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(160, 160, 160, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawTokenBody(
  ctx: CanvasRenderingContext2D,
  t: Token,
  grid: GridConfig,
  highlighted: boolean,
  getImage: ImageProvider,
  showMarkers: boolean,
  isDragged: boolean,
  activeTurn: boolean,
  /**
   * Phase 144 — `performance.now()` for the pulse animation, or
   * `null` for reduced-motion / no-clock callers (the ring renders
   * at full opacity in that case).
   */
  pulseTime: number | null = null,
): void {
  const cellSize = grid.cellSize;
  const center = tokenCenterWorld(t, grid);
  const cx = center.x;
  const cy = center.y;
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
    // Phase 144 — sin-based pulse, period 1.6 s, alpha 0.55 → 1.0.
    // Skipped (alpha = 1.0) when `pulseTime` is null (reduced-motion
    // or no-clock callers).
    const pulseAlpha =
      pulseTime === null
        ? 1
        : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((pulseTime / 1600) * 2 * Math.PI));
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
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
  grid: GridConfig,
  labelScale: number,
  selected: boolean,
  isDragged: boolean,
): void {
  const cellSize = grid.cellSize;
  const center = tokenCenterWorld(t, grid);
  const cx = center.x;
  const cy = center.y;
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
  grid: GridConfig,
  mode: ViewMode,
  labelScale: number,
  isDragged: boolean,
): void {
  ctx.save();
  if (isDragged) ctx.globalAlpha = DRAG_GHOST_ALPHA;

  const cellSize = grid.cellSize;
  const center = tokenCenterWorld(t, grid);
  const cx = center.x;
  const cy = center.y;
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
      // Phase 138 — at chipR >= 9 (the same threshold the pre-138
      // letter-glyph path used), draw a vector icon centered in the
      // chip. Stroked in white-or-black for contrast against the
      // chip's fill color (same `preferBlackText` rule the glyph
      // path used for its text fill). Falls back to the letter
      // glyph when no icon path is registered for the condition id
      // (e.g. a custom GM-defined condition the GM tracks via
      // `addCondition`).
      if (chipR >= 9 && preset) {
        const stroke = preferBlackText(color) ? '#000' : '#fff';
        const drew = drawConditionIcon(ctx, preset.id, x, y, chipR, stroke);
        if (!drew) {
          const fontSize = Math.max(8, chipR * 1.0);
          ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = stroke;
          ctx.fillText(preset.symbol, x, y);
        }
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

/**
 * Render one "N" badge per cell that contains two or more tokens.
 * Uses the grouped stacks from `groupTokensByStack` so we don't
 * re-iterate `state.tokens` for every visible token.
 *
 * In Spectator mode, stacks with all members fully-hidden by fog are
 * skipped — showing the count would leak presence through the fog.
 * Drag overlay is honored so the badge follows the dragged token(s).
 */
function drawStackBadges(
  ctx: CanvasRenderingContext2D,
  state: SessionState,
  cellSize: number,
  mode: ViewMode,
  overlay: DragOverlay | null,
): void {
  // When dragging, the displayed tokens have a world-space offset. Group
  // them by *display* position so a mid-drag stack (e.g. dragging a token
  // onto another) updates its badge in real time.
  const visible: Token[] = [];
  for (const t of state.tokens) {
    if (mode === 'spectator' && isTokenFullyHidden(t, state)) continue;
    visible.push(withOverlay(t, overlay, cellSize));
  }
  const groups = groupTokensByStack(visible);

  for (const stack of groups.values()) {
    if (stack.tokens.length < 2) continue;
    const top = stack.tokens[stack.tokens.length - 1]!;
    const center = tokenCenterWorld(top, state.grid);
    const cx = center.x;
    const cy = center.y;
    const r = (top.size * cellSize) / 2 - 4;
    const badgeR = Math.max(9, cellSize * 0.13);
    // Top-right corner of the top token's circle.
    const bx = cx + r * 0.72;
    const by = cy - r * 0.72;

    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd966';
    ctx.stroke();

    const fontSize = Math.max(10, badgeR * 1.15);
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd966';
    ctx.fillText(String(stack.tokens.length), bx, by + 0.5);
    ctx.restore();
  }
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
