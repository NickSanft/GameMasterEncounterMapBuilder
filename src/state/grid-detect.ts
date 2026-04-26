/**
 * Phase 101 — auto-detect the printed grid in an uploaded map image.
 *
 * Most VTT maps ship with a visible grid: thin dark lines at regular
 * intervals. Detection strategy:
 *
 *   1. Build a per-row darkness profile (sum of 255 - max(r,g,b)
 *      across each row's pixels). Bright cell interiors contribute
 *      little; dark grid lines contribute a lot, producing periodic
 *      spikes in the profile.
 *   2. Run autocorrelation across a plausible lag range (cell sizes
 *      from 16 to 200 px; tighter than the renderer's actual range
 *      because grids smaller / larger than that are rare in shipped
 *      maps + would false-positive against UI artifacts).
 *   3. The lag with the strongest normalized correlation is the
 *      candidate cell height.
 *   4. Repeat for the column profile to get cell width.
 *   5. If both axes agree (within 1 px) AND confidence ≥ MIN_CONFIDENCE,
 *      return the detected cell size + confidence. Otherwise return null
 *      so the caller leaves the user's existing cellSize alone.
 *
 * Pure module. The caller passes an `ImageData` (typically downsampled
 * for speed); we don't reach for the canvas API ourselves so this is
 * trivially testable with a synthetic ImageData.
 */

/** Cell-size search range in pixels. */
export const MIN_CELL_PX = 16;
export const MAX_CELL_PX = 200;

/** Minimum normalized autocorrelation peak to count as a detection. */
export const MIN_CONFIDENCE = 0.4;

/**
 * Max longest-edge for the pixel buffer fed to detection. Anything
 * bigger gets downsampled by the caller before we see it. Keeps the
 * autocorrelation pass under a few hundred ms even on 4K maps.
 */
export const DETECTION_MAX_EDGE = 800;

export interface GridDetectResult {
  /** Estimated cell size in pixels of the original image. */
  cellSizePx: number;
  /** 0..1 normalized peak strength (higher = more confident). */
  confidence: number;
}

/**
 * Detect the grid in a single ImageData. Returns `null` when no
 * confident grid is found OR when the horizontal + vertical
 * estimates disagree by more than 1 px (rare but happens on
 * non-square grids — a future polish could detect those separately).
 *
 * `originalScale` is the (image_pixels / detection_pixels) ratio;
 * the caller passes 1.0 if it gave us full-resolution pixels, or
 * (e.g.) 4.0 if it downsampled by 4x. The result is scaled back
 * to original-image pixels.
 */
export function detectGrid(
  pixels: ImageData,
  originalScale = 1,
): GridDetectResult | null {
  const rowProfile = darkProfile(pixels, 'rows');
  const colProfile = darkProfile(pixels, 'cols');

  // Cap the search range to one quarter of the smaller dimension so
  // the autocorrelation has room to compute multiple periods (need
  // at least 4 periods to be statistically meaningful).
  const minDim = Math.min(pixels.width, pixels.height);
  const maxLag = Math.min(MAX_CELL_PX, Math.floor(minDim / 4));

  const rowFit = bestLag(rowProfile, MIN_CELL_PX, maxLag);
  const colFit = bestLag(colProfile, MIN_CELL_PX, maxLag);

  if (!rowFit || !colFit) return null;
  if (Math.abs(rowFit.lag - colFit.lag) > 1) return null;

  // Average the two; final confidence = min of the two
  // (be conservative — only accept when BOTH axes are confident).
  const avgLag = (rowFit.lag + colFit.lag) / 2;
  const confidence = Math.min(rowFit.confidence, colFit.confidence);
  if (confidence < MIN_CONFIDENCE) return null;

  return {
    cellSizePx: Math.round(avgLag * originalScale),
    confidence,
  };
}

/**
 * Per-row (or per-column) darkness profile. For each row index `r`,
 * profile[r] = sum over columns of (255 - max(R, G, B)). Higher value
 * = darker row, which a horizontal grid line produces.
 */
