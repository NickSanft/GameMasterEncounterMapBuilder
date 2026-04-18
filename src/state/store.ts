import {
  createDefaultState,
  type SessionState,
  type StatePatch,
} from './types.js';
import { sortByValue } from './initiative.js';

export type StoreListener = (patch: StatePatch | null) => void;

export interface Store {
  getState(): SessionState;
  applyPatch(patch: StatePatch): void;
  loadState(state: SessionState): void;
  resetSession(): void;
  batch(fn: () => void): void;
  subscribe(listener: StoreListener): () => void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}

const UNDO_LIMIT = 50;
const COALESCE_WINDOW_MS = 400;

function snapshot(s: SessionState): SessionState {
  return {
    version: s.version,
    grid: { ...s.grid },
    background: { ...s.background },
    tokens: s.tokens.map((t) => ({ ...t })),
    fog: new Uint8Array(s.fog),
    annotations: s.annotations.map((a) => ({ ...a })),
    aoeTemplates: s.aoeTemplates.map((a) => ({ ...a })),
    initiative: {
      order: s.initiative.order.map((e) => ({ ...e })),
      activeId: s.initiative.activeId,
      round: s.initiative.round,
    },
  };
}

function coalesceKey(patch: StatePatch): string | null {
  switch (patch.kind) {
    case 'token-update':
      return `token-update:${patch.id}`;
    case 'fog-set':
      return 'fog-set';
    case 'background-update':
      return 'background-update';
    case 'annotation-update':
      return `annotation-update:${patch.id}`;
    case 'aoe-update':
      return `aoe-update:${patch.id}`;
    case 'initiative-update':
      return `initiative-update:${patch.id}`;
    default:
      return null;
  }
}

