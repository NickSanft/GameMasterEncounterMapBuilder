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
}

export function createStore(initial?: SessionState): Store {
  let state: SessionState = initial ?? createDefaultState();
  const listeners = new Set<StoreListener>();

  function notify(patch: StatePatch | null) {
    for (const l of listeners) l(patch);
  }

  function applyPatch(patch: StatePatch): void {
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
    state = next;
    notify(null);
  }

  function resetSession(): void {
    const next = createDefaultState();
    applyPatch({ kind: 'session-reset', state: next });
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
  };
}
