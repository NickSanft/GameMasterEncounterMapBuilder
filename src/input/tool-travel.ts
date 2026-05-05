/**
 * Phase 158 — Travel tool.
 *
 * Click-to-add waypoints, double-click / Enter / Esc finishes the
 * route. The accumulating polyline lives in a `travelOverlay` ref
 * so the renderer can paint a dashed preview while the GM authors.
 *
 * Commit: a `'travel-route-add'` patch fires once 2+ waypoints have
 * been clicked. Single-point routes are abandoned silently.
 *
 * Right-click cancels the in-flight route. Esc cancels too. Switch
 * to another tool (deactivate) cancels.
 */
import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import type {
  TravelRoute,
  TravelRouteVisibility,
} from '../state/types.js';

export interface TravelToolOptions {
  color: string;
  visibility: TravelRouteVisibility;
}

export interface TravelToolOptionsRef {
  current: TravelToolOptions;
}

export function createTravelToolOptionsRef(
  initial: TravelToolOptions = { color: '#5eaaff', visibility: 'gm' },
): TravelToolOptionsRef {
  return { current: { ...initial } };
}

export interface TravelOverlayRef {
  current: TravelRoute | null;
}

export function createTravelOverlayRef(): TravelOverlayRef {
  return { current: null };
}

export interface TravelToolContext extends InputContext {
  travelOverlay: TravelOverlayRef;
  travelOptions: TravelToolOptionsRef;
}

export function createTravelTool(ctx: TravelToolContext): Tool {
  const { canvas, renderer, store, travelOverlay, travelOptions } = ctx;

  function newRoute(wx: number, wy: number): TravelRoute {
    const { color, visibility } = travelOptions.current;
    return {
      id: nid(),
      color,
      visibility,
      points: [{ x: wx, y: wy }],
    };
  }

  function commit(): void {
    const route = travelOverlay.current;
    travelOverlay.current = null;
    if (route && route.points.length >= 2) {
      store.applyPatch({ kind: 'travel-route-add', route });
    }
    renderer.requestRender();
  }

  function cancel(): void {
    if (!travelOverlay.current) return;
    travelOverlay.current = null;
    renderer.requestRender();
  }

  function onPointerDown(e: PointerEvent) {
    // Right-click → cancel the in-flight route. The browser's native
    // contextmenu event is suppressed elsewhere; we still want to
    // catch button: 2 here so the cancel feels instant.
    if (e.button === 2) {
      cancel();
      e.preventDefault();
      return;
    }
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    if (e.detail >= 2) {
      // Double-click → finish the route. The first click already
      // appended the point in the previous pointerdown; the second
      // click is the "done" gesture.
      commit();
      e.preventDefault();
      return;
    }
    const world = pointerToWorld(canvas, renderer, e);
    const inProgress = travelOverlay.current;
    if (!inProgress) {
      travelOverlay.current = newRoute(world.x, world.y);
    } else {
      travelOverlay.current = {
        ...inProgress,
        points: [...inProgress.points, { x: world.x, y: world.y }],
      };
    }
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    // No rubber-band preview between clicks for v158 — keeping the
    // tool simple. Future polish: render a dashed segment from the
    // last committed point to the cursor.
    void e;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!travelOverlay.current) return;
    if (e.key === 'Escape') {
      cancel();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      commit();
      e.preventDefault();
    }
  }

  function onContextMenu(e: MouseEvent) {
    // Suppress the native context menu while the Travel tool is
    // active — we use right-click for cancel (above).
    e.preventDefault();
  }

  return {
    name: 'travel',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('contextmenu', onContextMenu);
      window.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      // Switching tools mid-route → discard the in-flight overlay
      // without committing. Same pattern the Walls tool uses.
      cancel();
    },
  };
}