export function createStore(initial?: SessionState): Store {
  let state: SessionState = initial ?? createDefaultState();
  const listeners = new Set<StoreListener>();
  const undoStack: SessionState[] = [];
  const redoStack: SessionState[] = [];
  let silent = false;
  let lastKey: string | null = null;
  let lastKeyTime = 0;
  let batchDepth = 0;
  let batchSnapshot: SessionState | null = null;
  let batchPreState: SessionState | null = null;

  function notify(patch: StatePatch | null) {
    for (const l of listeners) l(patch);
  }

  function pushHistory(key: string | null) {
    const now = performance.now();
    const canCoalesce =
      key !== null && key === lastKey && now - lastKeyTime < COALESCE_WINDOW_MS;
    if (!canCoalesce) {
      undoStack.push(snapshot(state));
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
      redoStack.length = 0;
    }
    lastKey = key;
    lastKeyTime = now;
  }

  function applyPatch(patch: StatePatch): void {
    if (!silent && batchDepth === 0) pushHistory(coalesceKey(patch));

    switch (patch.kind) {
      case 'token-add':
        state = { ...state, tokens: [...state.tokens, patch.token] };
        break;
      case 'token-update': {
        const idx = state.tokens.findIndex((t) => t.id === patch.id);
        if (idx === -1) return;
        const existing = state.tokens[idx]!;
        const next = { ...existing, ...patch.changes };
        const tokens = state.tokens.slice();
        tokens[idx] = next;
        state = { ...state, tokens };
        break;
      }
      case 'token-remove':
        state = {
          ...state,
          tokens: state.tokens.filter((t) => t.id !== patch.id),
        };
        break;
      case 'fog-set': {
        const fog = new Uint8Array(state.fog);
        const { cols, rows } = state.grid;
        for (const cell of patch.cells) {
          if (cell.x < 0 || cell.x >= cols || cell.y < 0 || cell.y >= rows) continue;
          fog[cell.y * cols + cell.x] = cell.value;
        }
        state = { ...state, fog };
        break;
      }
      case 'grid-update': {
        const grid = { ...state.grid, ...patch.changes };
        let fog = state.fog;
        if (
          patch.changes.cols !== undefined ||
          patch.changes.rows !== undefined
        ) {
          const oldCols = state.grid.cols;
          const oldRows = state.grid.rows;
          const next = new Uint8Array(grid.cols * grid.rows);
          const cols = Math.min(oldCols, grid.cols);
          const rows = Math.min(oldRows, grid.rows);
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              next[y * grid.cols + x] = state.fog[y * oldCols + x]!;
            }
          }
          fog = next;
        }
        state = { ...state, grid, fog };
        break;
      }
      case 'background-update':
        state = {
          ...state,
          background: { ...state.background, ...patch.changes },
        };
        break;
      case 'annotation-add':
        state = {
          ...state,
          annotations: [...state.annotations, patch.annotation],
        };
        break;
      case 'annotation-update': {
        const idx = state.annotations.findIndex((a) => a.id === patch.id);
        if (idx === -1) return;
        const existing = state.annotations[idx]!;
        const next = { ...existing, ...patch.changes };
        const annotations = state.annotations.slice();
        annotations[idx] = next;
        state = { ...state, annotations };
        break;
      }
      case 'annotation-remove':
        state = {
          ...state,
          annotations: state.annotations.filter((a) => a.id !== patch.id),
        };
        break;
      case 'aoe-add':
        state = {
          ...state,
          aoeTemplates: [...state.aoeTemplates, patch.template],
        };
        break;
      case 'aoe-update': {
        const idx = state.aoeTemplates.findIndex((a) => a.id === patch.id);
        if (idx === -1) return;
        const existing = state.aoeTemplates[idx]!;
        const next = { ...existing, ...patch.changes };
        const aoeTemplates = state.aoeTemplates.slice();
        aoeTemplates[idx] = next;
        state = { ...state, aoeTemplates };
        break;
      }
      case 'aoe-remove':
        state = {
          ...state,
          aoeTemplates: state.aoeTemplates.filter((a) => a.id !== patch.id),
        };
        break;
      case 'initiative-add': {
        const order = sortByValue([...state.initiative.order, patch.entry]);
        state = {
          ...state,
          initiative: { ...state.initiative, order },
        };
        break;
      }
      case 'initiative-update': {
        const idx = state.initiative.order.findIndex((e) => e.id === patch.id);
        if (idx === -1) return;
        const existing = state.initiative.order[idx]!;
        const next = { ...existing, ...patch.changes };
        let order = state.initiative.order.slice();
        order[idx] = next;
        if (patch.changes.value !== undefined) order = sortByValue(order);
        state = {
          ...state,
          initiative: { ...state.initiative, order },
        };
        break;
      }
      case 'initiative-remove': {
        const order = state.initiative.order.filter((e) => e.id !== patch.id);
        const activeId =
          state.initiative.activeId === patch.id
            ? null
            : state.initiative.activeId;
        const round = order.length === 0 ? 0 : state.initiative.round;
        state = {
          ...state,
          initiative: { order, activeId, round },
        };
        break;
      }
      case 'initiative-set-active': {
        state = {
          ...state,
          initiative: {
            ...state.initiative,
            activeId: patch.activeId,
            round: patch.round,
          },
        };
        break;
      }
      case 'session-reset':
        state = patch.state;
        break;
    }
    notify(patch);
  }

  function loadState(next: SessionState): void {
    if (!silent && batchDepth === 0) pushHistory(null);
    state = next;
    notify(null);
  }

  function batch(fn: () => void): void {
    if (batchDepth === 0) {
      batchSnapshot = snapshot(state);
      batchPreState = state;
    }
    batchDepth++;
    try {
      fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0) {
        if (state !== batchPreState && batchSnapshot) {
          undoStack.push(batchSnapshot);
          if (undoStack.length > UNDO_LIMIT) undoStack.shift();
          redoStack.length = 0;
        }
        batchSnapshot = null;
        batchPreState = null;
        lastKey = null;
      }
    }
  }

  function resetSession(): void {
    applyPatch({ kind: 'session-reset', state: createDefaultState() });
  }

  function undo(): boolean {
    if (undoStack.length === 0) return false;
    redoStack.push(snapshot(state));
    state = undoStack.pop()!;
    lastKey = null;
    silent = true;
    notify(null);
    silent = false;
    return true;
  }

  function redo(): boolean {
    if (redoStack.length === 0) return false;
    undoStack.push(snapshot(state));
    state = redoStack.pop()!;
    lastKey = null;
    silent = true;
    notify(null);
    silent = false;
    return true;
  }

  function subscribe(listener: StoreListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState: () => state,
    applyPatch,
    loadState,
    resetSession,
    batch,
    subscribe,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
