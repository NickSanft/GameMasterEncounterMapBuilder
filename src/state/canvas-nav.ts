/**
 * Phase 86 — keyboard navigation across canvas entities.
 *
 * Pre-86 the GM could nudge an already-selected token via arrow keys
 * but had no way to ACQUIRE selection without a mouse — a hard
 * accessibility wall for keyboard-only and screen-reader users. This
 * module provides the pure-state helpers that drive Tab / Shift+Tab
 * cycling through every selectable entity (tokens, walls, AoE
 * templates, annotations) in a deterministic reading order, plus a
 * description string per entity for the live-region announcer.
 *
 * Reading order: top-to-bottom, left-to-right within a small vertical
 * band, mirroring how a sighted user would scan the map. Walls use
 * their midpoint as the "position"; everything else uses its top-left.
 *
 * The cycle always returns to a single-id selection (multi-select via
 * lasso / shift-click is mouse-only). Tabbing from an empty selection
 * grabs the first entity; tabbing past the last wraps to the first.
 *
 * Pure module — no DOM, no store mutation. Caller wires the resulting
 * `Set<ID>` back into `selection.ids` and triggers re-render +
 * announcement.
 */

import type { ID, SessionState } from './types.js';
import { wallLength } from './walls.js';

/** Entity kind tag used by the announcer for "tokens" vs "walls" etc. */
export type EntityKind = 'token' | 'wall' | 'aoe' | 'annotation';

export interface EntityRef {
  id: ID;
  kind: EntityKind;
  /** Sort key — world-pixel y, then x. */
  sortY: number;
  sortX: number;
}

/**
 * Snap to a small vertical band so two entities that visually sit on
 * the "same row" sort by x, not by sub-pixel y differences. Tuned to
 * roughly half a default cell so token rows feel intentional.
 */
const ROW_BAND_PX = 32;

/**
 * Return every entity in the canonical reading order. Stable across
 * re-renders — same state yields the same array, so cycling is
 * predictable for screen-reader users.
 *
 * Order within a row band is by `sortX`; rows are by `sortY`. Within
 * the same (band, x) the entity kind tie-breaks: tokens < walls <
 * aoe < annotations (purely for determinism — the user-visible cycle
 * just steps through whichever is at the cursor).
 */
export function entitiesInReadingOrder(state: SessionState): EntityRef[] {
  const entries: EntityRef[] = [];
  const cellSize = state.grid.cellSize;

  for (const t of state.tokens) {
    // Token x/y are in grid cells; convert to world pixels for the
    // sort key so they intermix correctly with walls / annotations
    // (which are already in world pixels).
    entries.push({
      id: t.id,
      kind: 'token',
      sortY: t.y * cellSize,
      sortX: t.x * cellSize,
    });
  }
  for (const w of state.walls) {
    // Walls use the segment midpoint as their visual anchor.
    // Phase 112 — block walls use the AABB centroid in world pixels.
    let sortX: number;
    let sortY: number;
    if (w.kind === 'block') {
      const cs = state.grid.cellSize;
      sortX = (w.cellX + w.cellsWide / 2) * cs;
      sortY = (w.cellY + w.cellsTall / 2) * cs;
    } else {
      sortX = (w.x1 + w.x2) / 2;
      sortY = (w.y1 + w.y2) / 2;
    }
    entries.push({ id: w.id, kind: 'wall', sortY, sortX });
  }
  for (const a of state.aoeTemplates) {
    entries.push({ id: a.id, kind: 'aoe', sortY: a.y, sortX: a.x });
  }
  for (const ann of state.annotations) {
    entries.push({ id: ann.id, kind: 'annotation', sortY: ann.y, sortX: ann.x });
  }

  const kindRank: Record<EntityKind, number> = {
    token: 0,
    wall: 1,
    aoe: 2,
    annotation: 3,
  };

  entries.sort((a, b) => {
    const bandA = Math.floor(a.sortY / ROW_BAND_PX);
    const bandB = Math.floor(b.sortY / ROW_BAND_PX);
    if (bandA !== bandB) return bandA - bandB;
    if (a.sortX !== b.sortX) return a.sortX - b.sortX;
    if (kindRank[a.kind] !== kindRank[b.kind]) {
      return kindRank[a.kind] - kindRank[b.kind];
    }
    // Final tie-break by id so the order is deterministic across
    // identical positions (e.g. two tokens stacked on the same cell).
    return a.id.localeCompare(b.id);
  });

  return entries;
}

