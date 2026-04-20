import { describe, it, expect, beforeEach } from 'vitest';
import {
  createScene,
  listScenes,
  getScene,
  getSceneState,
  renameScene,
  deleteScene,
  duplicateScene,
  saveScene,
  getActiveSceneId,
  setActiveSceneId,
  ensureActiveScene,
  ACTIVE_SCENE_ID_KEY,
} from './scenes.js';
import { _resetDBForTests, runTx, SESSIONS_STORE, LEGACY_ACTIVE_SESSION_ID } from './idb.js';
import { createDefaultState } from './types.js';
import { serializeState } from '../sync/messages.js';

beforeEach(() => {
  _resetDBForTests();
  localStorage.removeItem(ACTIVE_SCENE_ID_KEY);
});

describe('createScene + listScenes', () => {
  it('empty DB returns an empty list', async () => {
    expect(await listScenes()).toEqual([]);
  });

  it('created scenes appear in listScenes (newest first)', async () => {
    const a = await createScene('Tavern brawl');
    await new Promise((r) => setTimeout(r, 2));
    const b = await createScene('Dragon lair');
    const list = await listScenes();
    expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
    expect(list[0]!.name).toBe('Dragon lair');
  });

  it('list omits the (potentially-large) state blob', async () => {
    await createScene('x');
    const [entry] = await listScenes();
    expect(entry).toBeDefined();
    expect((entry as unknown as { state?: unknown }).state).toBeUndefined();
  });
});

describe('getScene / getSceneState', () => {
  it('round-trips a scene with default state', async () => {
    const { id } = await createScene('Test');
    const record = await getScene(id);
    expect(record?.name).toBe('Test');
    const state = await getSceneState(id);
    expect(state?.tokens).toEqual([]);
  });

  it('returns null for unknown ids', async () => {
    expect(await getScene('nope')).toBeNull();
    expect(await getSceneState('nope')).toBeNull();
  });
});

describe('renameScene + deleteScene', () => {
  it('renameScene updates the name + bumps updatedAt', async () => {
    const { id, updatedAt } = await createScene('Old name');
    await new Promise((r) => setTimeout(r, 2));
    await renameScene(id, 'New name');
    const r = await getScene(id);
    expect(r?.name).toBe('New name');
    expect(r!.updatedAt).toBeGreaterThan(updatedAt);
  });

  it('renameScene trims whitespace and ignores empty names', async () => {
    const { id } = await createScene('Before');
    await renameScene(id, '   ');
    const r = await getScene(id);
    expect(r?.name).toBe('Before');
  });

  it('deleteScene removes the record', async () => {
    const { id } = await createScene('Gone');
    await deleteScene(id);
    expect(await getScene(id)).toBeNull();
  });
});

describe('duplicateScene', () => {
  it('creates an independent copy with the same state', async () => {
    const original = await createScene('Original');
    // Mutate the original's state via saveScene so the copy actually
    // has something to compare against.
    const state = createDefaultState();
    state.tokens.push({
      id: 't1',
      x: 3,
      y: 3,
      label: 'A',
      color: '#fff',
      imageId: null,
      size: 1,
      borderColor: null,
      hp: null,
      conditions: [],
      rotation: 0,
    });
    await saveScene(original.id, state);

    const copy = await duplicateScene(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Original (copy)');
    const copyState = await getSceneState(copy.id);
    expect(copyState?.tokens).toHaveLength(1);
    expect(copyState?.tokens[0]?.id).toBe('t1');
  });

  it('accepts a custom name', async () => {
    const src = await createScene('Source');
    const copy = await duplicateScene(src.id, 'Fresh name');
    expect(copy.name).toBe('Fresh name');
  });

  it('throws on unknown source id', async () => {
    await expect(duplicateScene('bogus')).rejects.toThrow();
  });
});

describe('active-scene pointer', () => {
  it('returns null when no pointer is set', () => {
    expect(getActiveSceneId()).toBeNull();
  });

  it('round-trips through localStorage', () => {
    setActiveSceneId('scene-abc');
    expect(getActiveSceneId()).toBe('scene-abc');
  });
});

describe('ensureActiveScene', () => {
  it('creates a blank scene on a fresh DB', async () => {
    const id = await ensureActiveScene();
    expect(id).toBeDefined();
    const list = await listScenes();
    expect(list).toHaveLength(1);
    expect(getActiveSceneId()).toBe(id);
  });

  it('reuses the pointed-at scene when it exists', async () => {
    const { id } = await createScene('Persistent');
    setActiveSceneId(id);
    const ensured = await ensureActiveScene();
    expect(ensured).toBe(id);
    // No extra scene was created.
    expect((await listScenes()).length).toBe(1);
  });

  it('falls back to the newest scene when the pointer is stale', async () => {
    const a = await createScene('A');
    await new Promise((r) => setTimeout(r, 2));
    const b = await createScene('B');
    setActiveSceneId('does-not-exist');
    const ensured = await ensureActiveScene();
    expect(ensured).toBe(b.id);
    expect(getActiveSceneId()).toBe(b.id);
    // a is still there but not active.
    expect(await getScene(a.id)).not.toBeNull();
  });

  it('promotes a legacy 0.39 session blob into a named scene on first call', async () => {
    // Seed the legacy record directly so we bypass the scene layer.
    const state = createDefaultState();
    state.tokens.push({
      id: 'legacy',
      x: 2,
      y: 2,
      label: 'Legacy',
      color: '#aaa',
      imageId: null,
      size: 1,
      borderColor: null,
      hp: null,
      conditions: [],
      rotation: 0,
    });
    await runTx(SESSIONS_STORE, 'readwrite', (s) =>
      s.put({
        id: LEGACY_ACTIVE_SESSION_ID,
        state: serializeState(state),
        updatedAt: Date.now(),
      }),
    );

    const id = await ensureActiveScene();
    const promoted = await getSceneState(id);
    expect(promoted?.tokens[0]?.id).toBe('legacy');

    // The legacy record should be gone.
    const residual = await runTx<unknown>(SESSIONS_STORE, 'readonly', (s) =>
      s.get(LEGACY_ACTIVE_SESSION_ID),
    );
    expect(residual).toBeUndefined();
  });
});
