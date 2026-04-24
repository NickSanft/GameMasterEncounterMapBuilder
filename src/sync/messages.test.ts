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
