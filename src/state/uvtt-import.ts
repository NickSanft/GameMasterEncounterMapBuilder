/**
 * Phase 141 — Universal VTT (`.dd2vtt` / `.uvtt`) import.
 *
 * Parses the JSON envelope produced by Dungeondraft / Foundry / similar
 * tools and converts it into the patches our state model uses. The
 * format is documented at https://arkenforge.com/universal-vtt-files/
 * — every field we read is optional in the spec; this parser is
 * defensive and treats malformed sub-fields as "skip" rather than
 * "fail the whole import".
 *
 * Supported in v141:
 *   - Background image (base64-encoded PNG → data URL → caller stores
 *     in IDB → `background-update` patch).
 *   - Grid sizing (`resolution.pixels_per_grid` → `cellSize`;
 *     `resolution.map_size.{x,y}` → `cols`/`rows`).
 *   - Walls (`line_of_sight` polylines → consecutive `WallSegment`
 *     pairs with `blocksSight: true, blocksMovement: true`).
 *   - Doors (`portals` array → `WallSegment` with `door: {open:
 *     !portal.closed}`).
 *
 * Deferred for a future polish phase:
 *   - Lights (`lights` array → `Token.light` on a tagged "light" token,
 *     OR a token with a Phase 139 aura). Skipped in v141 — most users'
 *     primary need is "import the map + the walls", not the dynamic
 *     lighting layout.
 *   - `objects_line_of_sight` (Foundry-specific extension) — same
 *     pattern as `line_of_sight`, just merged into the same wall set
 *     when present.
 *
 * Pure parser — no DOM, no IDB, no fetch. Returns a parsed result the
 * caller (the import modal) consumes to build state patches + IDB writes.
 */

import { nid } from '../util/id.js';
import type {
  Background,
  GridConfig,
  Wall,
  WallSegment,
} from './types.js';

/** Raw envelope shape we accept. Every field is optional. */
export interface UvttEnvelope {
  format?: number;
  /** Base64-encoded PNG image. Optional — a wall-only file may omit. */
  image?: string;
  resolution?: {
    pixels_per_grid?: number;
    map_size?: { x?: number; y?: number };
  };
  /** Each entry is a polyline (sequence of vertices). */
  line_of_sight?: Array<Array<{ x?: number; y?: number }>>;
  /** Foundry-specific extension; same shape as line_of_sight. */
  objects_line_of_sight?: Array<Array<{ x?: number; y?: number }>>;
  portals?: Array<{
    position?: { x?: number; y?: number };
    bounds?: Array<{ x?: number; y?: number }>;
    closed?: boolean;
    rotation?: number;
  }>;
  lights?: Array<{
    position?: { x?: number; y?: number };
    range?: number;
    color?: string;
    shadows?: boolean;
  }>;
}

export interface ImportedScene {
  /** Suggested grid config — caller decides whether to apply. */
  grid: { cols: number; rows: number; cellSize: number };
  /**
   * Suggested background config. `imageDataUrl` is non-null when the
   * envelope carried an `image` field; the caller is responsible for
   * (a) decoding to a Blob, (b) writing through `putImage`, and
   * (c) constructing a `background-update` patch with the resulting
   * image id + the grid-derived offset / scale.
   */
  background: {
    imageDataUrl: string | null;
    /** Pre-computed scale + offset assuming the image fills the grid. */
    suggested: Pick<Background, 'offsetX' | 'offsetY' | 'scaleX' | 'scaleY'>;
    /** Native pixel dimensions of the embedded image, when available. */
    nativeImageWidth: number | null;
    nativeImageHeight: number | null;
  };
  /** Walls + doors derived from `line_of_sight` + `portals`. */
  walls: Wall[];
  /** Counts for the modal's confirmation summary. */
  stats: {
    wallSegments: number;
    portals: number;
    skippedLights: number;
  };
  /**
   * Defensive parse warnings — surfaced to the modal so the GM knows
   * something was dropped silently.
   */
  warnings: string[];
}

const FALLBACK_PIXELS_PER_GRID = 50;
const FALLBACK_COLS = 30;
const FALLBACK_ROWS = 20;

/**
 * Parse a parsed-JSON envelope. Throws no errors — degenerate input
 * returns a near-empty `ImportedScene` with warnings explaining what
 * was dropped.
 */
