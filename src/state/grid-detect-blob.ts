/**
 * Phase 101 — bridge between an uploaded `Blob` and the pure
 * `detectGrid` helper.
 *
 * Pulls the blob through `Image` + `<canvas>` → `getImageData`,
 * downsampling to keep the autocorrelation pass fast on huge maps.
 * Returns `null` on any failure so the caller can fall through to
 * "no detection" silently.
 *
 * Lives in `state/` rather than `ui/` because it's a pure pipeline:
 * given a blob, return a grid estimate. No app-state coupling.
 */

import {
  detectGrid,
  DETECTION_MAX_EDGE,
  type GridDetectResult,
} from './grid-detect.js';

export async function detectGridFromBlob(
  blob: Blob,
): Promise<GridDetectResult | null> {
  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    // Compute a downsample factor that keeps the longest edge at or
    // under DETECTION_MAX_EDGE — otherwise huge maps make detection
    // multi-second. Factor of 1 means no downsample.
    const maxEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const factor = maxEdge > DETECTION_MAX_EDGE ? maxEdge / DETECTION_MAX_EDGE : 1;
    const targetW = Math.max(1, Math.round(img.naturalWidth / factor));
    const targetH = Math.max(1, Math.round(img.naturalHeight / factor));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const data = ctx.getImageData(0, 0, targetW, targetH);
    return detectGrid(data, factor);
  } catch (err) {
    console.warn('[grid-detect-blob] detection failed', err);
    return null;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}
