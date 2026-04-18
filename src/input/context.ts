import type { Renderer } from '../render/renderer.js';
import type { Store } from '../state/store.js';
import type { ID, Token } from '../state/types.js';
import { screenToWorld } from '../render/coords.js';

export interface InputContext {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  store: Store;
  isSpaceHeld(): boolean;
  setWheelEnabled(enabled: boolean): void;
  selection: SelectionState;
  dragOverlay: DragOverlayRef;
  lassoOverlay: LassoOverlayRef;
  lastPlaced: LastPlacedRef;
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
