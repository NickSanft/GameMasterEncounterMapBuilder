import {
  createDefaultState,
  type SessionState,
  type StatePatch,
  type Token,
} from './types.js';
import { sortByValue } from './initiative.js';
import { tickConditions } from './conditions.js';

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
  /**
   * Wipe the undo/redo history. Used when switching between scenes so
   * an undo from scene B can't roll state back into scene A.
   */
  clearHistory(): void;
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
    strokes: s.strokes.map((st) => ({
      ...st,
      points: st.points.map((p) => ({ ...p })),
    })),
    walls: s.walls.map((w) => ({ ...w })),
    weather: s.weather,
    timeOfDay: s.timeOfDay,
    // Phase 142 — copy the tile-paint array. Each entry is a flat
    // record (id + cellX + cellY + kind), so a shallow clone per
    // entry is sufficient.
    tilePaints: s.tilePaints.map((t) => ({ ...t })),
    // Phase 158 — clone travel-route polylines + their points so
    // undo/redo doesn't share point arrays across snapshots.
    travelRoutes: s.travelRoutes.map((r) => ({
      ...r,
      points: r.points.map((p) => ({ ...p })),
    })),
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
    case 'stroke-update':
      return `stroke-update:${patch.id}`;
    case 'travel-route-update':
      return `travel-route-update:${patch.id}`;
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
      case 'initiative-reorder': {
        // Phase 176 — validate the new order contains exactly the
        // same set of ids as the existing order. Drop unknown ids
        // silently; require the count to match. A no-op order is
        // a no-op.
        const existing = state.initiative.order;
        const byId = new Map(existing.map((e) => [e.id, e]));
        const next: typeof existing = [];
        const seen = new Set<string>();
        for (const id of patch.order) {
          if (seen.has(id)) continue;
          const entry = byId.get(id);
          if (!entry) continue;
          seen.add(id);
          next.push(entry);
        }
        if (next.length !== existing.length) return;
        // Same-shape no-op fast path.
        let same = true;
        for (let i = 0; i < next.length; i++) {
          if (next[i]!.id !== existing[i]!.id) {
            same = false;
            break;
          }
        }
        if (same) return;
        state = {
          ...state,
          initiative: { ...state.initiative, order: next },
        };
        break;
      }
      case 'initiative-set-active': {
        // Phase 70 — when the round counter ADVANCES, scan every token
        // and strip any condition whose timer is <= the new round. A
        // condition applied at round 3 with duration 3 has
        // expiresAtRound=6; entering round 6 removes it. Only advancing
        // the round triggers the tick — retreating (or staying on the
        // same round) leaves timers untouched so undo / "oops, wrong
        // button" doesn't lose information.
        const prevRound = state.initiative.round;
        const nextRound = patch.round;
        let tokens: Token[] = state.tokens;
        if (nextRound > prevRound) {
          let mutated = false;
          const updated = state.tokens.map((t) => {
            if (t.conditions.length === 0) return t;
            if (Object.keys(t.conditionExpirations).length === 0) return t;
            const result = tickConditions(
              t.conditions,
              t.conditionExpirations,
              nextRound,
            );
            if (result.removed.length === 0) return t;
            mutated = true;
            return {
              ...t,
              conditions: result.conditions,
              conditionExpirations: result.conditionExpirations,
            };
          });
          if (mutated) tokens = updated;
        }
        state = {
          ...state,
          tokens,
          initiative: {
            ...state.initiative,
            activeId: patch.activeId,
            round: nextRound,
          },
        };
        break;
      }
      case 'stroke-add':
        state = { ...state, strokes: [...state.strokes, patch.stroke] };
        break;
      case 'stroke-update': {
        const idx = state.strokes.findIndex((s) => s.id === patch.id);
        if (idx === -1) return;
        const existing = state.strokes[idx]!;
        const next = { ...existing, ...patch.changes };
        const strokes = state.strokes.slice();
        strokes[idx] = next;
        state = { ...state, strokes };
        break;
      }
      case 'stroke-remove':
        state = {
          ...state,
          strokes: state.strokes.filter((s) => s.id !== patch.id),
        };
        break;
      case 'strokes-clear':
        state = { ...state, strokes: [] };
        break;
      case 'wall-add':
        state = { ...state, walls: [...state.walls, patch.wall] };
        break;
      case 'wall-update': {
        const idx = state.walls.findIndex((w) => w.id === patch.id);
        if (idx === -1) return;
        const existing = state.walls[idx]!;
        const next = { ...existing, ...patch.changes };
        const walls = state.walls.slice();
        walls[idx] = next;
        state = { ...state, walls };
        break;
      }
      case 'wall-remove':
        state = {
          ...state,
          walls: state.walls.filter((w) => w.id !== patch.id),
        };
        break;
      case 'walls-clear':
        state = { ...state, walls: [] };
        break;
      case 'weather-set':
        // Phase 79 — fast-path: skip the patch broadcast / persist
        // tick when the weather hasn't actually changed (e.g. the
        // user clicks the active option in the dropdown).
        if (state.weather === patch.weather) return;
        state = { ...state, weather: patch.weather };
        break;
      case 'time-set':
        // Phase 80 — same same-value no-op fast path.
        if (state.timeOfDay === patch.timeOfDay) return;
        state = { ...state, timeOfDay: patch.timeOfDay };
        break;
      case 'tile-paint-add': {
        // Phase 142 — dedup by (cellX, cellY, kind). Painting the
        // same tile kind onto the same cell is a no-op (so a brush
        // drag doesn't pile up duplicate entries that differ only
        // by id).
        const existing = state.tilePaints.find(
          (t) =>
            t.cellX === patch.tile.cellX &&
            t.cellY === patch.tile.cellY &&
            t.kind === patch.tile.kind,
        );
        if (existing) return;
        state = { ...state, tilePaints: [...state.tilePaints, patch.tile] };
        break;
      }
      case 'tile-paint-remove': {
        const filtered = state.tilePaints.filter((t) => t.id !== patch.id);
        if (filtered.length === state.tilePaints.length) return;
        state = { ...state, tilePaints: filtered };
        break;
      }
      case 'tile-paint-clear':
        if (state.tilePaints.length === 0) return;
        state = { ...state, tilePaints: [] };
        break;
      case 'travel-route-add':
        state = {
          ...state,
          travelRoutes: [...state.travelRoutes, patch.route],
        };
        break;
      case 'travel-route-update': {
        const idx = state.travelRoutes.findIndex((r) => r.id === patch.id);
        if (idx === -1) return;
        const existing = state.travelRoutes[idx]!;
        const next = { ...existing, ...patch.changes };
        const routes = state.travelRoutes.slice();
        routes[idx] = next;
        state = { ...state, travelRoutes: routes };
        break;
      }
      case 'travel-route-remove': {
        const filtered = state.travelRoutes.filter((r) => r.id !== patch.id);
        if (filtered.length === state.travelRoutes.length) return;
        state = { ...state, travelRoutes: filtered };
        break;
      }
      case 'travel-routes-clear':
        if (state.travelRoutes.length === 0) return;
        state = { ...state, travelRoutes: [] };
        break;
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

  function clearHistory(): void {
    undoStack.length = 0;
    redoStack.length = 0;
    lastKey = null;
    lastKeyTime = 0;
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
    clearHistory,
  };
}
