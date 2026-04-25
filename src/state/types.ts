export type ID = string;

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
}

export type HpVisibility = 'gm' | 'shared';

/**
 * Optional light emission on a token (Phase 57).
 *
 * `bright` and `dim` are world pixels (same units as `losRadius`); the
 * editor exposes them in feet using the active `feetPerSquare`.
 *
 * Visibility math (when `losMode !== 'off'`): a cell is shown on the
 * Spectator canvas only if it's GM-revealed AND inside SOME viewer's
 * sight polygon AND inside SOME light source's `dim` polygon. Lights
 * are occluded by the same sight-blocking walls that block vision.
 *
 * `bright` is render-only — visually the bright radius gets a slightly
 * stronger overlay on the GM canvas so the GM can tell at a glance
 * "where is the candle vs the lantern halo."
 */
export interface TokenLight {
  bright: number;
  dim: number;
  /** Optional warm/cool color tint (unused for visibility math). */
  color: string;
}

/**
 * Optional HP tracking on a token. `null` on `Token.hp` means the token
 * doesn't track HP (no bar, no readout). When present, `current` is
 * clamped to 0..max by the store helpers.
 */
export interface TokenHp {
  current: number;
  max: number;
  /** Whether players see the token's current/max HP, or only a status hint. */
  visibility: HpVisibility;
}

export interface Token {
  id: ID;
  x: number;
  y: number;
  label: string;
  color: string;
  imageId: ID | null;
  size: number;
  borderColor: string | null;
  hp: TokenHp | null;
  conditions: string[];
  /**
   * Facing angle in radians, measured clockwise from "up" (negative Y).
   * `0` = facing up (north). `Math.PI / 2` = facing right (east).
   * Most tokens will use multiples of 45° (`Math.PI / 4`) for tactical
   * purposes; freeform angles are allowed but quantized by the quick-snap
   * buttons.
   */
  rotation: number;
  /**
   * Line-of-sight radius in world pixels, or `null` if this token is
   * not a viewer. When set, the Phase 55 LoS pipeline casts rays from
   * this token's center out to `losRadius` and produces a visibility
   * polygon that Spectator fog gets clipped to (when `losMode !== 'off'`).
   * `null` on existing tokens means "keep the Phase 54 behavior" —
   * fog is driven entirely by the GM's manual reveal tool.
   */
  losRadius: number | null;
  /**
   * Optional light emission (Phase 57). `null` means "this token does
   * not emit light." Lights compose with viewer polygons + walls to
   * form Spectator fog: a cell is visible only if it's reached by some
   * viewer AND lit by some light source.
   */
  light: TokenLight | null;
  /**
   * Phase 69 — initiative bonus added to a 1d20 roll when this token is
   * auto-rolled into the initiative tracker. In D&D 5e this is the
   * Dexterity modifier plus any class / feat / magic-item bonuses (a
   * lvl-3 Rogue with 16 Dex has a `+5`, a lvl-1 Wizard with 12 Dex has
   * a `+1`, a sluggish ogre might have a `-2`). The "Roll all" button
   * in the initiative tracker reads this when generating an entry; the
   * value can also be edited inline before adding.
   *
   * Default: `0`. Pre-Phase-69 serialized sessions don't carry this
   * field — `deserializeState` defaults missing values to `0`, so
   * existing saves load unchanged.
   */
  initiativeMod: number;
  /**
   * Phase 70 — optional per-condition round timers. Keys are condition
   * ids present in `conditions`; values are the round number AT OR
   * AFTER which the condition expires (the store strips it when
   * `initiative.round >= value`). Conditions NOT listed here have no
   * timer and persist until the GM clears them manually (the legacy
   * Phase 50 behavior).
   *
   * Concretely: if it's round 3 and the GM applies Hold Person for 3
   * rounds, the expiration is `6` (ending at the START of round 6
   * — i.e. after the target gets its turn in round 5). This matches
   * 5e's "at the end of its next turn" semantics closely enough for
   * a tracker that doesn't model turn-start / turn-end slots.
   *
   * Default: `{}`. Pre-Phase-70 serialized sessions don't carry this
   * field — `deserializeState` defaults missing values to `{}`, so
   * existing saves load unchanged.
   */
  conditionExpirations: Record<string, number>;
  /**
   * Phase 71 — death-save tracker for the D&D 5e "Saving against
   * death" rules. A token at 0 HP rolls a d20 each turn; 10+ is a
   * success, < 10 is a failure (with 1 = 2 failures and 20 = back
   * to 1 HP). 3 successes → stable. 3 failures → dead.
   *
   * The store auto-resets `{successes: 0, failures: 0}` whenever HP
   * transitions from 0 → positive (healing wakes you up + clears
   * the count). Damage applied to a 0-HP token bumps `failures` by
   * 1 — that's the easily-forgotten part of the rule that the
   * tracker addresses. Crits / max-HP-from-one-hit instant-death
   * aren't auto-applied (the GM still adjudicates those).
   *
   * Default: `{successes: 0, failures: 0}`. Always present so
   * consumers don't need null-checks; the count just stays 0/0
   * until a token actually drops.
   */
  deathSaves: { successes: number; failures: number };
}

