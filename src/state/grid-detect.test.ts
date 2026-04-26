/**
 * Phase 101 — grid-detect tests.
 *
 * Synthesizes ImageData with a known grid pattern + verifies the
 * detector recovers the cell size. Pure JS — no real canvas needed,
 * we build the pixel buffer by hand.
 */
import { describe, it, expect } from 'vitest';
import {
  detectGrid,
  darkProfile,
  bestLag,
  MIN_CELL_PX,
  MIN_CONFIDENCE,
} from './grid-detect.js';

/**
 * Build an ImageData with a checker-style grid: white interiors +
 * dark grid lines every `cellSize` pixels. Optionally adds noise to
 * the cell interiors so the detector has to handle non-pristine maps.
 */
function makeGridImage(
  width: number,
  height: number,
  cellSize: number,
  options: { noise?: number; lineColor?: number } = {},
): ImageData {
  const lineColor = options.lineColor ?? 30;
  const noise = options.noise ?? 0;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const onLine =
        x % cellSize === 0 ||
        y % cellSize === 0 ||
        (x % cellSize === cellSize - 1 && cellSize > 1) ||
        (y % cellSize === cellSize - 1 && cellSize > 1);
      const base = onLine ? lineColor : 230;
      const noisy = noise > 0 ? base + Math.floor((Math.random() - 0.5) * noise) : base;
      const v = Math.max(0, Math.min(255, noisy));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}

/** Build an ImageData with NO grid — just uniform mid-grey. */
function makeBlankImage(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe('detectGrid', () => {
  it('detects a clean 32 px grid', () => {
    const img = makeGridImage(320, 320, 32);
    const result = detectGrid(img);
    expect(result).not.toBeNull();
    expect(result!.cellSizePx).toBe(32);
    expect(result!.confidence).toBeGreaterThan(MIN_CONFIDENCE);
  });

  it('detects a clean 50 px grid (typical VTT export)', () => {
    const img = makeGridImage(500, 500, 50);
    const result = detectGrid(img);
    expect(result).not.toBeNull();
    expect(result!.cellSizePx).toBe(50);
  });

  it('detects a clean 64 px grid', () => {
    const img = makeGridImage(640, 640, 64);
    const result = detectGrid(img);
    expect(result).not.toBeNull();
    expect(result!.cellSizePx).toBe(64);
  });

  it('returns null for a blank image (no grid)', () => {
    const img = makeBlankImage(200, 200);
    const result = detectGrid(img);
    expect(result).toBeNull();
  });

  it('respects originalScale to report image-pixel cell size', () => {
    // Detection runs on a 4x downsampled buffer; original cell would
    // have been 32 * 4 = 128 px in the source image.
    const downsampled = makeGridImage(320, 320, 32);
    const result = detectGrid(downsampled, 4);
    expect(result).not.toBeNull();
    expect(result!.cellSizePx).toBe(128);
  });

  it('rejects when image is too small for the search range', () => {
    // 30x30 image with min cell 16 → less than 4×16 = 64 in each
    // dimension, so bestLag bails out early.
    const tiny = makeGridImage(30, 30, 16);
    const result = detectGrid(tiny);
    expect(result).toBeNull();
  });

  it('handles light noise without losing the grid', () => {
    const img = makeGridImage(320, 320, 32, { noise: 30 });
    const result = detectGrid(img);
    expect(result).not.toBeNull();
    // Allow ±1 px slop because noise can shift the autocorrelation peak.
    expect(Math.abs(result!.cellSizePx - 32)).toBeLessThanOrEqual(1);
  });
});

describe('darkProfile', () => {
  it('peaks on dark rows / columns', () => {
    const img = makeGridImage(80, 80, 20);
    const rows = darkProfile(img, 'rows');
    // Rows that hit a grid line (y = 0, 19, 20, 39, 40, 59, 60, 79)
    // should be darker than the cell-interior rows.
    expect(rows[0]!).toBeGreaterThan(rows[10]!);
    expect(rows[20]!).toBeGreaterThan(rows[10]!);
    expect(rows[40]!).toBeGreaterThan(rows[30]!);
  });

  it('returns the same length as the requested axis', () => {
    const img = makeBlankImage(40, 60);
    expect(darkProfile(img, 'rows')).toHaveLength(60);
    expect(darkProfile(img, 'cols')).toHaveLength(40);
  });
});

describe('bestLag', () => {
  it('returns null for a too-short signal', () => {
    const sig = new Float32Array([1, 2, 3, 4]);
    expect(bestLag(sig, MIN_CELL_PX, 100)).toBeNull();
  });

  it('finds the period of a synthetic spike train', () => {
    const period = 32;
    const len = 320;
    const sig = new Float32Array(len);
    for (let i = 0; i < len; i++) sig[i] = i % period === 0 ? 100 : 1;
    const result = bestLag(sig, MIN_CELL_PX, 100);
    expect(result).not.toBeNull();
    expect(result!.lag).toBe(period);
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  it('returns low confidence for a flat signal (no period)', () => {
    const len = 320;
    const sig = new Float32Array(len);
    for (let i = 0; i < len; i++) sig[i] = 50;
    const result = bestLag(sig, MIN_CELL_PX, 100);
    // Flat → all autocorrelations are ~0; bestLag may return null
    // or a very low confidence value. Either is acceptable.
    if (result !== null) {
      expect(result.confidence).toBeLessThan(MIN_CONFIDENCE);
    }
  });
});