export function darkProfile(
  data: ImageData,
  axis: 'rows' | 'cols',
): Float32Array {
  const { width: w, height: h, data: px } = data;
  const len = axis === 'rows' ? h : w;
  const other = axis === 'rows' ? w : h;
  const out = new Float32Array(len);

  if (axis === 'rows') {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        const i = rowStart + x * 4;
        const r = px[i]!;
        const g = px[i + 1]!;
        const b = px[i + 2]!;
        const lum = Math.max(r, g, b);
        sum += 255 - lum;
      }
      out[y] = sum / other;
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        const r = px[i]!;
        const g = px[i + 1]!;
        const b = px[i + 2]!;
        const lum = Math.max(r, g, b);
        sum += 255 - lum;
      }
      out[x] = sum / other;
    }
  }
  return out;
}

/**
 * Find the lag in `[minLag, maxLag]` that maximizes normalized
 * autocorrelation of `signal`. Returns `null` if the signal is
 * too short or every lag gave a non-positive correlation.
 *
 * Confidence is the peak's score divided by the mean of all scores
 * in the search range — a pronounced peak relative to the floor
 * means the periodicity is real.
 */
export function bestLag(
  signal: Float32Array,
  minLag: number,
  maxLag: number,
): { lag: number; confidence: number } | null {
  const n = signal.length;
  if (n < minLag * 4) return null;

  // Subtract mean to focus on AC-coupled signal.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += signal[i]!;
  mean /= n;

  // Score each candidate lag.
  const scores: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i + lag < n; i++) {
      sum += (signal[i]! - mean) * (signal[i + lag]! - mean);
      count++;
    }
    scores.push(count > 0 ? sum / count : 0);
  }

  // Find the highest-scoring peak.
  let peakIdx = -1;
  let peakScore = -Infinity;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i]! > peakScore) {
      peakScore = scores[i]!;
      peakIdx = i;
    }
  }
  if (peakIdx < 0 || peakScore <= 0) return null;

  // Walk back to the FUNDAMENTAL period: in pure autocorrelation a
  // signal with period P has equally-strong peaks at P, 2P, 3P, …
  // (every multiple is a self-overlap). The detector should report
  // the smallest such period because that's the actual cell size.
  // Strategy: for each integer divisor d of (minLag + peakIdx) such
  // that the divided lag is still in our search range, check if the
  // score there is at least HARMONIC_THRESHOLD (0.85) of the
  // headline peak. Pick the smallest qualifying candidate.
  const HARMONIC_THRESHOLD = 0.85;
  const peakLag = minLag + peakIdx;
  let bestPeakIdx = peakIdx;
  for (let divisor = 2; divisor <= peakLag / minLag; divisor++) {
    const candidateLag = Math.round(peakLag / divisor);
    if (candidateLag < minLag) break;
    const candidateScoreIdx = candidateLag - minLag;
    if (candidateScoreIdx < 0 || candidateScoreIdx >= scores.length) continue;
    if (scores[candidateScoreIdx]! >= peakScore * HARMONIC_THRESHOLD) {
      bestPeakIdx = candidateScoreIdx;
    }
  }
  peakIdx = bestPeakIdx;
  // Note: confidence below uses the original peakScore as the
  // numerator. The fundamental's score is, by construction, within
  // 15% of it — close enough that the confidence number doesn't
  // wildly mislead.

  // Confidence = how much the peak stands out from the rest of the
  // candidate scores. We use mean-and-stddev: a strong period yields
  // a peak many standard deviations above the mean of the other
  // candidates. Sigmoid into [0, 1] via `peak / (peak + stddev*K)`.
  let mean2 = 0;
  for (const s of scores) mean2 += s;
  mean2 /= scores.length;
  let variance = 0;
  for (const s of scores) {
    const d = s - mean2;
    variance += d * d;
  }
  variance /= scores.length;
  const stddev = Math.sqrt(variance);
  // Number of standard deviations above the mean. A truly flat signal
  // yields stddev ≈ 0 → numerator ≈ 0 (peak ≈ mean) → confidence 0.
  // A spike-train signal yields a peak >> mean → high z-score.
  const z = stddev > 0 ? (peakScore - mean2) / stddev : 0;
  // Map z (≥ 0) to (0, 1) via z / (z + 2). z=0 → 0; z=2 → 0.5; z=8 → 0.8.
  const confidence = z > 0 ? z / (z + 2) : 0;

  return { lag: minLag + peakIdx, confidence };
}