export interface Background {
  imageId: ID | null;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

export type AnnotationVisibility = 'gm' | 'shared';

export interface Annotation {
  id: ID;
  x: number;
  y: number;
  text: string;
  color: string;
  visibility: AnnotationVisibility;
}

export type AoeKind = 'sphere' | 'cone' | 'line' | 'cube';
export type AoeVisibility = 'gm' | 'shared';

export interface AoeTemplate {
  id: ID;
  kind: AoeKind;
  /** World origin point. For cube this is the top-left corner. */
  x: number;
  y: number;
  /**
   * Primary dimension in world units:
   * - sphere: radius
   * - cone: reach
   * - line: length
   * - cube: width
   */
  length: number;
  /**
   * Secondary dimension:
   * - sphere: unused
   * - cone: aperture in degrees
   * - line: thickness (world units)
   * - cube: height (world units)
   */
  width: number;
  /** Rotation in radians (cone, line, cube). */
  rotation: number;
  color: string;
  visibility: AoeVisibility;
}

export type DrawStrokeVisibility = 'gm' | 'shared';

/**
 * A freehand ink stroke laid down on the map. `points` are in world
 * coordinates. Strokes render above annotations but below the
 * measurement overlay. GM-only strokes are never drawn on the
 * Spectator canvas.
 */
export interface DrawStroke {
  id: ID;
  points: Array<{ x: number; y: number }>;
  color: string;
  /** Stroke width in world pixels (at zoom=1). */
  width: number;
  visibility: DrawStrokeVisibility;
}

/**
 * A line-segment wall on the map. Stored in world-pixel coordinates
 * (not grid cells) so walls can freely cut across cells — useful for
 * dungeon corridors, doorways, and arbitrary masonry.
 *
 * `blocksSight` drives the Phase 55 line-of-sight algorithm: only
 * walls with this flag contribute to the visibility polygon.
 * `blocksMovement` is a flag reserved for a future grid-pathing
 * feature; Phase 54 stores it but doesn't consume it yet.
 *
 * Visibility (0.72.3): walls render on BOTH the GM and Spectator
 * canvases. They're already serialized in `full-state` / patch
 * messages (have been since Phase 54), and the spectator-side
 * `refreshLos` reads them for the visibility polygon. The original
 * "GM-only" rationale (hide floor plans from devtools-snooping
 * players) was an over-correction: walls represent physical
 * features players naturally expect to see at the table. A future
 * phase may add a per-wall `visibility: 'shared' | 'gm'` for
 * secret-door style hiding.
 */
export interface Wall {
  id: ID;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blocksSight: boolean;
  blocksMovement: boolean;
}

export interface InitiativeEntry {
  id: ID;
  tokenId: ID | null;
  label: string;
  value: number;
}

export interface InitiativeState {
  order: InitiativeEntry[];
  activeId: ID | null;
  round: number;
}

/**
 * Phase 79 — atmospheric weather effect rendered as a screen-space
 * particle overlay. Per-scene state (different scenes can carry
 * different moods); spectator mirrors via the normal patch wire.
 *
 * `'none'`   = no overlay (default).
 * `'rain'`   = vertical streaks of rain falling diagonally.
 * `'snow'`   = soft drifting flakes.
 * `'fog'`    = slow-moving translucent wisps drifting across the view.
 *
 * Reduced-motion users see a static dimmed tint per kind instead of
 * animated particles — see `WEATHER_REDUCED_MOTION_TINT` in the
 * overlay module.
 */
export type WeatherKind = 'none' | 'rain' | 'snow' | 'fog';

/**
 * Phase 80 — time-of-day tint applied to the scene as a final
 * compositing pass over the canvas (after grid + tokens + fog +
 * etc.). Per-scene state, GM-set, spectator-mirrored over the
 * existing patch wire — same scoping as Phase 79 weather.
 *
 * `'none'` skips the tint entirely (default — preserves the
 * pre-Phase-80 look). `'day'` is a near-imperceptible warm
 * highlight; `'dawn'` and `'dusk'` are warmer / more pink+orange;
 * `'night'` is a deep cool blue. The GM and Phase 43's user-level
 * "scene light" preference compose: both render, in that order.
 */
export type TimeOfDay = 'none' | 'dawn' | 'day' | 'dusk' | 'night';

export interface SessionState {
  version: 1;
  grid: GridConfig;
  background: Background;
  tokens: Token[];
  fog: Uint8Array;
  annotations: Annotation[];
  aoeTemplates: AoeTemplate[];
  initiative: InitiativeState;
  strokes: DrawStroke[];
  walls: Wall[];
  /**
   * Phase 79 — active weather effect for the current scene. Default
   * `'none'`. `deserializeState` defaults missing values for back-compat.
   */
  weather: WeatherKind;
  /**
   * Phase 80 — time-of-day tint for the current scene. Default
   * `'none'`. `deserializeState` defaults missing values + collapses
   * unknown kinds to `'none'` for back-compat.
   */
  timeOfDay: TimeOfDay;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type ViewMode = 'gm' | 'spectator';

export type StatePatch =
  | { kind: 'token-add'; token: Token }
  | { kind: 'token-update'; id: ID; changes: Partial<Token> }
  | { kind: 'token-remove'; id: ID }
  | { kind: 'fog-set'; cells: Array<{ x: number; y: number; value: 0 | 1 }> }
  | { kind: 'grid-update'; changes: Partial<GridConfig> }
  | { kind: 'background-update'; changes: Partial<Background> }
  | { kind: 'annotation-add'; annotation: Annotation }
  | { kind: 'annotation-update'; id: ID; changes: Partial<Annotation> }
  | { kind: 'annotation-remove'; id: ID }
  | { kind: 'aoe-add'; template: AoeTemplate }
  | { kind: 'aoe-update'; id: ID; changes: Partial<AoeTemplate> }
  | { kind: 'aoe-remove'; id: ID }
  | { kind: 'initiative-add'; entry: InitiativeEntry }
  | {
      kind: 'initiative-update';
      id: ID;
      changes: Partial<Omit<InitiativeEntry, 'id'>>;
    }
  | { kind: 'initiative-remove'; id: ID }
  | { kind: 'initiative-set-active'; activeId: ID | null; round: number }
  | { kind: 'stroke-add'; stroke: DrawStroke }
  | { kind: 'stroke-update'; id: ID; changes: Partial<Omit<DrawStroke, 'id'>> }
  | { kind: 'stroke-remove'; id: ID }
  | { kind: 'strokes-clear' }
  | { kind: 'wall-add'; wall: Wall }
  | { kind: 'wall-update'; id: ID; changes: Partial<Omit<Wall, 'id'>> }
  | { kind: 'wall-remove'; id: ID }
  | { kind: 'walls-clear' }
  | { kind: 'weather-set'; weather: WeatherKind }
  | { kind: 'time-set'; timeOfDay: TimeOfDay }
  | { kind: 'session-reset'; state: SessionState };

export const DEFAULT_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
};

export const DEFAULT_BACKGROUND: Background = {
  imageId: null,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

export const DEFAULT_CAMERA: Camera = {
  x: -50,
  y: -50,
  zoom: 1,
};

export function createDefaultState(): SessionState {
  const grid = { ...DEFAULT_GRID };
  return {
    version: 1,
    grid,
    background: { ...DEFAULT_BACKGROUND },
    tokens: [],
    fog: new Uint8Array(grid.cols * grid.rows),
    annotations: [],
    aoeTemplates: [],
    initiative: { order: [], activeId: null, round: 0 },
    strokes: [],
    walls: [],
    weather: 'none',
    timeOfDay: 'none',
  };
}
