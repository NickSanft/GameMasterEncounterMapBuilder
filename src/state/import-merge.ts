import type { SessionState } from './types.js';

/**
 * Which categories of an imported session get merged into the current
 * state. All default to `true`, which reproduces the pre-0.42 behavior
 * of "replace everything". Unchecking a category preserves whatever is
 * already in the current scene for that slice.
 *
 * Note: fog dimensions must match grid dimensions, so `fog` is coupled
 * to `grid` in `mergeImportState` — importing fog brings the grid with
 * it regardless of the `grid` checkbox value. UIs can hide `grid` and
 * expose the single "Fog of war" option for simplicity.
 */
export interface ImportSelection {
  background: boolean;
  grid: boolean;
  tokens: boolean;
  fog: boolean;
  annotations: boolean;
  aoeTemplates: boolean;
  initiative: boolean;
  strokes: boolean;
  walls: boolean;
}

export const DEFAULT_IMPORT_SELECTION: ImportSelection = {
  background: true,
  grid: true,
  tokens: true,
  fog: true,
  annotations: true,
  aoeTemplates: true,
  initiative: true,
  strokes: true,
  walls: true,
};

/**
 * Produce a new SessionState that keeps `base`'s data for every
 * category the user *didn't* pick, and replaces with `imported`'s data
 * for every category they did.
 *
 * Never mutates either input.
 */
export function mergeImportState(
  base: SessionState,
  imported: SessionState,
  selection: ImportSelection,
): SessionState {
  // Fog only makes sense when paired with the grid it was captured on,
  // so we auto-import the grid whenever fog is imported, regardless of
  // what the UI says. This keeps fog[i] indexing valid.
  const takeGrid = selection.grid || selection.fog;
  return {
    version: 1,
    grid: takeGrid ? { ...imported.grid } : { ...base.grid },
    background: selection.background ? { ...imported.background } : { ...base.background },
    tokens: selection.tokens
      ? imported.tokens.map((t) => ({ ...t }))
      : base.tokens.map((t) => ({ ...t })),
    fog: selection.fog ? new Uint8Array(imported.fog) : new Uint8Array(base.fog),
    annotations: selection.annotations
      ? imported.annotations.map((a) => ({ ...a }))
      : base.annotations.map((a) => ({ ...a })),
    aoeTemplates: selection.aoeTemplates
      ? imported.aoeTemplates.map((a) => ({ ...a }))
      : base.aoeTemplates.map((a) => ({ ...a })),
    initiative: selection.initiative
      ? {
          order: imported.initiative.order.map((e) => ({ ...e })),
          activeId: imported.initiative.activeId,
          round: imported.initiative.round,
        }
      : {
          order: base.initiative.order.map((e) => ({ ...e })),
          activeId: base.initiative.activeId,
          round: base.initiative.round,
        },
    strokes: selection.strokes
      ? imported.strokes.map((s) => ({
          ...s,
          points: s.points.map((p) => ({ ...p })),
        }))
      : base.strokes.map((s) => ({
          ...s,
          points: s.points.map((p) => ({ ...p })),
        })),
    walls: selection.walls
      ? imported.walls.map((w) => ({ ...w }))
      : base.walls.map((w) => ({ ...w })),
    // Phase 79 — weather is per-scene mood; tied to the imported
    // scene's `background` rather than its own opt-in (so a user
    // who imports "Stormy harbor map" gets the rain too). When the
    // user UNCHECKED background, they keep their current weather.
    weather: selection.background ? imported.weather : base.weather,
    // Phase 80 — time-of-day pairs with weather as scene-mood, so it
    // travels under the same `background` opt-in.
    timeOfDay: selection.background ? imported.timeOfDay : base.timeOfDay,
    // Phase 142 — tile paint travels with the grid (same opt-in as
    // fog, since tile coords are grid-cell-indexed). Imported into
    // base when the GM imports the grid; left alone otherwise.
    tilePaints: takeGrid
      ? imported.tilePaints.map((t) => ({ ...t }))
      : base.tilePaints.map((t) => ({ ...t })),
  };
}

/**
 * Quick summary of what an imported session contains — used to gray
 * out or hide checkboxes for empty categories in the UI.
 */
export interface ImportSummary {
  hasBackground: boolean;
  tokenCount: number;
  fogRevealed: number;
  fogTotal: number;
  annotationCount: number;
  aoeCount: number;
  initiativeCount: number;
  strokeCount: number;
  wallCount: number;
  gridLabel: string;
}

export function summarizeImport(state: SessionState): ImportSummary {
  let revealed = 0;
  for (let i = 0; i < state.fog.length; i++) if (state.fog[i] === 1) revealed++;
  return {
    hasBackground: state.background.imageId !== null,
    tokenCount: state.tokens.length,
    fogRevealed: revealed,
    fogTotal: state.fog.length,
    annotationCount: state.annotations.length,
    aoeCount: state.aoeTemplates.length,
    initiativeCount: state.initiative.order.length,
    strokeCount: state.strokes.length,
    wallCount: state.walls.length,
    gridLabel: `${state.grid.cols} × ${state.grid.rows}`,
  };
}
