/**
 * Connected Players panel (Phase 63).
 *
 * GM-side overview of every tab currently in the session — rendered
 * as a small floating chip list anchored to the top-right, below the
 * session menu. Driven by an `IdentityRegistry` which collects the
 * `{id, name, color, role}` identities broadcast over the sync
 * channel (BroadcastChannel + WebRTC).
 *
 * Design choices:
 *   - **Hidden when only you are in the registry.** A panel showing
 *     "GM (you)" alone is noise; only surface when there's someone
 *     else to see.
 *   - **Role-sorted**: GMs first (usually just 1 — the local tab),
 *     then Spectators in join order.
 *   - **Chip with color dot + name + role label**. Small, compact,
 *     no interactions beyond hover tooltip.
 *   - **(you) marker** on the local tab's entry so the GM can tell
 *     at a glance which chip represents them.
 */

import type { IdentityRegistry, PlayerIdentity } from '../state/player-identity.js';
import type { ID } from '../state/types.js';

export interface ConnectedPlayersPanelHandle {
  /** Tear down — removes the DOM element + unsubscribes from the registry. */
  destroy(): void;
}

export interface ConnectedPlayersPanelOptions {
  registry: IdentityRegistry;
  /** Id of the tab this panel lives in (used to mark the "(you)" chip). */
  selfId: ID;
}

export function mountConnectedPlayersPanel(
  opts: ConnectedPlayersPanelOptions,
): ConnectedPlayersPanelHandle {
  const root = document.createElement('aside');
  root.className = 'connected-players-panel';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Connected players');
  root.hidden = true;
  document.body.appendChild(root);

  function render(list: readonly PlayerIdentity[]): void {
    // Hide the panel when the registry is effectively empty (no one
    // else connected — `selfId` may or may not be in the list
    // depending on whether the entry registered itself locally).
    const others = list.filter((p) => p.id !== opts.selfId);
    if (others.length === 0) {
      root.hidden = true;
      root.textContent = '';
      return;
    }

    // Sort: GMs first, then Spectators, stable by original order.
    const roleWeight = (r: PlayerIdentity['role']) => (r === 'gm' ? 0 : 1);
    const sorted = [...list].sort((a, b) => roleWeight(a.role) - roleWeight(b.role));

    root.hidden = false;
    root.textContent = '';
    for (const p of sorted) {
      const chip = document.createElement('span');
      chip.className = 'connected-player-chip';
      if (p.role === 'gm') chip.classList.add('role-gm');
      chip.title = `${p.name} (${p.role === 'gm' ? 'GM' : 'Spectator'})`;

      const dot = document.createElement('span');
      dot.className = 'connected-player-dot';
      dot.style.background = p.color;
      dot.setAttribute('aria-hidden', 'true');
      chip.appendChild(dot);

      const label = document.createElement('span');
      label.className = 'connected-player-name';
      label.textContent =
        p.id === opts.selfId ? `${p.name} (you)` : p.name;
      chip.appendChild(label);

      root.appendChild(chip);
    }
  }

  // Initial render + subscribe to future changes.
  render(opts.registry.list());
  const unsubscribe = opts.registry.subscribe(render);

  return {
    destroy() {
      unsubscribe();
      root.remove();
    },
  };
}