export function parseUvtt(raw: unknown): ImportedScene {
  const env = (raw && typeof raw === 'object' ? raw : {}) as UvttEnvelope;
  const warnings: string[] = [];

  // Resolution / grid sizing.
  const ppg =
    typeof env.resolution?.pixels_per_grid === 'number' &&
    env.resolution.pixels_per_grid > 0
      ? env.resolution.pixels_per_grid
      : FALLBACK_PIXELS_PER_GRID;
  if (env.resolution?.pixels_per_grid === undefined) {
    warnings.push(
      `No pixels_per_grid in envelope; defaulting cellSize to ${FALLBACK_PIXELS_PER_GRID}.`,
    );
  }
  const mapSizeX = env.resolution?.map_size?.x;
  const mapSizeY = env.resolution?.map_size?.y;
  const cols =
    typeof mapSizeX === 'number' && mapSizeX > 0 ? Math.round(mapSizeX) : FALLBACK_COLS;
  const rows =
    typeof mapSizeY === 'number' && mapSizeY > 0 ? Math.round(mapSizeY) : FALLBACK_ROWS;

  // Image: base64 → data URL. We don't decode here (caller wraps it
  // in a Blob + writes through `putImage`); we just normalize to a
  // data URL string so the modal can `<img src=>` for preview.
  let imageDataUrl: string | null = null;
  let nativeImageWidth: number | null = null;
  let nativeImageHeight: number | null = null;
  if (typeof env.image === 'string' && env.image.length > 0) {
    // Strip a `data:image/...;base64,` prefix if the source already
    // included one (some exporters wrap; Dungeondraft does NOT).
    const stripped = env.image.replace(/^data:image\/[a-z+]+;base64,/, '');
    imageDataUrl = `data:image/png;base64,${stripped}`;
    // We can derive a SUGGESTED native size from cols × ppg, since the
    // UVTT image is meant to render at exactly that footprint. The
    // caller can override after measuring the actual decoded pixels.
    nativeImageWidth = cols * ppg;
    nativeImageHeight = rows * ppg;
  } else {
    warnings.push('Envelope had no image field; importing walls only.');
  }

  // Walls — line_of_sight + objects_line_of_sight, both treated as
  // sight-AND-movement-blocking. Each polyline becomes (n - 1)
  // segments. Coordinates are in GRID units; multiply by cellSize
  // to land in world pixels.
  const walls: Wall[] = [];
  let wallSegments = 0;
  for (const source of [env.line_of_sight, env.objects_line_of_sight]) {
    if (!Array.isArray(source)) continue;
    for (const polyline of source) {
      if (!Array.isArray(polyline) || polyline.length < 2) continue;
      for (let i = 0; i < polyline.length - 1; i++) {
        const a = polyline[i];
        const b = polyline[i + 1];
        if (!a || !b) continue;
        if (
          typeof a.x !== 'number' ||
          typeof a.y !== 'number' ||
          typeof b.x !== 'number' ||
          typeof b.y !== 'number'
        ) {
          continue;
        }
        const seg: WallSegment = {
          id: nid(),
          kind: 'segment',
          x1: a.x * ppg,
          y1: a.y * ppg,
          x2: b.x * ppg,
          y2: b.y * ppg,
          blocksSight: true,
          blocksMovement: true,
        };
        walls.push(seg);
        wallSegments++;
      }
    }
  }

  // Portals (doors). Each portal has a `bounds` array of 2 points
  // (the door's two endpoints in grid units). Optional `closed`
  // boolean drives the `door: {open}` state.
  let portalsCount = 0;
  if (Array.isArray(env.portals)) {
    for (const portal of env.portals) {
      const bounds = Array.isArray(portal.bounds) ? portal.bounds : null;
      if (!bounds || bounds.length < 2) continue;
      const a = bounds[0];
      const b = bounds[1];
      if (
        !a ||
        !b ||
        typeof a.x !== 'number' ||
        typeof a.y !== 'number' ||
        typeof b.x !== 'number' ||
        typeof b.y !== 'number'
      ) {
        continue;
      }
      const closed = portal.closed !== false; // default to closed
      const seg: WallSegment = {
        id: nid(),
        kind: 'segment',
        x1: a.x * ppg,
        y1: a.y * ppg,
        x2: b.x * ppg,
        y2: b.y * ppg,
        blocksSight: true,
        blocksMovement: true,
        door: { open: !closed },
      };
      walls.push(seg);
      portalsCount++;
    }
  }

  // Lights — counted but not converted in v141.
  const skippedLights = Array.isArray(env.lights) ? env.lights.length : 0;
  if (skippedLights > 0) {
    warnings.push(
      `${skippedLights} light source${skippedLights === 1 ? '' : 's'} found in envelope; not imported in this version.`,
    );
  }

  return {
    grid: { cols, rows, cellSize: ppg },
    background: {
      imageDataUrl,
      suggested: {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      },
      nativeImageWidth,
      nativeImageHeight,
    },
    walls,
    stats: { wallSegments, portals: portalsCount, skippedLights },
    warnings,
  };
}

/**
 * Convenience helper for the modal — given a parsed scene with an
 * image data URL, decode the base64 portion to a Blob the caller
 * can pass to `putImage(blob, mimeType)`. Returns `null` when the
 * scene has no image.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error('Not a base64 data URL');
  const mimeType = m[1]!;
  const binary = atob(m[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

/**
 * Derive a `GridConfig` patch from an `ImportedScene`, preserving the
 * existing `showGridLines` + `gridShape` settings. Used by the modal
 * to construct the `grid-update` patch.
 */
export function gridUpdateFromScene(
  scene: ImportedScene,
  current: GridConfig,
): Partial<GridConfig> {
  return {
    cols: scene.grid.cols,
    rows: scene.grid.rows,
    cellSize: scene.grid.cellSize,
    showGridLines: current.showGridLines,
    gridShape: current.gridShape ?? 'square',
  };
}
