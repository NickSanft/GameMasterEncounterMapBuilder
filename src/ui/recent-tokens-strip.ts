/**
 * Phase 148 — recently-used tokens strip.
 *
 * A horizontal 6-slot rail showing the GM's most recent token
 * templates. Click a slot → the next pointerdown on the canvas
 * stamps that template (sets `lastPlaced.current`, the same ref
 * `tool-token.ts`'s Alt+stamp path uses). Right-click a slot →
 * evict it.
 *
 * Pure DOM, no canvas. Reads the underlying state via
 * `listRecentTokens()` + `subscribeRecentTokens()` (Phase 148's
 * localStorage helper).
 */
import type { Token } from '../state/types.js';
import type { LastPlacedRef } from '../input/context.js';
import {
  listRecentTokens,
  removeRecentToken,
  subscribeRecentTokens,
  type RecentTokenEntry,
} from '../state/recent-tokens.js';
import { nid } from '../util/id.js';

export interface RecentTokensStripHandle {
  destroy(): void;
}

/**
 * Build a synthetic Token from a recent-template entry. The caller
 * (tool-token's Alt+stamp path) overwrites `id`, `x`, `y` and
 * preserves all other fields. Phase 137's auto-numbering still
 * applies if the GM has the preference on.
 *
 * Defaults for fields not stored in the recent entry come from
 * `createDefaultState()`-equivalent zeros: empty conditions, no HP,
 * no light / aura / facing rotation, GM-controlled (no owner).
 */
function tokenFromRecent(entry: RecentTokenEntry): Token {
  return {
    id: nid(),
    x: 0,
    y: 0,
    label: entry.label,
    color: entry.color,
    imageId: entry.imageId,
    size: entry.size,
    borderColor: entry.borderColor,
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
  };
}

export function mountRecentTokensStrip(
  container: HTMLElement,
  lastPlaced: LastPlacedRef,
): RecentTokensStripHandle {
  const strip = document.createElement('div');
  strip.className = 'recent-tokens-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Recently used tokens');
  // Hidden when the list is empty so the strip doesn't reserve
  // visual space on a fresh install.
  strip.hidden = true;

  function render() {
    strip.replaceChildren();
    const entries = listRecentTokens();
    if (entries.length === 0) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    for (const entry of entries) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'recent-tokens-slot';
      slot.dataset.templateId = entry.templateId;
      slot.title = `${entry.label} — click to stamp, right-click to remove`;
      slot.setAttribute(
        'aria-label',
        `Stamp recent token: ${entry.label}`,
      );

      const swatch = document.createElement('span');
      swatch.className = 'recent-tokens-slot-swatch';
      swatch.style.background = entry.color;
      if (entry.borderColor) {
        swatch.style.borderColor = entry.borderColor;
      }
      slot.appendChild(swatch);

      const label = document.createElement('span');
      label.className = 'recent-tokens-slot-label';
      label.textContent = entry.label;
      slot.appendChild(label);

      slot.addEventListener('click', () => {
        // Set lastPlaced so the next Alt+click on the canvas (or
        // the very next click for that matter) uses this template.
        lastPlaced.current = tokenFromRecent(entry);
        slot.blur();
      });
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        removeRecentToken(entry.templateId);
        // The subscribe handler will re-render.
      });
      strip.appendChild(slot);
    }
  }

  const unsub = subscribeRecentTokens(render);
  render();
  container.appendChild(strip);

  return {
    destroy() {
      unsub();
      strip.remove();
    },
  };
}