export type CycleDirection = 'next' | 'prev';

/**
 * Compute the next selection target given the current selection +
 * direction. Returns `null` if there are no entities at all.
 *
 * Behavior:
 *   - Empty state → `null`.
 *   - Empty selection → first entity (`next`) or last entity (`prev`).
 *   - Multi-select → collapses to the entity AFTER the last selected
 *     id in cycle order (`next`) or BEFORE the first (`prev`). This
 *     gives keyboard users a predictable "step out of multi-select"
 *     behavior without losing their place.
 *   - Single-select → next / previous in the cycle, wrapping at ends.
 *   - Single-select on an entity that has been deleted → behaves like
 *     empty selection (start over from the top / bottom).
 */
export function nextEntityId(
  state: SessionState,
  currentSelection: ReadonlySet<ID>,
  direction: CycleDirection,
): ID | null {
  const order = entitiesInReadingOrder(state);
  if (order.length === 0) return null;

  if (currentSelection.size === 0) {
    return direction === 'next' ? order[0]!.id : order[order.length - 1]!.id;
  }

  // Find the highest cycle-index of any currently-selected entity for
  // `next`, or the lowest for `prev`. Ids missing from the order
  // (e.g. selection includes a deleted id) are simply ignored.
  const selectedIndices: number[] = [];
  for (let i = 0; i < order.length; i++) {
    if (currentSelection.has(order[i]!.id)) selectedIndices.push(i);
  }

  if (selectedIndices.length === 0) {
    // Selection has stale ids only — start fresh.
    return direction === 'next' ? order[0]!.id : order[order.length - 1]!.id;
  }

  if (direction === 'next') {
    const last = selectedIndices[selectedIndices.length - 1]!;
    return order[(last + 1) % order.length]!.id;
  } else {
    const first = selectedIndices[0]!;
    return order[(first - 1 + order.length) % order.length]!.id;
  }
}

/**
 * Build a screen-reader-friendly description of an entity for the
 * live-region announcer. Examples:
 *   - "Goblin token at column 5, row 7"
 *   - "Token at column 3, row 4"  (no label)
 *   - "Wall, 6 ft long, GM-only"
 *   - "Cone AoE template"
 *   - "Note: gold pile"
 *
 * Returns `null` if the id no longer resolves (e.g. just-deleted).
 */
export function describeEntity(state: SessionState, id: ID): string | null {
  const t = state.tokens.find((x) => x.id === id);
  if (t) {
    const name = t.label?.trim() || 'Token';
    const col = Math.floor(t.x) + 1;
    const row = Math.floor(t.y) + 1;
    const parts = [`${name} at column ${col}, row ${row}`];
    if (t.hp) {
      parts.push(`${t.hp.current} of ${t.hp.max} HP`);
    }
    return parts.join(', ');
  }

  const w = state.walls.find((x) => x.id === id);
  if (w) {
    let parts: string[];
    if (w.kind === 'block') {
      // Phase 112 — block wall: announce its cell footprint.
      parts = [`Wall block, ${w.cellsWide} by ${w.cellsTall} cells`];
    } else {
      const lengthCells = wallLength(w) / state.grid.cellSize;
      // 5 ft per square is the default; the announcer doesn't have a
      // pref handle here. Round to whole cells which translates nicely
      // ("3 squares") without leaking unit-system assumptions.
      const cells = Math.max(1, Math.round(lengthCells));
      parts = [`Wall, ${cells} ${cells === 1 ? 'square' : 'squares'} long`];
    }
    if (!w.blocksSight) parts.push('does not block sight');
    if (!w.blocksMovement) parts.push('does not block movement');
    if ((w.visibility ?? 'shared') === 'gm') parts.push('GM-only');
    return parts.join(', ');
  }

  const a = state.aoeTemplates.find((x) => x.id === id);
  if (a) {
    const kind = a.kind === 'sphere' ? 'Sphere' : a.kind === 'cone' ? 'Cone' : a.kind === 'line' ? 'Line' : 'AoE';
    const parts = [`${kind} AoE template`];
    if (a.visibility === 'gm') parts.push('GM-only');
    return parts.join(', ');
  }

  const ann = state.annotations.find((x) => x.id === id);
  if (ann) {
    const text = ann.text?.trim();
    return text ? `Note: ${text}` : 'Note';
  }

  return null;
}
