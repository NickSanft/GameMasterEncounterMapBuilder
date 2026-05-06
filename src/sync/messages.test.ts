import { describe, it, expect } from 'vitest';
import {
  serializeState,
  deserializeState,
  toSerializablePatch,
  fromSerializablePatch,
  type SerializedSessionState,
} from './messages.js';
import { createDefaultState, type SessionState } from '../state/types.js';

describe('serializeState / deserializeState', () => {
  it('round-trips a default state', () => {
    const state = createDefaultState();
    state.tokens.push({
      id: 't1',
      x: 3,
      y: 2,
      label: 'A',
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
      ownerId: null,
    auras: [],
    speedFt: 30,
    });
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);
    expect(restored.version).toBe(1);
    expect(restored.tokens).toEqual(state.tokens);
    expect(restored.grid).toEqual(state.grid);
    expect(restored.background).toEqual(state.background);
    expect(Array.from(restored.fog)).toEqual(Array.from(state.fog));
  });

  it('serializes Uint8Array fog to number[]', () => {
    const state = createDefaultState();
    state.fog[0] = 1;
    state.fog[5] = 1;
    const serialized = serializeState(state);
    expect(Array.isArray(serialized.fog)).toBe(true);
    expect(serialized.fog[0]).toBe(1);
    expect(serialized.fog[5]).toBe(1);
  });

  it('deserializes fog back into a Uint8Array', () => {
    const state = createDefaultState();
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);
    expect(restored.fog).toBeInstanceOf(Uint8Array);
  });

  it('migrates legacy scale -> scaleX/scaleY', () => {
    const legacy = {
      version: 1,
      grid: createDefaultState().grid,
      background: {
        imageId: 'bg',
        offsetX: 10,
        offsetY: 20,
        scale: 1.5,
      },
      tokens: [],
      fog: new Array(30 * 20).fill(0),
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.background.scaleX).toBe(1.5);
    expect(restored.background.scaleY).toBe(1.5);
  });

  it('defaults light to null for legacy tokens (Phase 56 and earlier)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // light field missing entirely — pre-Phase 57 sessions
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.light).toBeNull();
  });

  it('defaults initiativeMod to 0 for legacy tokens (Phase 68 and earlier)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // initiativeMod field missing entirely — pre-Phase 69 sessions
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.initiativeMod).toBe(0);
  });

  it("defaults timeOfDay to 'none' for legacy saves (Phase 79 and earlier)", () => {
    const legacy = serializeState(createDefaultState());
    delete (legacy as { timeOfDay?: string }).timeOfDay;
    const restored = deserializeState(legacy);
    expect(restored.timeOfDay).toBe('none');
  });

  it('preserves timeOfDay across a serialize / deserialize round-trip', () => {
    const state = createDefaultState();
    state.timeOfDay = 'night';
    const restored = deserializeState(serializeState(state));
    expect(restored.timeOfDay).toBe('night');
  });

  it("collapses unknown timeOfDay values to 'none'", () => {
    const malformed = {
      ...serializeState(createDefaultState()),
      timeOfDay: 'eclipse',
    } as unknown as SerializedSessionState;
    const restored = deserializeState(malformed);
    expect(restored.timeOfDay).toBe('none');
  });

  describe('Phase 139 — auras', () => {
    it('defaults auras to [] for legacy saves (pre-139)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't1',
            x: 0,
            y: 0,
            label: 'A',
            color: '#ff0000',
            imageId: null,
            size: 1,
            // auras field missing entirely
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.auras).toEqual([]);
    });

    it('preserves valid auras across a round-trip', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-aura',
        x: 5,
        y: 5,
        label: 'Cleric',
        color: '#7e57c2',
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
        auras: [
          {
            id: 'a1',
            radius: 50,
            color: '#7e57c2',
            label: 'Bless',
            visibility: 'shared',
          },
          { id: 'a2', radius: 100, color: '#ff5252', visibility: 'gm' },
        ],
        speedFt: 30,
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.auras).toEqual(state.tokens[0]!.auras);
    });

    it('drops malformed aura entries (defensive parse)', () => {
      const state = serializeState(createDefaultState());
      state.tokens.push({
        id: 't-bad',
        x: 0,
        y: 0,
        label: 'X',
        color: '#000',
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
        // 5 entries: 1 valid, 4 malformed.
        auras: [
          { id: 'good', radius: 30, color: '#fff', visibility: 'shared' },
          { id: '', radius: 30, color: '#fff' }, // empty id
          { id: 'a', radius: -1, color: '#fff' }, // non-positive radius
          { id: 'a', radius: 30, color: '' }, // empty color
          'not an object', // wrong type
        ] as never,
      } as never);
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.auras.length).toBe(1);
      expect(restored.tokens[0]!.auras[0]!.id).toBe('good');
    });
  });

  describe('Phase 149 — movement speed (speedFt)', () => {
    it('defaults speedFt to 30 for legacy saves (pre-149)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't1',
            x: 0,
            y: 0,
            label: 'A',
            color: '#ff0000',
            imageId: null,
            size: 1,
            // speedFt missing entirely — pre-149 sessions
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.speedFt).toBe(30);
    });

    it('preserves a custom speedFt across a round-trip', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-fast',
        x: 0,
        y: 0,
        label: 'Monk',
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
        auras: [],
        speedFt: 45,
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.speedFt).toBe(45);
    });

    it('clamps a negative speedFt back to 30 (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't-bad',
        x: 0,
        y: 0,
        label: 'X',
        color: '#000',
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
        auras: [],
        speedFt: -10,
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.speedFt).toBe(30);
    });

    it('treats NaN speedFt as the default (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't-nan',
        x: 0,
        y: 0,
        label: 'X',
        color: '#000',
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
        auras: [],
        speedFt: NaN,
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.speedFt).toBe(30);
    });

    it('allows speedFt = 0 to disable the budget HUD', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-still',
        x: 0,
        y: 0,
        label: 'Statue',
        color: '#aaa',
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
        auras: [],
        speedFt: 0,
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.speedFt).toBe(0);
    });
  });

  describe('Phase 154 — token lock (locked field)', () => {
    it('treats missing `locked` as undefined (legacy saves are unlocked)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't1',
            x: 0,
            y: 0,
            label: 'A',
            color: '#ff0000',
            imageId: null,
            size: 1,
            // locked missing — pre-154 sessions
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.locked).toBeUndefined();
    });

    it('preserves locked: true across a round-trip', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-pinned',
        x: 0,
        y: 0,
        label: 'Statue',
        color: '#aaa',
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
        auras: [],
        speedFt: 0,
        locked: true,
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.locked).toBe(true);
    });

    it('collapses locked: false to undefined (no-op shape)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't-not-locked',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        locked: false,
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.locked).toBeUndefined();
    });

    it('rejects malformed string "true" (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't-malformed',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        locked: 'true',
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.locked).toBeUndefined();
    });

    it('rejects truthy non-boolean (1, "yes") as not-locked (defensive)', () => {
      for (const bad of [1, 'yes', {}, []] as unknown[]) {
        const state = serializeState(createDefaultState());
        (state.tokens as unknown[]).push({
          id: 't-bad',
          x: 0,
          y: 0,
          label: 'A',
          color: '#000',
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
          auras: [],
          speedFt: 30,
          locked: bad,
        });
        const restored = deserializeState(state);
        expect(restored.tokens[0]!.locked).toBeUndefined();
      }
    });

    it('preserves the lock through a clone (defensive copy)', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-pin',
        x: 5,
        y: 5,
        label: 'Pinned',
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
        auras: [],
        speedFt: 30,
        locked: true,
      });
      const restored = deserializeState(serializeState(state));
      // Re-serializing the restored state should still be true.
      const restored2 = deserializeState(serializeState(restored));
      expect(restored2.tokens[0]!.locked).toBe(true);
    });
  });

  describe('Phase 177 — token tags', () => {
    it('treats missing tags as undefined (legacy saves)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't',
            x: 0,
            y: 0,
            label: 'A',
            color: '#fff',
            imageId: null,
            size: 1,
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.tags).toBeUndefined();
    });

    it('round-trips a normalized tag list', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't',
        x: 0,
        y: 0,
        label: 'Goblin',
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
        auras: [],
        speedFt: 30,
        tags: ['goblin', 'minion'],
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.tags).toEqual(['goblin', 'minion']);
    });

    it('lowercases + dedups + drops empties on the deserialize path', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        tags: ['Goblin', 'goblin', '', '  Minion  ', null, 123, 'goblin'],
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.tags).toEqual(['goblin', 'minion']);
    });

    it('caps at 16 entries (defensive against malformed peers)', () => {
      const state = serializeState(createDefaultState());
      const fakeTags = Array.from({ length: 30 }, (_, i) => `tag-${i}`);
      (state.tokens as unknown[]).push({
        id: 't',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        tags: fakeTags,
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.tags).toHaveLength(16);
    });

    it('returns undefined for a non-array tags value', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        tags: 'goblin,minion',
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.tags).toBeUndefined();
    });
  });

  describe('Phase 169 — background fill color', () => {
    it('treats missing fillColor as undefined (legacy saves)', () => {
      const legacy = serializeState(createDefaultState());
      // The serializer doesn't emit `fillColor` for default state
      // (undefined), so the deserialize round-trip should also
      // produce undefined.
      const restored = deserializeState(legacy);
      expect(restored.background.fillColor).toBeUndefined();
    });

    it('preserves fillColor across a round-trip', () => {
      const state = createDefaultState();
      state.background.fillColor = '#2a3a4a';
      const restored = deserializeState(serializeState(state));
      expect(restored.background.fillColor).toBe('#2a3a4a');
    });

    it('collapses non-string fillColor to undefined (defensive)', () => {
      for (const bad of [123, true, null, [], {}] as unknown[]) {
        const state = serializeState(createDefaultState());
        (state.background as { fillColor?: unknown }).fillColor = bad;
        const restored = deserializeState(state);
        expect(restored.background.fillColor).toBeUndefined();
      }
    });

    it('collapses empty-string fillColor to undefined', () => {
      const state = serializeState(createDefaultState());
      (state.background as { fillColor?: unknown }).fillColor = '';
      const restored = deserializeState(state);
      expect(restored.background.fillColor).toBeUndefined();
    });
  });

  describe('Phase 162 — token notes (statblock scratchpad)', () => {
    it('treats missing notes as undefined (legacy saves)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't',
            x: 0,
            y: 0,
            label: 'A',
            color: '#fff',
            imageId: null,
            size: 1,
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.notes).toBeUndefined();
    });

    it('preserves notes across a round-trip', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't',
        x: 0,
        y: 0,
        label: 'Goblin',
        color: '#7e57c2',
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
        auras: [],
        speedFt: 30,
        notes: 'AC 15, +4 to hit, Multiattack 2× scimitar',
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.notes).toBe(
        'AC 15, +4 to hit, Multiattack 2× scimitar',
      );
    });

    it('collapses empty-string notes to undefined (no-op shape)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        notes: '',
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.notes).toBeUndefined();
    });

    it('rejects non-string notes (defensive)', () => {
      for (const bad of [123, true, {}, [], null] as unknown[]) {
        const state = serializeState(createDefaultState());
        (state.tokens as unknown[]).push({
          id: 't',
          x: 0,
          y: 0,
          label: 'A',
          color: '#000',
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
          auras: [],
          speedFt: 30,
          notes: bad,
        });
        const restored = deserializeState(state);
        expect(restored.tokens[0]!.notes).toBeUndefined();
      }
    });
  });

  describe('Phase 158 — travel routes', () => {
    it('defaults travelRoutes to [] for legacy saves (pre-158)', () => {
      const legacy = serializeState(createDefaultState());
      delete (legacy as Partial<typeof legacy>).travelRoutes;
      const restored = deserializeState(legacy);
      expect(restored.travelRoutes).toEqual([]);
    });

    it('round-trips a 3-point GM-only route', () => {
      const state = createDefaultState();
      state.travelRoutes.push({
        id: 'r1',
        color: '#ff8800',
        visibility: 'gm',
        points: [
          { x: 100, y: 200 },
          { x: 300, y: 250 },
          { x: 500, y: 100 },
        ],
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.travelRoutes).toHaveLength(1);
      expect(restored.travelRoutes[0]!.points).toHaveLength(3);
      expect(restored.travelRoutes[0]!.color).toBe('#ff8800');
      expect(restored.travelRoutes[0]!.visibility).toBe('gm');
    });

    it('drops routes with fewer than 2 points (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state as { travelRoutes?: unknown[] }).travelRoutes = [
        { id: 'short', color: '#ff0000', points: [{ x: 0, y: 0 }] },
      ];
      const restored = deserializeState(state);
      expect(restored.travelRoutes).toEqual([]);
    });

    it('drops routes with non-finite coords (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state as { travelRoutes?: unknown[] }).travelRoutes = [
        {
          id: 'bad',
          color: '#000',
          points: [
            { x: 0, y: NaN },
            { x: 100, y: 100 },
          ],
        },
      ];
      const restored = deserializeState(state);
      // The NaN point is dropped; only one valid point remains —
      // route fails the >=2 threshold and is itself dropped.
      expect(restored.travelRoutes).toEqual([]);
    });

    it('collapses unknown visibility to "gm" (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state as { travelRoutes?: unknown[] }).travelRoutes = [
        {
          id: 'r',
          color: '#ff0',
          visibility: 'public',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ];
      const restored = deserializeState(state);
      expect(restored.travelRoutes).toHaveLength(1);
      expect(restored.travelRoutes[0]!.visibility).toBe('gm');
    });

    it('preserves "shared" visibility', () => {
      const state = createDefaultState();
      state.travelRoutes.push({
        id: 'r',
        color: '#0f0',
        visibility: 'shared',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.travelRoutes[0]!.visibility).toBe('shared');
    });
  });

  describe('Phase 156 — token vehicle (parentId field)', () => {
    it('treats missing `parentId` as null (legacy saves are unparented)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        tokens: [
          {
            id: 't1',
            x: 0,
            y: 0,
            label: 'A',
            color: '#ff0000',
            imageId: null,
            size: 1,
            // parentId missing — pre-156 sessions
          },
        ],
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.tokens[0]!.parentId).toBeUndefined();
    });

    it('preserves parentId across a round-trip', () => {
      const state = createDefaultState();
      state.tokens.push({
        id: 't-rider',
        x: 5,
        y: 5,
        label: 'Rider',
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
        auras: [],
        speedFt: 30,
        parentId: 't-horse',
      });
      const restored = deserializeState(serializeState(state));
      expect(restored.tokens[0]!.parentId).toBe('t-horse');
    });

    it('rejects empty-string parentId (defensive — collapses to null)', () => {
      const state = serializeState(createDefaultState());
      (state.tokens as unknown[]).push({
        id: 't',
        x: 0,
        y: 0,
        label: 'A',
        color: '#000',
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
        auras: [],
        speedFt: 30,
        parentId: '',
      });
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.parentId).toBeUndefined();
    });

    it('rejects non-string parentId (defensive)', () => {
      for (const bad of [123, true, {}, []] as unknown[]) {
        const state = serializeState(createDefaultState());
        (state.tokens as unknown[]).push({
          id: 't',
          x: 0,
          y: 0,
          label: 'A',
          color: '#000',
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
          auras: [],
          speedFt: 30,
          parentId: bad,
        });
        const restored = deserializeState(state);
        expect(restored.tokens[0]!.parentId).toBeUndefined();
      }
    });
  });

  describe('Phase 140 — background orientation', () => {
    it('defaults rotation/flipX/flipY for legacy saves (pre-140)', () => {
      const legacy = {
        ...serializeState(createDefaultState()),
        background: {
          imageId: null,
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          // rotation / flipX / flipY missing entirely
        },
      } as unknown as SerializedSessionState;
      const restored = deserializeState(legacy);
      expect(restored.background.rotation).toBe(0);
      expect(restored.background.flipX).toBe(false);
      expect(restored.background.flipY).toBe(false);
    });

    it('preserves orientation across a round-trip', () => {
      const state = createDefaultState();
      state.background.rotation = Math.PI / 2;
      state.background.flipX = true;
      state.background.flipY = false;
      const restored = deserializeState(serializeState(state));
      expect(restored.background.rotation).toBeCloseTo(Math.PI / 2, 6);
      expect(restored.background.flipX).toBe(true);
      expect(restored.background.flipY).toBe(false);
    });

    it('clamps a NaN rotation back to 0 (defensive)', () => {
      const state = serializeState(createDefaultState());
      (state.background as { rotation?: number }).rotation = NaN;
      const restored = deserializeState(state);
      expect(restored.background.rotation).toBe(0);
    });

    it('treats non-true flipX / flipY values as false', () => {
      const state = serializeState(createDefaultState());
      (state.background as { flipX?: unknown }).flipX = 'yes';
      (state.background as { flipY?: unknown }).flipY = 1;
      const restored = deserializeState(state);
      expect(restored.background.flipX).toBe(false);
      expect(restored.background.flipY).toBe(false);
    });

  });

  describe('Phase 139 — auras (collapse unknown visibility)', () => {
    it("collapses unknown visibility values to 'shared'", () => {
      const state = serializeState(createDefaultState());
      state.tokens.push({
        id: 't-aura',
        x: 0,
        y: 0,
        label: 'A',
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
        auras: [
          { id: 'a1', radius: 30, color: '#fff', visibility: 'frob' },
        ] as never,
      } as never);
      const restored = deserializeState(state);
      expect(restored.tokens[0]!.auras[0]!.visibility).toBe('shared');
    });
  });

  it("defaults weather to 'none' for legacy saves (Phase 78 and earlier)", () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      // weather field missing entirely.
    } as unknown as SerializedSessionState;
    delete (legacy as { weather?: string }).weather;
    const restored = deserializeState(legacy);
    expect(restored.weather).toBe('none');
  });

  it('preserves weather across a serialize / deserialize round-trip', () => {
    const state = createDefaultState();
    state.weather = 'rain';
    const restored = deserializeState(serializeState(state));
    expect(restored.weather).toBe('rain');
  });

  it("collapses unknown weather values to 'none'", () => {
    const malformed = {
      ...serializeState(createDefaultState()),
      weather: 'tornado', // not a valid kind
    } as unknown as SerializedSessionState;
    const restored = deserializeState(malformed);
    expect(restored.weather).toBe('none');
  });

  it('defaults conditionExpirations to {} for legacy tokens (Phase 69 and earlier)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // conditionExpirations missing entirely — pre-Phase 70 sessions
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.conditionExpirations).toEqual({});
  });

  it('filters garbage conditionExpirations entries down to positive integers', () => {
    const malformed = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 'a',
          x: 0,
          y: 0,
          label: 'A',
          color: '#fff',
          imageId: null,
          size: 1,
          conditionExpirations: {
            good: 5,
            zero: 0,          // dropped: not > 0
            negative: -3,     // dropped: not > 0
            notANumber: 'six',// dropped: not a number
            infinite: Infinity,// dropped: not finite
            fractional: 4.9,  // kept and floored
          },
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(malformed);
    expect(restored.tokens[0]!.conditionExpirations).toEqual({
      good: 5,
      fractional: 4,
    });
  });

  it('defaults deathSaves to {0, 0} for legacy tokens (Phase 71 and earlier)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // deathSaves missing entirely — pre-Phase 72 sessions
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('clamps deathSaves counts to [0, 3] and floors fractions', () => {
    const malformed = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 'a', x: 0, y: 0, label: 'A', color: '#fff', imageId: null, size: 1,
          deathSaves: { successes: 99, failures: -5 },
        },
        {
          id: 'b', x: 0, y: 0, label: 'B', color: '#fff', imageId: null, size: 1,
          deathSaves: { successes: 1.7, failures: 'three' },
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(malformed);
    expect(restored.tokens[0]!.deathSaves).toEqual({ successes: 3, failures: 0 });
    // 1.7 floors to 1; non-numeric failures collapses to 0.
    expect(restored.tokens[1]!.deathSaves).toEqual({ successes: 1, failures: 0 });
  });

  it('clamps initiativeMod to [-20, 20] and rounds non-integers', () => {
    const malformed = {
      ...serializeState(createDefaultState()),
      tokens: [
        { id: 'a', x: 0, y: 0, label: 'A', color: '#fff', imageId: null, size: 1, initiativeMod: 999 },
        { id: 'b', x: 0, y: 0, label: 'B', color: '#fff', imageId: null, size: 1, initiativeMod: -50 },
        { id: 'c', x: 0, y: 0, label: 'C', color: '#fff', imageId: null, size: 1, initiativeMod: 2.7 },
        { id: 'd', x: 0, y: 0, label: 'D', color: '#fff', imageId: null, size: 1, initiativeMod: 'bogus' },
        { id: 'e', x: 0, y: 0, label: 'E', color: '#fff', imageId: null, size: 1, initiativeMod: NaN },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(malformed);
    expect(restored.tokens[0]!.initiativeMod).toBe(20);
    expect(restored.tokens[1]!.initiativeMod).toBe(-20);
    expect(restored.tokens[2]!.initiativeMod).toBe(3);
    expect(restored.tokens[3]!.initiativeMod).toBe(0);
    expect(restored.tokens[4]!.initiativeMod).toBe(0);
  });

  it('clamps a serialized light: dim raised to bright when smaller', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          light: { bright: 50, dim: 20, color: '#fff' },
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    // Dim < bright is normalized: dim becomes max(bright, dim).
    expect(restored.tokens[0]!.light).toEqual({
      bright: 50,
      dim: 50,
      color: '#fff',
    });
  });

  it('rejects a malformed light (NaN) by setting light to null', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          light: { bright: NaN, dim: 30, color: '#fff' },
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.light).toBeNull();
  });

  it('defaults light.color when missing', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          light: { bright: 50, dim: 100 },
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.light?.color).toBe('#ffe1a4');
  });

  it('defaults borderColor to null for legacy tokens', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // borderColor missing entirely
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.borderColor).toBeNull();
  });

  it('Phase 126 — defaults ownerId to null for pre-126 tokens (missing field)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#ff0000',
          imageId: null,
          size: 1,
          // ownerId missing entirely
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.ownerId).toBeNull();
  });

  it('Phase 126 — preserves a non-empty ownerId on round-trip', () => {
    const state = createDefaultState();
    state.tokens.push({
      id: 't1',
      x: 0,
      y: 0,
      label: 'Owned',
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
      ownerId: 'spec-42',
      auras: [],
    speedFt: 30,
    });
    const restored = deserializeState(serializeState(state));
    expect(restored.tokens[0]!.ownerId).toBe('spec-42');
  });

  it('Phase 126 — collapses empty-string ownerId to null (defensive)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#fff',
          imageId: null,
          size: 1,
          ownerId: '',
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.ownerId).toBeNull();
  });

  it('Phase 126 — collapses non-string ownerId to null (defensive)', () => {
    const legacy = {
      ...serializeState(createDefaultState()),
      tokens: [
        {
          id: 't1',
          x: 0,
          y: 0,
          label: 'A',
          color: '#fff',
          imageId: null,
          size: 1,
          ownerId: 42 as unknown as string,
        },
      ],
    } as unknown as SerializedSessionState;
    const restored = deserializeState(legacy);
    expect(restored.tokens[0]!.ownerId).toBeNull();
  });

  it('handles missing background fields with sensible defaults', () => {
    const serialized = serializeState(createDefaultState());
    // Clone so we mutate safely
    const minimal = JSON.parse(JSON.stringify(serialized)) as SerializedSessionState;
    delete (minimal.background as Partial<typeof minimal.background>).offsetX;
    delete (minimal.background as Partial<typeof minimal.background>).offsetY;
    (minimal.background as { scaleX?: number }).scaleX = undefined;
    (minimal.background as { scaleY?: number }).scaleY = undefined;
    const restored = deserializeState(minimal);
    expect(restored.background.offsetX).toBe(0);
    expect(restored.background.offsetY).toBe(0);
    expect(restored.background.scaleX).toBe(1);
    expect(restored.background.scaleY).toBe(1);
  });
});

describe('toSerializablePatch / fromSerializablePatch', () => {
  it('round-trips session-reset patches through JSON', () => {
    const state: SessionState = createDefaultState();
    state.fog[5] = 1;
    const wire = toSerializablePatch({ kind: 'session-reset', state });
    expect(wire.kind).toBe('session-reset');
    // wire.state must be JSON-safe
    const cloned = JSON.parse(JSON.stringify(wire));
    const back = fromSerializablePatch(cloned);
    if (back.kind !== 'session-reset') throw new Error('unexpected kind');
    expect(back.state.fog).toBeInstanceOf(Uint8Array);
    expect(back.state.fog[5]).toBe(1);
  });

  it('passes non-reset patches through unchanged', () => {
    const patch = {
      kind: 'token-update',
      id: 'x',
      changes: { label: 'y' },
    } as const;
    expect(toSerializablePatch(patch)).toEqual(patch);
    expect(fromSerializablePatch(patch)).toEqual(patch);
  });
});
