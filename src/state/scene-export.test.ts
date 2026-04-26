/**
 * Phase 98 — per-scene export / import tests.
 *
 * Exercises the JSON wire format roundtrip + the failure modes the
 * UI surfaces (wrong kind, bad version, missing state, malformed
 * JSON). Image storage is exercised via fake-indexeddb.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { exportScene, importScene } from './scene-export.js';
import { _resetDBForTests } from './idb.js';
import { createDefaultState } from './types.js';

beforeEach(() => {
  _resetDBForTests();
});

function stateWithToken(label: string) {
  const s = createDefaultState();
  s.tokens.push({
    id: `t-${label}`,
    x: 1,
    y: 2,
    label,
    color: '#ff0000',
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
  });
  return s;
}

describe('exportScene', () => {
  it('round-trips a scene with no images', async () => {
    const state = stateWithToken('Goblin');
    const json = await exportScene('Throne Room', state);
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe('scene');
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe('Throne Room');
    expect(parsed.state).toBeTruthy();
    expect(parsed.images).toEqual([]);
    expect(typeof parsed.exportedAt).toBe('string');
  });

  it('falls back to "Imported scene" when name is empty / whitespace', async () => {
    const state = stateWithToken('A');
    const json = await exportScene('   ', state);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Imported scene');
  });
});

describe('importScene', () => {
  it('hydrates a round-tripped scene', async () => {
    const state = stateWithToken('Orc');
    const json = await exportScene('Goblin Cave', state);
    const out = await importScene(json);
    expect(out.name).toBe('Goblin Cave');
    expect(out.state.tokens).toHaveLength(1);
    expect(out.state.tokens[0]!.label).toBe('Orc');
    expect(out.imageIds).toEqual([]);
  });

  it('rejects non-JSON input', async () => {
    await expect(importScene('not json')).rejects.toThrow(/Not valid JSON/);
  });

  it('rejects a session export (wrong kind)', async () => {
    const fakeSession = JSON.stringify({
      version: 1,
      kind: 'session',
      state: {},
    });
    await expect(importScene(fakeSession)).rejects.toThrow(
      /Not a scene export/,
    );
  });

  it('rejects a doc with no kind set (defaults to "session" in the error)', async () => {
    const fakeDoc = JSON.stringify({ version: 1, state: {} });
    await expect(importScene(fakeDoc)).rejects.toThrow(/Not a scene export/);
  });

  it('rejects an unsupported version', async () => {
    const future = JSON.stringify({
      version: 99,
      kind: 'scene',
      state: {},
    });
    await expect(importScene(future)).rejects.toThrow(
      /Unsupported scene-export version/,
    );
  });

  it('rejects a doc missing state', async () => {
    const noState = JSON.stringify({ version: 1, kind: 'scene', name: 'x' });
    await expect(importScene(noState)).rejects.toThrow(
      /missing state/,
    );
  });

  it('falls back to "Imported scene" when imported name is missing', async () => {
    // Hand-craft a doc with name omitted but otherwise valid.
    const state = stateWithToken('A');
    const json = await exportScene('Original', state);
    const parsed = JSON.parse(json);
    delete parsed.name;
    const out = await importScene(JSON.stringify(parsed));
    expect(out.name).toBe('Imported scene');
  });
});
