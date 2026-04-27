import type { Renderer } from '../render/renderer.js';
import type { Store } from '../state/store.js';
import type { ID, Token } from '../state/types.js';
import { screenToWorld } from '../render/coords.js';

export interface InputContext {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  store: Store;
  isSpaceHeld(): boolean;
  /**
   * True while a two-finger pinch gesture is in progress. Tools should
   * bail out of their single-finger state machines when this is true so
   * zooming in with two fingers doesn't also drop tokens / draw strokes.
   * Safe default for non-touch code paths: always returns false.
   */
  isPinching?(): boolean;
  setWheelEnabled(enabled: boolean): void;
  selection: SelectionState;
  dragOverlay: DragOverlayRef;
  /**
   * Phase 85 — set when a Select-tool drag begins on a selected wall's
   * endpoint handle. Optional so non-select tools / pre-85 callers
   * can omit it.
   */
  endpointDrag?: EndpointDragRef;
  /**
   * Phase 116 — set when a Select-tool drag begins on a selected
   * block-wall's corner handle. Optional so non-select tools can
   * omit it.
   */
  blockResize?: BlockResizeRef;
  lassoOverlay: LassoOverlayRef;
  lastPlaced: LastPlacedRef;
  measurementOverlay: MeasurementOverlayRef;
  aoeOverlay: AoeOverlayRef;
}

export interface MeasurementOverlayRef {
  current: import('../render/layer-measure.js').MeasurementOverlay | null;
}

export function createMeasurementOverlayRef(): MeasurementOverlayRef {
  return { current: null };
}

export interface AoeOverlayRef {
  current: import('../render/layer-aoe.js').AoePreview | null;
}

export function createAoeOverlayRef(): AoeOverlayRef {
  return { current: null };
}

export interface DrawOverlayRef {
  current: import('../state/types.js').DrawStroke | null;
}

export function createDrawOverlayRef(): DrawOverlayRef {
  return { current: null };
}

/**
 * In-progress wall chain while the Walls tool is active. `vertices`
 * holds the already-committed chain points (world-space); `cursor`
 * holds the current mouse position for the "rubber-band" preview to
 * the next vertex. Cleared when the chain closes (Escape / double-click)
 * or the tool deactivates.
 */
export interface WallsOverlay {
  vertices: Array<{ x: number; y: number }>;
  cursor: { x: number; y: number } | null;
}

export interface WallsOverlayRef {
  current: WallsOverlay | null;
}

export function createWallsOverlayRef(): WallsOverlayRef {
  return { current: null };
}

/**
 * Phase 85 — endpoint drag in-flight state for the in-place wall
 * editor. Set by the Select tool's pointerdown handler when the click
 * landed on a selected wall's endpoint handle; updated on pointermove;
 * cleared on pointerup after the `wall-update` patch commits. The
 * renderer reads the value via `getEndpointDrag` so the wall preview
 * follows the cursor at 60fps without a per-frame patch.
 */
export interface EndpointDragState {
  wallId: ID;
  endpoint: 1 | 2;
  /** Live cursor position in world-pixels — what the renderer paints. */
  x: number;
  y: number;
}

export interface EndpointDragRef {
  current: EndpointDragState | null;
}

export function createEndpointDragRef(): EndpointDragRef {
  return { current: null };
}

/**
 * Phase 116 — block-wall corner-resize in-flight state. Set by the
 * Select tool's pointerdown when the click landed on a selected
 * block's corner handle; updated on pointermove; cleared on
 * pointerup after the `wall-update` patch commits. The renderer
 * reads the value to paint the prospective new geometry as a ghost
 * rectangle (similar to the block-create preview from Phase 112).
 */
export interface BlockResizeState {
  wallId: ID;
  /** Cell coords of the prospective new geometry. */
  cellX: number;
  cellY: number;
  cellsWide: number;
  cellsTall: number;
}

export interface BlockResizeRef {
  current: BlockResizeState | null;
}

export function createBlockResizeRef(): BlockResizeRef {
  return { current: null };
}

export interface LastPlacedRef {
  current: Token | null;
}

export function createLastPlacedRef(): LastPlacedRef {
  return { current: null };
}

export interface SelectionState {
  ids: Set<ID>;
}

export function createSelectionState(): SelectionState {
  return { ids: new Set<ID>() };
}

export interface DragOverlay {
  ids: readonly ID[];
  /** World-space delta in pixels at zoom=1. Layers convert as needed. */
  deltaX: number;
  deltaY: number;
}

export interface DragOverlayRef {
  current: DragOverlay | null;
}

export function createDragOverlayRef(): DragOverlayRef {
  return { current: null };
}

export interface LassoOverlay {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  additive: boolean;
}

export interface LassoOverlayRef {
  current: LassoOverlay | null;
}

export function createLassoOverlayRef(): LassoOverlayRef {
  return { current: null };
}

export function pointerToWorld(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  e: PointerEvent,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return screenToWorld(renderer.camera, e.clientX - rect.left, e.clientY - rect.top);
}
