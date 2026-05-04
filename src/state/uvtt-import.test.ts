/**
 * Phase 141 — UVTT parser tests.
 */
import { describe, it, expect } from 'vitest';
import {
  parseUvtt,
  dataUrlToBlob,
  gridUpdateFromScene,
} from './uvtt-import.js';

describe('parseUvtt (Phase 141)', () => {
  it('returns fallback grid + empty walls for an empty envelope', () => {
    const scene = parseUvtt({});
    expect(scene.grid.cellSize).toBe(50);
    expect(scene.grid.cols).toBe(30);
    expect(scene.grid.rows).toBe(20);
    expect(scene.walls).toEqual([]);
    expect(scene.stats.wallSegments).toBe(0);
    expect(scene.stats.portals).toBe(0);
    expect(scene.warnings.length).toBeGreaterThan(0);
  });

  it('reads pixels_per_grid + map_size when present', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 70, map_size: { x: 50, y: 35 } },
    });
    expect(scene.grid.cellSize).toBe(70);
    expect(scene.grid.cols).toBe(50);
    expect(scene.grid.rows).toBe(35);
  });

  it('produces (n - 1) wall segments per polyline of length n', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50, map_size: { x: 30, y: 20 } },
      line_of_sight: [
        [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
          { x: 0, y: 5 },
        ],
      ],
    });
    // 4 vertices = 3 segments.
    expect(scene.walls.length).toBe(3);
    expect(scene.stats.wallSegments).toBe(3);
    // First segment endpoints scaled by pixels_per_grid.
    const first = scene.walls[0]!;
    expect(first.kind).toBe('segment');
    if (first.kind !== 'segment') throw new Error('expected segment');
    expect(first.x1).toBe(0);
    expect(first.y1).toBe(0);
    expect(first.x2).toBe(250);
    expect(first.y2).toBe(0);
    expect(first.blocksSight).toBe(true);
    expect(first.blocksMovement).toBe(true);
  });

  it('skips polylines with fewer than 2 vertices', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      line_of_sight: [[{ x: 1, y: 1 }], []],
    });
    expect(scene.walls).toEqual([]);
    expect(scene.stats.wallSegments).toBe(0);
  });

  it('drops vertices with non-numeric coords (defensive)', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      line_of_sight: [
        [
          { x: 0, y: 0 },
          { x: 'bad' as unknown as number, y: 0 },
          { x: 5, y: 5 },
        ],
      ],
    });
    // Bad-vertex pair (0,0)→(bad,0) skipped; (bad,0)→(5,5) skipped;
    // result: 0 segments.
    expect(scene.walls.length).toBe(0);
  });

  it('merges objects_line_of_sight (Foundry extension) with line_of_sight', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      line_of_sight: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      ],
      objects_line_of_sight: [
        [
          { x: 5, y: 5 },
          { x: 5, y: 6 },
        ],
      ],
    });
    expect(scene.walls.length).toBe(2);
  });

  it('converts portals to door segments with closed = open=false', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      portals: [
        {
          bounds: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ],
          closed: true,
        },
        {
          bounds: [
            { x: 3, y: 3 },
            { x: 4, y: 3 },
          ],
          closed: false,
        },
      ],
    });
    expect(scene.walls.length).toBe(2);
    expect(scene.stats.portals).toBe(2);
    const closed = scene.walls[0]!;
    if (closed.kind !== 'segment') throw new Error('expected segment');
    expect(closed.door).toEqual({ open: false });
    const open = scene.walls[1]!;
    if (open.kind !== 'segment') throw new Error('expected segment');
    expect(open.door).toEqual({ open: true });
  });

  it('defaults portal closed to true when missing', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      portals: [
        {
          bounds: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ],
        },
      ],
    });
    const seg = scene.walls[0]!;
    if (seg.kind !== 'segment') throw new Error('expected segment');
    expect(seg.door).toEqual({ open: false });
  });

  it('skips portals with malformed or single-point bounds', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      portals: [
        { bounds: [{ x: 1, y: 1 }] }, // only one vertex
        { bounds: undefined }, // missing
        { bounds: 'not-an-array' as unknown as never },
      ],
    });
    expect(scene.walls.length).toBe(0);
    expect(scene.stats.portals).toBe(0);
  });

  it('parses a base64 image into a data URL', () => {
    const scene = parseUvtt({
      // Minimal base64 string (1x1 transparent PNG).
      image:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      resolution: { pixels_per_grid: 50, map_size: { x: 10, y: 5 } },
    });
    expect(scene.background.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(scene.background.nativeImageWidth).toBe(500); // 10 × 50
    expect(scene.background.nativeImageHeight).toBe(250); // 5 × 50
  });

  it('strips an existing data: prefix on the image field', () => {
    const scene = parseUvtt({
      image: 'data:image/png;base64,abcdef==',
    });
    expect(scene.background.imageDataUrl).toBe('data:image/png;base64,abcdef==');
  });

  it('counts but does not import lights in v141 (deferred)', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 50 },
      lights: [
        { position: { x: 1, y: 1 }, range: 5, color: '#fff' },
        { position: { x: 2, y: 2 }, range: 10, color: '#ff0' },
      ],
    });
    expect(scene.stats.skippedLights).toBe(2);
    expect(scene.warnings.some((w) => /light/i.test(w))).toBe(true);
  });

  it('survives a non-object input', () => {
    expect(() => parseUvtt(null)).not.toThrow();
    expect(() => parseUvtt('not json')).not.toThrow();
    expect(() => parseUvtt(42)).not.toThrow();
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a valid base64 data URL', () => {
    const { blob, mimeType } = dataUrlToBlob('data:image/png;base64,YWJj'); // "abc"
    expect(mimeType).toBe('image/png');
    expect(blob.size).toBe(3);
  });

  it('throws on a non-base64 data URL', () => {
    expect(() => dataUrlToBlob('not a url')).toThrow();
  });
});

describe('gridUpdateFromScene', () => {
  it('preserves showGridLines + gridShape from current grid', () => {
    const scene = parseUvtt({
      resolution: { pixels_per_grid: 70, map_size: { x: 25, y: 18 } },
    });
    const current = {
      cols: 30,
      rows: 20,
      cellSize: 50,
      showGridLines: false,
      gridShape: 'hex' as const,
    };
    const update = gridUpdateFromScene(scene, current);
    expect(update.cols).toBe(25);
    expect(update.rows).toBe(18);
    expect(update.cellSize).toBe(70);
    expect(update.showGridLines).toBe(false);
    expect(update.gridShape).toBe('hex');
  });
});
