import { describe, it, expect } from 'vitest';
import {
  DEFAULT_IMPORT_SELECTION,
  mergeImportState,
  summarizeImport,
  type ImportSelection,
} from './import-merge.js';
import { createDefaultState, type SessionState, type Token } from './types.js';

function tok(id: string, label = id): Token {
  return {
    id,
    x: 0,
    y: 0,
    label,
    color: '#fff',
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ownerId: null,
  };
}

function baseState(): SessionState {
  const s = createDefaultState();
  s.tokens.push(tok('base-1', 'Base Token'));
  s.annotations.push({
    id: 'a-base',
    x: 10,
    y: 10,
    text: 'base note',
    color: '#fdd835',
    visibility: 'shared',
  });
  s.fog[0] = 1;
  return s;
}

function importedState(): SessionState {
  const s = createDefaultState();
  s.grid.cols = 40;
  s.grid.rows = 30;
  s.fog = new Uint8Array(40 * 30);
  s.fog[0] = 1;
  s.fog[1] = 1;
  s.background.imageId = 'img-import';
  s.tokens.push(tok('imp-1', 'Imported Token A'));
  s.tokens.push(tok('imp-2', 'Imported Token B'));
  s.annotations.push({
    id: 'a-imp',
    x: 5,
    y: 5,
    text: 'imported',
    color: '#ff0000',
    visibility: 'gm',
  });
  s.aoeTemplates.push({
    id: 'aoe-imp',
    kind: 'sphere',
    x: 0,
    y: 0,
    length: 30,
    width: 0,
    rotation: 0,
    color: '#22ff22',
    visibility: 'shared',
  });
  s.initiative = { order: [{ id: 'i-1', tokenId: null, label: 'Goblin', value: 12 }], activeId: null, round: 0 };
  s.strokes.push({
    id: 'stroke-imp',
    points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
    color: '#ffd966',
    width: 4,
    visibility: 'shared',
  });
  return s;
}

describe('DEFAULT_IMPORT_SELECTION', () => {
  it('has every field set to true (replace-everything default)', () => {
    for (const key of Object.keys(DEFAULT_IMPORT_SELECTION) as (keyof ImportSelection)[]) {
      expect(DEFAULT_IMPORT_SELECTION[key]).toBe(true);
    }
  });
});

describe('mergeImportState', () => {
  it('with all flags set to true, matches the imported state for every field', () => {
    const out = mergeImportState(baseState(), importedState(), DEFAULT_IMPORT_SELECTION);
    expect(out.tokens.map((t) => t.id)).toEqual(['imp-1', 'imp-2']);
    expect(out.annotations.map((a) => a.id)).toEqual(['a-imp']);
    expect(out.aoeTemplates.map((a) => a.id)).toEqual(['aoe-imp']);
    expect(out.initiative.order[0]?.label).toBe('Goblin');
    expect(out.strokes.map((s) => s.id)).toEqual(['stroke-imp']);
    expect(out.background.imageId).toBe('img-import');
    expect(out.grid.cols).toBe(40);
    expect(out.fog.length).toBe(40 * 30);
  });

  it('with all flags set to false, preserves the base state verbatim', () => {
    const base = baseState();
    const selection: ImportSelection = {
      background: false,
      grid: false,
      tokens: false,
      fog: false,
      annotations: false,
      aoeTemplates: false,
      initiative: false,
      strokes: false,
      walls: false,
    };
    const out = mergeImportState(base, importedState(), selection);
    expect(out.tokens.map((t) => t.id)).toEqual(['base-1']);
    expect(out.annotations.map((a) => a.id)).toEqual(['a-base']);
    expect(out.aoeTemplates).toEqual([]);
    expect(out.strokes).toEqual([]);
    expect(out.background.imageId).toBeNull();
    expect(out.grid.cols).toBe(base.grid.cols);
    expect(out.fog.length).toBe(base.fog.length);
  });

  it('selectively merges tokens while keeping everything else', () => {
    const base = baseState();
    const out = mergeImportState(base, importedState(), {
      ...DEFAULT_IMPORT_SELECTION,
      tokens: true,
      background: false,
      grid: false,
      fog: false,
      annotations: false,
      aoeTemplates: false,
      initiative: false,
      strokes: false,
    });
    expect(out.tokens.map((t) => t.id)).toEqual(['imp-1', 'imp-2']);
    // Everything else stayed.
    expect(out.annotations.map((a) => a.id)).toEqual(['a-base']);
    expect(out.background.imageId).toBeNull();
    expect(out.grid.cols).toBe(base.grid.cols);
    expect(out.fog.length).toBe(base.fog.length);
    expect(out.fog[0]).toBe(1);
  });

  it('importing fog auto-imports the grid so dimensions stay consistent', () => {
    const base = baseState();
    const out = mergeImportState(base, importedState(), {
      ...DEFAULT_IMPORT_SELECTION,
      background: false,
      grid: false, // explicitly left false, but fog is true
      fog: true,
      tokens: false,
      annotations: false,
      aoeTemplates: false,
      initiative: false,
      strokes: false,
    });
    // Fog dimensions must match the imported grid's, not the base's.
    expect(out.grid.cols).toBe(40);
    expect(out.grid.rows).toBe(30);
    expect(out.fog.length).toBe(40 * 30);
    expect(out.fog[1]).toBe(1);
  });

  it('does not mutate either input', () => {
    const base = baseState();
    const imp = importedState();
    const baseCopy = JSON.parse(
      JSON.stringify({ ...base, fog: Array.from(base.fog) }),
    );
    const impCopy = JSON.parse(
      JSON.stringify({ ...imp, fog: Array.from(imp.fog) }),
    );
    mergeImportState(base, imp, DEFAULT_IMPORT_SELECTION);
    expect({ ...base, fog: Array.from(base.fog) }).toEqual(baseCopy);
    expect({ ...imp, fog: Array.from(imp.fog) }).toEqual(impCopy);
  });

  it('produces a fresh fog Uint8Array (not aliased with the input)', () => {
    const base = baseState();
    const imp = importedState();
    const out = mergeImportState(base, imp, DEFAULT_IMPORT_SELECTION);
    out.fog[0] = 9;
    expect(imp.fog[0]).toBe(1);
  });
});

describe('summarizeImport', () => {
  it('counts every category for the dialog UI', () => {
    const s = summarizeImport(importedState());
    expect(s.hasBackground).toBe(true);
    expect(s.tokenCount).toBe(2);
    expect(s.annotationCount).toBe(1);
    expect(s.aoeCount).toBe(1);
    expect(s.initiativeCount).toBe(1);
    expect(s.strokeCount).toBe(1);
    expect(s.fogRevealed).toBe(2);
    expect(s.fogTotal).toBe(40 * 30);
    expect(s.gridLabel).toBe('40 × 30');
  });

  it('reports an empty session cleanly', () => {
    const s = summarizeImport(createDefaultState());
    expect(s.hasBackground).toBe(false);
    expect(s.tokenCount).toBe(0);
    expect(s.fogRevealed).toBe(0);
    expect(s.annotationCount).toBe(0);
    expect(s.aoeCount).toBe(0);
    expect(s.initiativeCount).toBe(0);
    expect(s.strokeCount).toBe(0);
  });
});
