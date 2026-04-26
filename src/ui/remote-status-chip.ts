/**
 * Remote Play status chip (Phase 64).
 *
 * Small floating badge anchored to the top-left of the viewport (out
 * of the way of the Connected Players panel in the top-center). Shows
 * at-a-glance whether the user has an active remote peer + what state
 * it's in, with a click-to-open-modal affordance for quick access to
 * the Disconnect / Reconnect controls.
 *
 * Hidden when no peer is attached to the session (idle state) — the
 * Remote Play menu entry is still reachable from the session menu, so
 * we don't need to surface a chip just to say "click here to start."
 *
 * Three visual states map onto the `PeerState`:
 *   - `connected`      → green dot, "Connected"
 *   - `connecting` /
 *     `new`            → yellow dot, "Connecting…"
 *   - `disconnected` /
 *     `failed` /
 *     `closed`         → red dot, "Disconnected — click to reconnect"
 */

import type { RemoteSession } from '../sync/remote-session.js';
import type { PeerState } from '../sync/remote-peer.js';
import type { LatencyTracker } from '../state/latency-tracker.js';
import { bandFor } from '../state/latency-tracker.js';

export interface RemoteStatusChipHandle {
  destroy(): void;
}

export interface RemoteStatusChipOptions {
  session: RemoteSession;
  /** Click handler — typically opens the Remote Play modal. */
  onClick(): void;
  /**
   * Phase 83 — optional latency tracker. When supplied, the chip
   * appends a "(45ms)" suffix to the "Connected" label, color-coded
   * by `bandFor` (green / amber / red). Hidden in any non-connected
   * state and when the tracker hasn't recorded any samples yet.
   */
  latency?: LatencyTracker;
}

function describe(state: PeerState | 'idle'): {
  dotClass: string;
  label: string;
} {
  switch (state) {
    case 'idle':
      return { dotClass: 'idle', label: 'Idle' };
    case 'new':
    case 'connecting':
      return { dotClass: 'connecting', label: 'Connecting…' };
    case 'connected':
      return { dotClass: 'connected', label: 'Connected' };
    case 'disconnected':
      return { dotClass: 'disconnected', label: 'Disconnected — click to reconnect' };
    case 'failed':
      return { dotClass: 'failed', label: 'Connection failed — click to retry' };
    case 'closed':
      return { dotClass: 'closed', label: 'Closed — click to reconnect' };
  }
}

export function mountRemoteStatusChip(
  opts: RemoteStatusChipOptions,
): RemoteStatusChipHandle {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'remote-status-chip';
  btn.setAttribute('aria-label', 'Remote Play connection status');
  btn.hidden = true;
  btn.innerHTML = `
    <span class="remote-status-dot" data-field="dot" aria-hidden="true"></span>
    <span class="remote-status-label" data-field="label"></span>
    <span class="remote-status-latency" data-field="latency" hidden></span>
  `;
  document.body.appendChild(btn);

  const dot = btn.querySelector<HTMLElement>('[data-field="dot"]')!;
  const label = btn.querySelector<HTMLElement>('[data-field="label"]')!;
  const latencyEl = btn.querySelector<HTMLElement>('[data-field="latency"]')!;

  btn.addEventListener('click', () => opts.onClick());

  let lastState: PeerState | 'idle' = 'idle';

  function renderLatency(): void {
    // Hidden when no tracker, when no samples yet, OR when the chip
    // itself is in a non-connected state (latency for "connecting…"
    // would be nonsensical).
    if (!opts.latency || lastState !== 'connected') {
      latencyEl.hidden = true;
      return;
    }
    const rtt = opts.latency.median();
    if (rtt === null) {
      latencyEl.hidden = true;
      return;
    }
    latencyEl.hidden = false;
    latencyEl.textContent = `${rtt}ms`;
    latencyEl.dataset.band = bandFor(rtt);
  }

  function render(state: PeerState | 'idle', hasPeer: boolean): void {
    lastState = state;
    if (!hasPeer || state === 'idle') {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    const { dotClass, label: text } = describe(state);
    dot.className = `remote-status-dot ${dotClass}`;
    label.textContent = text;
    btn.title = text;
    renderLatency();
  }

  const unsub = opts.session.subscribe(({ peer, state }) => {
    render(state, peer !== null);
  });
  // Phase 83 — re-render the latency suffix whenever the tracker
  // records a fresh sample. The state subscription handles connect /
  // disconnect transitions; this one handles RTT updates within an
  // already-connected session.
  const unsubLatency = opts.latency?.subscribe(renderLatency) ?? (() => {});
  // Initial render in case the session already had a peer (e.g.
  // session created earlier + chip mounted late).
  render(opts.session.getState(), opts.session.getActivePeer() !== null);

  return {
    destroy() {
      unsub();
      unsubLatency();
      btn.remove();
    },
  };
}
