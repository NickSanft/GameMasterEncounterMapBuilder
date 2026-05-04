import { describe, it, expect } from 'vitest';
import {
  entitiesInReadingOrder,
  nextEntityId,
  describeEntity,
} from './canvas-nav.js';
import { createDefaultState, type SessionState, type Token } from './types.js';
import { createWall } from './walls.js';

function tk(over: Partial<Token> = {}): Token {
  return {
    id: over.id ?? `t-${Math.random().toString(36).slice(2, 8)}`,
    x: 0,
    y: 0,
    label: '',
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
    ...over,
  };
}

function makeState(over: Partial<SessionState> = {}): SessionState {
  return { ...createDefaultState(), ...over };
}

describe('entitiesInReadingOrder', () => {
  it('returns an empty array when the state has no entities', () => {
    expect(entitiesInReadingOrder(makeState())).toEqual([]);
  });

  it('lists tokens in row-band, then column order', () => {
    const a = tk({ id: 'a', x: 5, y: 0 });
    const b = tk({ id: 'b', x: 1, y: 0 });
    const c = tk({ id: 'c', x: 0, y: 5 });
    const out = entitiesInReadingOrder(makeState({ tokens: [a, b, c] }));
    expect(out.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('intermixes tokens, walls, AoE, and annotations by visual position', () => {
    // grid cellSize default = 50.
    const t = tk({ id: 'tok', x: 1, y: 1 }); // world (50, 50)
    const w = createWall({ x1: 100, y1: 100, x2: 200, y2: 100 }); // mid (150, 100)
    const state = makeState({
      tokens: [t],
      walls: [w],
      annotations: [
        { id: 'note', x: 0, y: 200, text: 'pile', color: '#fff', visibility: 'shared' },
      ],
      aoeTemplates: [
        {
          id: 'aoe',
          kind: 'sphere',
          x: 250,
          y: 250,
          length: 0,
          width: 100,
          rotation: 0,
          color: '#ff0000',
          visibility: 'shared',
        },
      ],
    });
    const order = entitiesInReadingOrder(state);
    expect(order.map((e) => `${e.kind}:${e.id}`)).toEqual([
      'token:tok',     // y=50
      'wall:' + w.id,  // y=100
      'annotation:note', // y=200
      'aoe:aoe',       // y=250
    ]);
  });

  it('ties on the same row sort by x', () => {
    const a = tk({ id: 'a', x: 5, y: 2 });
    const b = tk({ id: 'b', x: 1, y: 2 });
    const c = tk({ id: 'c', x: 3, y: 2 });
    const order = entitiesInReadingOrder(makeState({ tokens: [a, b, c] }));
    expect(order.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('is stable across calls (deterministic)', () => {
    const t = tk({ id: 'x', x: 0, y: 0 });
    const u = tk({ id: 'y', x: 0, y: 0 });
    const state = makeState({ tokens: [t, u] });
    const a = entitiesInReadingOrder(state);
    const b = entitiesInReadingOrder(state);
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
  });
});

describe('nextEntityId', () => {
  const t1 = tk({ id: 't1', x: 0, y: 0 });
  const t2 = tk({ id: 't2', x: 5, y: 0 });
  const t3 = tk({ id: 't3', x: 0, y: 5 });
  const state = makeState({ tokens: [t1, t2, t3] });

  it('returns null when there are no entities', () => {
    expect(nextEntityId(makeState(), new Set(), 'next')).toBeNull();
    expect(nextEntityId(makeState(), new Set(), 'prev')).toBeNull();
  });

  it('returns the first entity for next on empty selection', () => {
    expect(nextEntityId(state, new Set(), 'next')).toBe('t1');
  });

  it('returns the last entity for prev on empty selection', () => {
    expect(nextEntityId(state, new Set(), 'prev')).toBe('t3');
  });

  it('cycles to the next entity from a single selection', () => {
    expect(nextEntityId(state, new Set(['t1']), 'next')).toBe('t2');
    expect(nextEntityId(state, new Set(['t2']), 'next')).toBe('t3');
  });

  it('wraps around at the end', () => {
    expect(nextEntityId(state, new Set(['t3']), 'next')).toBe('t1');
    expect(nextEntityId(state, new Set(['t1']), 'prev')).toBe('t3');
  });

  it('multi-select collapses to the entity AFTER the last in cycle order', () => {
    expect(nextEntityId(state, new Set(['t1', 't2']), 'next')).toBe('t3');
  });

  it('multi-select prev collapses to the entity BEFORE the first', () => {
    expect(nextEntityId(state, new Set(['t2', 't3']), 'prev')).toBe('t1');
  });

  it('a stale selection (id no longer in state) starts fresh', () => {
    expect(nextEntityId(state, new Set(['ghost']), 'next')).toBe('t1');
    expect(nextEntityId(state, new Set(['ghost']), 'prev')).toBe('t3');
  });

  it('mixed-stale selection ignores the ghost ids', () => {
    // 't1' is real, 'ghost' isn't — should behave as if just t1 is selected.
    expect(nextEntityId(state, new Set(['t1', 'ghost']), 'next')).toBe('t2');
  });
});

describe('describeEntity', () => {
  it('describes a token with label, position, and HP', () => {
    const t = tk({
      id: 't',
      x: 4,
      y: 6,
      label: 'Goblin',
      hp: { current: 3, max: 7, visibility: 'shared' },
    });
    const out = describeEntity(makeState({ tokens: [t] }), 't');
    expect(out).toBe('Goblin at column 5, row 7, 3 of 7 HP');
  });

  it('falls back to "Token" when the label is empty', () => {
    const t = tk({ id: 't', x: 0, y: 0, label: '   ' });
    const out = describeEntity(makeState({ tokens: [t] }), 't');
    expect(out).toBe('Token at column 1, row 1');
  });

  it('describes a wall with its length in squares', () => {
    // cellSize default 50; (0,0)-(150,0) = 150 px = 3 squares.
    const w = createWall({ x1: 0, y1: 0, x2: 150, y2: 0 });
    const out = describeEntity(makeState({ walls: [w] }), w.id);
    expect(out).toBe('Wall, 3 squares long');
  });

  it('singular for a 1-square wall', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 50, y2: 0 });
    const out = describeEntity(makeState({ walls: [w] }), w.id);
    expect(out).toContain('1 square long');
    expect(out).not.toContain('squares');
  });

  it('annotates GM-only / non-blocking flags', () => {
    const w = createWall({
      x1: 0, y1: 0, x2: 100, y2: 0,
      blocksSight: false,
      blocksMovement: false,
      visibility: 'gm',
    });
    const out = describeEntity(makeState({ walls: [w] }), w.id);
    expect(out).toContain('does not block sight');
    expect(out).toContain('does not block movement');
    expect(out).toContain('GM-only');
  });

  it('describes AoE templates by kind', () => {
    const state = makeState({
      aoeTemplates: [
        {
          id: 'a',
          kind: 'cone',
          x: 0,
          y: 0,
          length: 30,
          width: 60,
          rotation: 0,
          color: '#ff0000',
          visibility: 'gm',
        },
      ],
    });
    expect(describeEntity(state, 'a')).toBe('Cone AoE template, GM-only');
  });

  it('describes annotations with their text', () => {
    const state = makeState({
      annotations: [
        { id: 'n', x: 0, y: 0, text: 'gold pile', color: '#fff', visibility: 'shared' },
      ],
    });
    expect(describeEntity(state, 'n')).toBe('Note: gold pile');
  });

  it('returns null for an unknown id', () => {
    expect(describeEntity(makeState(), 'ghost')).toBeNull();
  });
});
