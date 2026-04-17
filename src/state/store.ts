import {
  createDefaultState,
  type SessionState,
  type StatePatch,
} from './types.js';

export type StoreListener = (patch: StatePatch | null) => void;

export interface Store {
  getState(): SessionState;
  applyPatch(patch: StatePatch): void;
  loadState(state: SessionState): void;
  resetSession(): void;
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
    if (!silent) pushHistory(coalesceKey(patch));

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
          fog = new Uint8Array(grid.cols * grid.rows);
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
      case 'session-reset':
        state = patch.state;
        break;
    }
    notify(patch);
  }

  function loadState(next: SessionState): void {
    if (!silent) pushHistory(null);
    state = next;
    notify(null);
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
    subscribe,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
