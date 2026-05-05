export type ID = string;

/**
 * Phase 124 — grid shape. `'square'` (default, every prior phase)
 * draws a rectangular grid; `'hex'` paints a pointy-top hex
 * cosmetic overlay using the same `cellSize` (re-interpreted as
 * the hex vertex radius). The underlying coordinate system stays
 * rectangular for v124 — tokens, walls, fog all continue to operate
 * in cellSize × cellSize world coords. The hex overlay is purely
 * a visual cue for GMs running hex-rules games. A future phase
 * (post-1.0) can adapt snap / distance / wall geometry to true
 * hex semantics.
 */
export type GridShape = 'square' | 'hex';

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
  /**
   * Phase 124 — `'square'` (default) or `'hex'`. Optional in serialized
   * blobs from pre-124; `deserializeState` defaults missing values to
   * `'square'`.
   */
  gridShape?: GridShape;
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

/**
 * Phase 139 — a colored emanation ring centered on a token. Tracks
 * persistent area effects ("Bless 10 ft", "Spirit Guardians 15 ft",
 * "Bardic Rune 20 ft") that follow the caster as they move. Distinct
 * from `AoeTemplate` (Phase 31), which is anchored at a fixed world
 * position; auras follow their token.
 *
 * Multiple auras stack on the same token (a 7th-level Cleric can be
 * concentrating on Spirit Guardians AND benefiting from a partyl
 * Bless at the same time — the renderer paints both rings).
 *
 * `radius` is in world pixels (same units as `losRadius`); the
 * editor exposes it in feet using the active `feetPerSquare`. The
 * `label` (optional) renders as a small tag at the ring's edge for
 * scannability ("Bless"). `visibility: 'gm'` hides the ring on the
 * Spectator canvas (the GM-only "I know about this aura but the
 * party doesn't yet" pattern).
 */
export interface Aura {
  id: ID;
  radius: number;
  color: string;
  label?: string;
  visibility: 'gm' | 'shared';
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
  /**
   * Phase 126 — owning player's `PlayerIdentity.id` (a Spectator
   * playerId), or `null` when the token is GM-controlled (the
   * default). In v126 the field is GM-authored only — the GM picks
   * an owner via the "Owned by" dropdown in the token editor.
   * Spectator drag wiring lands in Phase 127, keyed off this field.
   *
   * Optional in serialized blobs from pre-126; `deserializeState`
   * defaults missing values to `null` so back-compat holds.
   */
  ownerId: ID | null;
  /**
   * Phase 139 — colored emanation rings centered on this token. See
   * the `Aura` interface docstring for semantics. Default `[]`. Pre-
   * 139 sessions don't carry this field; `deserializeState` defaults
   * missing values to `[]`. Forward-only over the wire — pre-139
   * peers will drop the field on receive.
   */
  auras: Aura[];
  /**
   * Phase 149 — D&D-style movement speed in feet per round. Drives
   * the "movement budget" HUD: while THIS token is the active
   * initiative entry AND being dragged, the existing Phase 129
   * yellow distance pip flips between "X / speedFt" (green) and
   * "X / speedFt — over by Y" (red) depending on whether the drag
   * exceeds the budget.
   *
   * `0` disables the HUD (the indicator falls back to its pre-149
   * plain-distance behavior). Default `30` ft (the SRD's typical
   * humanoid base speed). Pre-149 sessions don't carry this field;
   * `deserializeState` defaults missing values to 30. Editable in
   * the token editor's "Movement" section.
   */
  speedFt: number;
  /**
   * Phase 156 — vehicle / mount relationship. When set to another
   * token's id, this token is "carried" by its parent: dragging the
   * parent translates this token by the same delta. The cascade is
   * one-way (parent → children) — dragging a child only moves the
   * child, not the parent. Use cases: a rider on a horse, crew on
   * a ship, treasure tokens stacked on a chest.
   *
   * Optional + back-compat. Pre-156 sessions don't carry the field;
   * `deserializeState` defaults missing values to `null` (no parent).
   * Forward-only over the wire — pre-156 peers will drop the field
   * on receive (same forward-only pattern as Phase 109's
   * `hiddenTokenIds`, Phase 154's `locked`).
   *
   * Cycles are prevented authoring-side: the token editor's "Carried
   * by" dropdown filters out the token's own descendants. The
   * runtime descent helpers (`descendantsOf` in
   * `state/token-relations.ts`) also use a visited set defensively
   * so a malformed cycle on the wire can't infinite-loop.
   */
  parentId?: ID | null;
  /**
   * Phase 154 — when `true`, the token is locked against drag. The
   * select-tool drag handler skips locked tokens (selection + the
   * right-click context menu still work — Edit / Unlock / Delete are
   * authoring escape hatches). A small lock-glyph badge renders at
   * the token's bottom-left corner so the GM can see at a glance
   * which pieces are pinned.
   *
   * Optional + back-compat. Pre-154 sessions don't carry the field;
   * `deserializeState` treats missing values as `false` (unlocked).
   * Forward-only over the wire — pre-154 peers will drop the field
   * on receive (same forward-only pattern as Phase 109's
   * `hiddenTokenIds`, Phase 139's `auras`, Phase 142's `tilePaints`).
   *
   * Multi-select drag: the per-token check runs on each token in the
   * selection independently — a mixed selection (one locked, one
   * unlocked) drags the unlocked one and leaves the locked one in
   * place. This matches Phase 114's per-token wall clamp pattern.
   */
  locked?: boolean;
}

