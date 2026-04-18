import type { Camera } from '../state/types.js';
import type { ViewportRect } from '../sync/messages.js';

/**
 * Convert a pixel-sized canvas viewport to world-space rectangle bounds
 * using the given camera. This represents the region of the world
 * currently visible on-screen.
 */
export function viewportFromCamera(
  camera: Camera,
  cssWidth: number,
  cssHeight: number,
): ViewportRect {
  const zoom = camera.zoom > 0 ? camera.zoom : 1;
  return {
    x: camera.x,
    y: camera.y,
    width: cssWidth / zoom,
    height: cssHeight / zoom,
  };
}
