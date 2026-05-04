/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountCanvasOutline } from './canvas-outline.js';
import { createDefaultState, type SessionState, type Token, type ID } from '../state/types.js';
import { createWall } from '../state/walls.js';

function tk(over: Partial<Token> = {}): Token {
  return {
    id: over.id ?? 't',
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
    speedFt: 30,
    ...over,
  };
}

function makeState(over: Partial<SessionState> = {}): SessionState {
  return { ...createDefaultState(), ...over };
}

function findOutline(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.canvas-outline');
  if (!el) throw new Error('expected .canvas-outline in the DOM');
  return el;
}

describe('mountCanvasOutline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts a hidden region with the expected ARIA attributes', () => {
    let state = makeState();
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {},
    });
    const el = findOutline();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Canvas outline');
    expect(el.classList.contains('sr-only')).toBe(true);
    handle.destroy();
  });

  it('shows "Canvas is empty" when there are no entities', () => {
    let state = makeState();
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {},
    });
    expect(findOutline().textContent).toContain('Canvas is empty');
    handle.destroy();
  });

  it('renders a heading + list per entity kind with the right counts', () => {
    const t1 = tk({ id: 't1', x: 1, y: 1, label: 'Goblin' });
    const t2 = tk({ id: 't2', x: 5, y: 5, label: 'Orc' });
    const w = createWall({ x1: 0, y1: 0, x2: 100, y2: 0 });
    const state = makeState({
      tokens: [t1, t2],
      walls: [w],
      annotations: [
        { id: 'n', x: 0, y: 200, text: 'gold', color: '#fff', visibility: 'shared' },
      ],
    });
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {},
    });
    const el = findOutline();
    const headings = Array.from(el.querySelectorAll('h3')).map((h) => h.textContent);
    expect(headings).toContain('Tokens (2)');
    expect(headings).toContain('Wall'); // singular for count == 1
    expect(headings).toContain('Note');

    const items = Array.from(el.querySelectorAll('li')).map((li) => li.textContent);
    expect(items.some((t) => t?.includes('Goblin'))).toBe(true);
    expect(items.some((t) => t?.includes('Orc'))).toBe(true);
    expect(items.some((t) => t?.includes('gold'))).toBe(true);
    handle.destroy();
  });

  it('marks the selected entity with " (selected)" + aria-current', () => {
    const t1 = tk({ id: 't1', x: 1, y: 1, label: 'Goblin' });
    const t2 = tk({ id: 't2', x: 2, y: 2, label: 'Orc' });
    const state = makeState({ tokens: [t1, t2] });
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(['t2']),
      subscribe: () => () => {},
    });
    const items = Array.from(findOutline().querySelectorAll('li'));
    expect(items[0]?.textContent).toContain('Goblin');
    expect(items[0]?.textContent).not.toContain('(selected)');
    // Description is "Orc at column X, row Y" — assert both halves
    // are present rather than chaining them ("Orc (selected)") since
    // the position string sits between them.
    expect(items[1]?.textContent).toContain('Orc');
    expect(items[1]?.textContent).toContain('(selected)');
    expect(items[1]?.getAttribute('aria-current')).toBe('true');
    expect(items[0]?.getAttribute('aria-current')).toBeNull();
    handle.destroy();
  });

  it('omits empty kind sections', () => {
    const w = createWall({ x1: 0, y1: 0, x2: 50, y2: 0 });
    const state = makeState({ walls: [w] });
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {},
    });
    const headings = Array.from(findOutline().querySelectorAll('h3')).map(
      (h) => h.textContent,
    );
    // Only the wall section should be present.
    expect(headings).toEqual(['Wall']);
    handle.destroy();
  });

  it('refresh() picks up state changes synchronously (bypassing the debounce)', () => {
    let state = makeState();
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {},
    });
    expect(findOutline().textContent).toContain('Canvas is empty');

    state = makeState({ tokens: [tk({ id: 't', label: 'Bandit' })] });
    handle.refresh();
    expect(findOutline().textContent).toContain('Bandit');
    handle.destroy();
  });

  it('subscribe listener triggers a debounced re-render', () => {
    vi.useFakeTimers();
    let state = makeState();
    const listenerRef: { current: (() => void) | null } = { current: null };
    const handle = mountCanvasOutline({
      getState: () => state,
      getSelectedIds: () => new Set<ID>(),
      subscribe: (l) => {
        listenerRef.current = l;
        return () => {
          listenerRef.current = null;
        };
      },
    });
    state = makeState({ tokens: [tk({ id: 't', label: 'Slime' })] });
    listenerRef.current?.();
    // Pre-debounce: outline still shows the old snapshot ("empty").
    expect(findOutline().textContent).toContain('Canvas is empty');
    vi.advanceTimersByTime(150);
    expect(findOutline().textContent).toContain('Slime');
    handle.destroy();
  });

  it('destroy() unsubscribes + removes the element', () => {
    let unsubCalled = 0;
    const handle = mountCanvasOutline({
      getState: () => makeState(),
      getSelectedIds: () => new Set<ID>(),
      subscribe: () => () => {
        unsubCalled++;
      },
    });
    expect(document.querySelector('.canvas-outline')).not.toBeNull();
    handle.destroy();
    expect(document.querySelector('.canvas-outline')).toBeNull();
    expect(unsubCalled).toBe(1);
  });
});