export interface Background {
  imageId: ID | null;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  /**
   * Phase 140 — clockwise rotation in radians applied around the
   * background's CENTER (after offset + scale). Default `0`. Pre-140
   * saves don't carry the field; `deserializeState` defaults missing
   * values to `0`. The Map tool's right-click menu rotates in 90°
   * (π/2) increments; freeform rotation is allowed in the wire format
   * but the v140 UI snaps to the cardinal multiples.
   */
  rotation?: number;
  /**
   * Phase 140 — mirror horizontally around the background's center.
   * Default `false`. Composed AFTER scale + BEFORE rotation, so
   * "rotate 90° then flip horizontal" is the same as "flip horizontal
   * then rotate -90°" (the renderer applies them in `[scale → flip →
   * rotate]` order).
   */
  flipX?: boolean;
  /**
   * Phase 140 — mirror vertically around the background's center.
   * See `flipX` for composition semantics.
   */
  flipY?: boolean;
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
 * A wall on the map. Phase 112 — walls are now a discriminated union
 * over a `kind` field:
 *   - `'segment'` (the original Phase 54 shape — a line segment between
 *     two world-pixel endpoints).
 *   - `'block'` (Phase 112 — a wall *region* that fills one or more
 *     grid cells as a single entity).
 *
 * Pre-112 stored walls have no `kind` field at all; `deserializeState`
 * normalizes them to `kind: 'segment'` on read so the in-memory model
 * always has well-formed walls. Post-112 sync envelopes carry the
 * explicit `kind`; pre-112 peers receiving a `kind: 'block'` wall
 * will drop it (they require x1/y1/x2/y2 in the deserialize filter)
 * — Phase 112 is forward-only, like Phase 109's hiddenTokenIds.
 *
 * `blocksSight` drives the Phase 55 line-of-sight algorithm. For
 * segments, the segment IS the occluder. For blocks, all four
 * perimeter edges contribute (the LoS path expanding via
 * `wallToSegments` in `walls.ts`).
 *
 * `blocksMovement` is reserved for a future grid-pathing feature.
 *
 * Visibility (0.72.3): walls render on BOTH the GM and Spectator
 * canvases by default; per-wall `visibility: 'gm'` (Phase 85) hides
 * the wall's outline from the Spectator while still letting it
 * contribute to LoS — the secret-door pattern.
 */
export type Wall = WallSegment | WallBlock;

interface WallBase {
  id: ID;
  blocksSight: boolean;
  blocksMovement: boolean;
  /**
   * Phase 85 — `'shared'` (default) walls render on both GM and
   * Spectator canvases. `'gm'` hides the wall's outline from the
   * Spectator canvas while still contributing to LoS (secret door /
   * hidden passage). Optional + back-compat: pre-85 walls + freshly-
   * drawn ones default to `'shared'`.
   */
  visibility?: 'shared' | 'gm';
}

export interface WallSegment extends WallBase {
  kind: 'segment';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /**
   * Phase 85 — render thickness in screen pixels at zoom = 1. Optional;
   * pre-85 walls and freshly-drawn ones default to
   * `WALL_DEFAULT_THICKNESS_PX` (see walls.ts). Phase 111 bumped the
   * editor max from 12 → 48 px so a segment wall can fill a full grid
   * cell across; Phase 112's `WallBlock` is the discrete entity for
   * regions larger than a single cell.
   */
  thickness?: number;
  /**
   * Phase 113 — promote this segment to a *door*. When the door is
   * open, the wall stops contributing to LoS / movement (it's visually
   * still drawn as a doorway frame, but the dynamic blockers go away).
   * Closed doors behave exactly like the underlying wall — `blocksSight`
   * + `blocksMovement` still gate the contribution; the door wraps
   * those flags rather than replacing them.
   *
   * Authored via the wall editor's "Is door" toggle, or via the
   * right-click "Open / Close" action mid-session. Block walls don't
   * support doors — the doorway shape is inherently a thin opening.
   */
  door?: { open: boolean };
}

/**
 * Phase 112 — a wall *region* that fills `cellsWide × cellsTall` grid
 * cells starting at `(cellX, cellY)`. Authored by drag-creating a
 * rectangle in the Walls tool's Block mode. The renderer fills the
 * region as a solid wall material; LoS treats the region's perimeter
 * as four blocking segments. Block walls have no `thickness` (the
 * region IS the wall); they have no individual endpoints (drag-to-
 * resize is a future polish — for now, edit by re-drawing).
 */
export interface WallBlock extends WallBase {
  kind: 'block';
  /** Top-left grid cell, x in cells. */
  cellX: number;
  /** Top-left grid cell, y in cells. */
  cellY: number;
  /** Width in cells (≥ 1). */
  cellsWide: number;
  /** Height in cells (≥ 1). */
  cellsTall: number;
  /**
   * Phase 131 — block-wall shape. `'rect'` (default, every prior
   * phase) renders the (cellsWide × cellsTall) rectangle and uses 4
   * perimeter segments for LoS. `'hex'` ignores `cellsWide`/`cellsTall`
   * and renders a single hex polygon at offset cell `(cellX, cellY)`,
   * with 6 perimeter segments for LoS. Optional + back-compat —
   * pre-131 saves load with `shape` defaulted to `'rect'` via
   * `deserializeState`.
   */
  shape?: 'rect' | 'hex';
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

/**
 * Phase 142 — tile-based dungeon paint kind. Each value maps to a
 * fixed color in the renderer (`layer-tile-paint.ts`). Solid colors
 * only in v1.17; sprite-based tiles are deferred polish.
 *
 *   - `'floor'`    — tan / sandstone (the default brush).
 *   - `'wall'`     — slate gray. Visual only in v1.17 (doesn't block
 *     LoS / movement; promote to a Phase 112 block wall via the
 *     editor for that). A future polish could couple them.
 *   - `'water'`    — deep blue.
 *   - `'rough'`    — dusty brown (difficult terrain visual cue).
 *   - `'pit'`      — near-black with a slight purple tint.
 */
export type TilePaintKind = 'floor' | 'wall' | 'water' | 'rough' | 'pit';

/**
 * Phase 142 — a single painted tile. World position is stored as
 * grid cell coords (`cellX`, `cellY`) so tile paint stays
 * resolution-independent. One tile per cell per kind; the painter
 * deduplicates so a cell never has two tiles of the same kind, but
 * different kinds CAN coexist (e.g. a rough-terrain tile under a
 * water tile renders water-on-rough).
 */
export interface TilePaint {
  id: ID;
  cellX: number;
  cellY: number;
  kind: TilePaintKind;
}

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
  /**
   * Phase 142 — tile-based dungeon paint layer. Default `[]`. Pre-
   * 142 sessions don't carry the field; `deserializeState` defaults
   * missing values to `[]`. Forward-only over the wire — pre-142
   * peers ignore the field on receive (same forward-only pattern as
   * Phase 109's `hiddenTokenIds`, Phase 139's `auras`).
   */
  tilePaints: TilePaint[];
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
  /**
   * Phase 112 — `changes` is the union of all updatable wall fields
   * across both kinds. The store does a naive spread merge; callers
   * are responsible for only setting fields appropriate to the
   * existing wall's `kind` (segment paths set x1/y1/x2/y2/thickness;
   * block paths set cellX/cellY/cellsWide/cellsTall). The `kind`
   * itself is NOT updatable — converting a segment to a block (or
   * vice versa) is a delete + re-add operation.
   */
  | {
      kind: 'wall-update';
      id: ID;
      changes: Partial<
        Omit<WallSegment, 'id' | 'kind'> & Omit<WallBlock, 'id' | 'kind'>
      >;
    }
  | { kind: 'wall-remove'; id: ID }
  | { kind: 'walls-clear' }
  | { kind: 'weather-set'; weather: WeatherKind }
  | { kind: 'time-set'; timeOfDay: TimeOfDay }
  | { kind: 'tile-paint-add'; tile: TilePaint }
  | { kind: 'tile-paint-remove'; id: ID }
  | { kind: 'tile-paint-clear' }
  | { kind: 'session-reset'; state: SessionState };

export const DEFAULT_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
  // Phase 124 — explicit default so deserialize round-trips don't
  // accidentally introduce a "missing vs explicit" diff.
  gridShape: 'square',
};

export const DEFAULT_BACKGROUND: Background = {
  imageId: null,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
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
    tilePaints: [],
  };
}
