import type { Renderer } from '../render/renderer.js';
import type { Store } from '../state/store.js';
import type { ID } from '../state/types.js';
import { screenToWorld } from '../render/coords.js';

export interface InputContext {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  store: Store;
  isSpaceHeld(): boolean;
  selection: SelectionState;
}

export interface SelectionState {
  ids: Set<ID>;
}

export function createSelectionState(): SelectionState {
  return { ids: new Set<ID>() };
}

export function pointerToWorld(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  e: PointerEvent,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return screenToWorld(renderer.camera, e.clientX - rect.left, e.clientY - rect.top);
}
