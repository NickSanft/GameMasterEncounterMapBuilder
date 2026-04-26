/**
 * Phase 87 — visually-hidden ARIA outline of the canvas state.
 *
 * Pre-87 a screen reader navigating the GM page hit the canvas's
 * `aria-label` and got a one-line summary ("12 tokens placed, 40%
 * fog revealed") — useful but coarse. Individual entities were
 * invisible to AT (the canvas paints pixels, not DOM nodes). Phase
 * 86 added Tab cycling + per-cycle descriptions for the active
 * selection, but didn't expose the full game state.
 *
 * This module mounts a hidden `<aside role="region">` that mirrors
 * `state.tokens / state.walls / state.aoeTemplates / state.annotations`
 * as a structured outline:
 *
 *   <aside role="region" aria-label="Canvas outline">
 *     <h2>Canvas outline</h2>
 *     <h3>Tokens (12)</h3>
 *     <ul>
 *       <li>Goblin at column 5, row 7, 3 of 7 HP (selected)</li>
 *       <li>Orc at column 8, row 7, 12 of 12 HP</li>
 *       …
 *     </ul>
 *     <h3>Walls (4)</h3>  …
 *   </aside>
 *
 * Visually hidden via the standard sr-only clip pattern so it
 * doesn't take up screen real estate, but stays in the accessibility
 * tree. Screen readers can land on it via region navigation
 * (NVDA: D for "next region"; VoiceOver: VO+U then "Landmarks").
 *
 * Phase 86's `describeEntity` is re-used for individual list items,
 * with " (selected)" appended when the id is in `selection.ids`.
 *
 * Updates are debounced (~120 ms) — on a busy combat round the
 * store fires many patches per second, and rebuilding the outline
 * each time would thrash the AT tree. The debounce coalesces those
 * into one update per quiet beat.
 */

import type { ID, SessionState } from '../state/types.js';
import {
  entitiesInReadingOrder,
  describeEntity,
  type EntityKind,
} from '../state/canvas-nav.js';
import { debounce } from '../util/debounce.js';

export interface CanvasOutlineOptions {
  getState(): SessionState;
  /** Live selection — used to suffix " (selected)" on matching items. */
  getSelectedIds(): ReadonlySet<ID>;
  /**
   * Subscribe to "something visible changed" — typically the
   * renderer's `onFrame` hook, which fires after every paint. Covers
   * both store mutations (which always trigger a render) AND selection-
   * only changes (also followed by a `renderer.requestRender()`).
   * The 120 ms debounce inside the outline coalesces bursts.
   */
  subscribe(listener: () => void): () => void;
}

export interface CanvasOutlineHandle {
  /** Force an immediate re-render (skips the debounce). */
  refresh(): void;
  destroy(): void;
}

const KIND_HEADINGS: Record<EntityKind, { single: string; plural: string }> = {
  token: { single: 'Token', plural: 'Tokens' },
  wall: { single: 'Wall', plural: 'Walls' },
  aoe: { single: 'AoE template', plural: 'AoE templates' },
  annotation: { single: 'Note', plural: 'Notes' },
};

const KIND_ORDER: EntityKind[] = ['token', 'wall', 'aoe', 'annotation'];

/**
 * Group entities by kind, preserving the reading-order ordering
 * within each kind. Helps the outline's "Tokens (N)" / "Walls (N)"
 * structure stay deterministic alongside Phase 86's cycle.
 */
function groupByKind(state: SessionState): Map<EntityKind, ID[]> {
  const groups = new Map<EntityKind, ID[]>();
  for (const k of KIND_ORDER) groups.set(k, []);
  for (const e of entitiesInReadingOrder(state)) {
    groups.get(e.kind)!.push(e.id);
  }
  return groups;
}

export function mountCanvasOutline(
  opts: CanvasOutlineOptions,
): CanvasOutlineHandle {
  const aside = document.createElement('aside');
  aside.className = 'canvas-outline sr-only';
  aside.setAttribute('role', 'region');
  aside.setAttribute('aria-label', 'Canvas outline');
  // aria-live="polite" so screen readers pick up additions / removals
  // without us having to fire a separate announcement. The Phase 90
  // live-region budget will eventually throttle this; today the
  // 120 ms render debounce already coalesces bursts.
  aside.setAttribute('aria-live', 'polite');
  aside.setAttribute('aria-atomic', 'false');

  const heading = document.createElement('h2');
  heading.textContent = 'Canvas outline';
  aside.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'canvas-outline-body';
  aside.appendChild(body);

  document.body.appendChild(aside);

  function render() {
    const state = opts.getState();
    const selected = opts.getSelectedIds();
    const groups = groupByKind(state);

    const next = document.createDocumentFragment();
    let totalEntities = 0;

    for (const kind of KIND_ORDER) {
      const ids = groups.get(kind)!;
      if (ids.length === 0) continue;
      totalEntities += ids.length;

      const h3 = document.createElement('h3');
      const labels = KIND_HEADINGS[kind];
      const headingLabel =
        ids.length === 1 ? labels.single : `${labels.plural} (${ids.length})`;
      h3.textContent = headingLabel;
      next.appendChild(h3);

      const ul = document.createElement('ul');
      for (const id of ids) {
        const desc = describeEntity(state, id);
        if (!desc) continue;
        const li = document.createElement('li');
        li.textContent = selected.has(id) ? `${desc} (selected)` : desc;
        if (selected.has(id)) li.setAttribute('aria-current', 'true');
        ul.appendChild(li);
      }
      next.appendChild(ul);
    }

    if (totalEntities === 0) {
      const p = document.createElement('p');
      p.textContent = 'Canvas is empty.';
      next.appendChild(p);
    }

    // Replace contents in one pass to minimize AT churn — building
    // up `next` as a fragment + a single replaceChildren call yields
    // one mutation event instead of N.
    body.replaceChildren(next);
  }

  const renderDebounced = debounce(render, 120);

  // Initial paint is synchronous — ensures the outline is populated
  // by the time any AT first reads the page.
  render();

  const unsub = opts.subscribe(renderDebounced);

  return {
    refresh: render,
    destroy() {
      unsub();
      aside.remove();
    },
  };
}
