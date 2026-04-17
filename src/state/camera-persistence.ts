import type { Camera, ViewMode } from './types.js';

const CAMERA_KEY_PREFIX = 'gm-encounter-maps-camera-';

function key(mode: ViewMode): string {
  return CAMERA_KEY_PREFIX + mode;
}

export function saveCamera(mode: ViewMode, camera: Camera): void {
  try {
    localStorage.setItem(key(mode), JSON.stringify(camera));
  } catch (err) {
    console.warn('[camera-persistence] save failed', err);
  }
}

export function loadCamera(mode: ViewMode): Camera | null {
  try {
    const raw = localStorage.getItem(key(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Camera>;
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      typeof parsed?.zoom === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y) &&
      Number.isFinite(parsed.zoom) &&
      parsed.zoom > 0
    ) {
      return { x: parsed.x, y: parsed.y, zoom: parsed.zoom };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCamera(mode: ViewMode): void {
  try {
    localStorage.removeItem(key(mode));
  } catch {
    /* no-op */
  }
}
