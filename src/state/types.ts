export type ID = string;

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
}

export type HpVisibility = 'gm' | 'shared';

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
 * Walls are GM-only — they never render on the Spectator canvas and
 * are never included in sync messages to Spectator peers. Phase 55
 * will let the GM transmit the DERIVED line-of-sight polygons
 * instead, so Spectators still see the resulting fog mask without
 * being handed a floor plan they can inspect in devtools.
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
  };
}
