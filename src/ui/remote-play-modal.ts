/**
 * Remote Play modal (Phase 62).
 *
 * Two flows, switchable via the top tabs:
 *
 *   - **Host** — create an SDP offer that you share out-of-band
 *     (copy → Discord, email, whatever), wait for the peer's
 *     pasted answer, apply it, connection opens.
 *   - **Join** — paste the host's offer, generate + copy your
 *     answer back to them, connection opens.
 *
 * The modal exposes the minimum moving parts — after shipping we
 * can add fancier UX (WebSocket signaling, room codes, auto-
 * reconnect), but the shape of the data (offer in / answer out) is
 * the protocol that doesn't change.
 *
 * The actual WebRTC wrangling lives in `sync/remote-peer.ts`; this
 * module only drives the UI + plumbs messages into the shared
 * `SyncChannel` via `channel.attachRemote(peer)`.
 */

import type { SyncChannel } from '../sync/channel.js';
import {
  createGuestPeer,
  createHostPeer,
  isWebRtcSupported,
  type GuestPeer,
  type HostPeer,
  type PeerState,
} from '../sync/remote-peer.js';
import type { RemoteSession } from '../sync/remote-session.js';

type Role = 'host' | 'guest';

export interface RemotePlayModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export interface RemotePlayModalOptions {
  channel: SyncChannel;
  /** Friendly label used in UI copy (`GM view` / `Spectator view`). */
  viewLabel: 'GM' | 'Spectator';
  /**
   * Phase 64 — shared session state. The modal attaches created
   * peers here so external observers (the connection-status chip +
   * the entry's full-state-rebroadcast logic) can react. Passing
   * a session is optional; when omitted the modal keeps its
   * internal-only behavior from Phase 62.
   */
  session?: RemoteSession;
}

/**
 * 0.62.2: GM is the authoritative source of truth for the session;
 * a Spectator's local state is just a mirror of what the GM has
 * broadcast. So only the GM should be able to HOST (create an
 * invitation) — a Spectator "hosting" would offer an empty / stale
 * session to anyone who joined. Conversely, a GM shouldn't be
 * joining someone else's session (their local data would get
 * overwritten by the host's). Each role has exactly one flow.
 */
function rolesFor(viewLabel: 'GM' | 'Spectator'): readonly Role[] {
  return viewLabel === 'GM' ? ['host'] : ['guest'];
}

export function mountRemotePlayModal(
  opts: RemotePlayModalOptions,
): RemotePlayModalHandle {
  const availableRoles = rolesFor(opts.viewLabel);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal remote-play-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Remote play');
  // 0.62.2: the tab strip is only rendered when both roles are
  // available (not the default anymore). For GM + Spectator views
  // each has exactly one role, so the strip is hidden + the single
  // available pane is visible with no role-switching affordance.
  const showTabs = availableRoles.length > 1;
  // Which flow does the user's current view-label need? Drives the
  // intro copy + the initial open tab.
  const primaryRole: Role = availableRoles[0]!;
  // Dynamic intro copy that explains what THIS view will do, rather
  // than the old generic "connect two browsers" message.
  const introCopy =
    opts.viewLabel === 'GM'
      ? 'Invite a remote Spectator to join this GM session via WebRTC. No signaling server required — share a short connection string once, then the session syncs the same way as a same-browser Spectator tab. (Hosting is GM-only — the GM owns the authoritative session state.)'
      : 'Join a remote GM\u2019s session via WebRTC. Paste the invitation they sent you, copy the answer back, and your Spectator view will mirror the GM\u2019s map, tokens, fog, dice, and everything else. (Spectators can join but not host — only the GM can invite others.)';

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Remote Play <span class="remote-play-beta">beta</span></h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="settings-hint remote-play-intro">${introCopy}</p>
      <div class="remote-play-tabs" role="tablist"${showTabs ? '' : ' hidden'}>
        <button type="button" role="tab" data-role="host" aria-selected="${primaryRole === 'host' ? 'true' : 'false'}"${availableRoles.includes('host') ? '' : ' hidden'}>Host a session</button>
        <button type="button" role="tab" data-role="guest" aria-selected="${primaryRole === 'guest' ? 'true' : 'false'}"${availableRoles.includes('guest') ? '' : ' hidden'}>Join a session</button>
      </div>
      <section class="remote-play-pane" data-pane="host"${primaryRole === 'host' ? '' : ' hidden'}>
        <ol class="remote-play-steps">
          <li>Click <strong>Create invitation</strong> to generate a short connection code.</li>
          <li>Copy the invitation and share it with the other player (Discord, email, etc.).</li>
          <li>Paste their <strong>answer</strong> below and click <strong>Accept answer</strong>.</li>
        </ol>
        <div class="remote-play-row">
          <button type="button" class="primary" data-action="host-create">Create invitation</button>
          <span class="remote-play-state" data-field="host-state" aria-live="polite">Idle</span>
        </div>
        <label class="remote-play-field">
          <span>Your invitation (copy + share):</span>
          <textarea data-field="host-offer" readonly rows="4" placeholder="Click 'Create invitation' above…"></textarea>
          <button type="button" class="remote-play-copy" data-action="host-copy-offer" disabled>Copy</button>
        </label>
        <label class="remote-play-field">
          <span>Paste their answer here:</span>
          <textarea data-field="host-answer" rows="4" placeholder="The answer they send back goes here…"></textarea>
          <button type="button" class="primary" data-action="host-accept" disabled>Accept answer</button>
        </label>
      </section>
      <section class="remote-play-pane" data-pane="guest"${primaryRole === 'guest' ? '' : ' hidden'}>
        <ol class="remote-play-steps">
          <li>Paste the host's <strong>invitation</strong> below.</li>
          <li>Click <strong>Generate answer</strong> to produce your reply.</li>
          <li>Copy the answer + send it back to the host.</li>
        </ol>
        <label class="remote-play-field">
          <span>Paste the host's invitation:</span>
          <textarea data-field="guest-offer" rows="4" placeholder="Paste the invitation here…"></textarea>
          <button type="button" class="primary" data-action="guest-accept" disabled>Generate answer</button>
        </label>
        <div class="remote-play-row">
          <span class="remote-play-state" data-field="guest-state" aria-live="polite">Idle</span>
        </div>
        <label class="remote-play-field">
          <span>Your answer (copy + send back):</span>
          <textarea data-field="guest-answer" readonly rows="4" placeholder="Generated answer will appear here…"></textarea>
          <button type="button" class="remote-play-copy" data-action="guest-copy-answer" disabled>Copy</button>
        </label>
      </section>
      <p class="settings-hint" data-field="not-supported" hidden>
        Your browser doesn't expose the WebRTC API. Remote play needs
        Chrome, Edge, Safari, or Firefox (recent). Everything still
        works fine in same-browser same-origin mode via the built-in
        BroadcastChannel — remote play is purely additive.
      </p>
      <!-- Phase 64: persistent connection row. Visible when a peer
           is attached to the session; hidden otherwise. Shows the
           current status + gives the user an explicit Disconnect
           button to tear down the peer without having to reload. -->
      <div class="remote-play-connection-row" data-field="connection-row" hidden>
        <div class="remote-play-connection-status">
          <span class="remote-play-connection-dot" data-field="connection-dot" aria-hidden="true"></span>
          <span data-field="connection-text" aria-live="polite">Idle</span>
        </div>
        <button type="button" class="remote-play-disconnect" data-action="disconnect">Disconnect</button>
      </div>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // ───────── DOM handles ─────────
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const tabButtons = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const hostPane = modal.querySelector<HTMLElement>('[data-pane="host"]')!;
  const guestPane = modal.querySelector<HTMLElement>('[data-pane="guest"]')!;

  const hostOfferTa = modal.querySelector<HTMLTextAreaElement>('[data-field="host-offer"]')!;
  const hostAnswerTa = modal.querySelector<HTMLTextAreaElement>('[data-field="host-answer"]')!;
  const hostState = modal.querySelector<HTMLElement>('[data-field="host-state"]')!;
  const hostCreateBtn = modal.querySelector<HTMLButtonElement>('[data-action="host-create"]')!;
  const hostCopyBtn = modal.querySelector<HTMLButtonElement>('[data-action="host-copy-offer"]')!;
  const hostAcceptBtn = modal.querySelector<HTMLButtonElement>('[data-action="host-accept"]')!;

  const guestOfferTa = modal.querySelector<HTMLTextAreaElement>('[data-field="guest-offer"]')!;
  const guestAnswerTa = modal.querySelector<HTMLTextAreaElement>('[data-field="guest-answer"]')!;
  const guestState = modal.querySelector<HTMLElement>('[data-field="guest-state"]')!;
  const guestAcceptBtn = modal.querySelector<HTMLButtonElement>('[data-action="guest-accept"]')!;
  const guestCopyBtn = modal.querySelector<HTMLButtonElement>('[data-action="guest-copy-answer"]')!;
  const notSupportedMsg = modal.querySelector<HTMLElement>('[data-field="not-supported"]')!;
  const connectionRow = modal.querySelector<HTMLElement>('[data-field="connection-row"]')!;
  const connectionDot = modal.querySelector<HTMLElement>('[data-field="connection-dot"]')!;
  const connectionText = modal.querySelector<HTMLElement>('[data-field="connection-text"]')!;
  const disconnectBtn = modal.querySelector<HTMLButtonElement>('[data-action="disconnect"]')!;

  let hostPeer: HostPeer | null = null;
  let guestPeer: GuestPeer | null = null;
  let detachAttached: (() => void) | null = null;

  // Phase 64 — reflect the shared session state into the modal's
  // connection row: show "Connected / Connecting / Disconnected /
  // Closed" + the Disconnect button when a peer is attached. Hide
  // the row entirely when the session is idle.
  function renderConnectionRow(
    state: PeerState | 'idle',
    hasPeer: boolean,
  ): void {
    if (!hasPeer || state === 'idle') {
      connectionRow.hidden = true;
      return;
    }
    connectionRow.hidden = false;
    connectionText.textContent = stateToText(state);
    connectionDot.className = `remote-play-connection-dot state-${state}`;
  }
  opts.session?.subscribe(({ peer, state }) => {
    renderConnectionRow(state, peer !== null);
  });
  // Initial render (in case a peer was already attached when the
  // modal mounted).
  if (opts.session) {
    renderConnectionRow(opts.session.getState(), opts.session.getActivePeer() !== null);
  }

  disconnectBtn.addEventListener('click', () => {
    opts.session?.disconnect();
    detachAttached?.();
    detachAttached = null;
    hostPeer = null;
    guestPeer = null;
    // Reset the input/output textareas so the flow is clean for
    // the next connection attempt.
    hostOfferTa.value = '';
    hostAnswerTa.value = '';
    guestOfferTa.value = '';
    guestAnswerTa.value = '';
    hostCreateBtn.disabled = false;
    hostCopyBtn.disabled = true;
    hostAcceptBtn.disabled = true;
    guestAcceptBtn.disabled = true;
    guestCopyBtn.disabled = true;
    hostState.textContent = 'Idle';
    guestState.textContent = 'Idle';
  });

  if (!isWebRtcSupported()) {
    notSupportedMsg.hidden = false;
    hostCreateBtn.disabled = true;
    hostAcceptBtn.disabled = true;
    guestAcceptBtn.disabled = true;
    guestOfferTa.disabled = true;
    hostAnswerTa.disabled = true;
  }

  function setTab(role: Role) {
    // Defensive: if the requested role isn't allowed for this view-
    // label (e.g. a Spectator tried to switch to Host), keep the
    // current pane. Shouldn't happen since we don't render the
    // disallowed tab, but the ignore makes the surface safer to
    // extend in the future.
    if (!availableRoles.includes(role)) return;
    for (const b of tabButtons) {
      const active = b.dataset['role'] === role;
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.classList.toggle('active', active);
    }
    hostPane.hidden = role !== 'host';
    guestPane.hidden = role !== 'guest';
  }

  for (const btn of tabButtons) {
    btn.addEventListener('click', () => {
      const r = btn.dataset['role'] as Role | undefined;
      if (r) setTab(r);
    });
  }

  function stateToText(s: PeerState): string {
    switch (s) {
      case 'new': return 'Idle';
      case 'connecting': return 'Connecting…';
      case 'connected': return 'Connected ✓';
      case 'disconnected': return 'Disconnected (may recover)';
      case 'failed': return 'Connection failed';
      case 'closed': return 'Closed';
    }
  }

  // ───────── Host flow ─────────
  hostCreateBtn.addEventListener('click', async () => {
    hostCreateBtn.disabled = true;
    hostState.textContent = 'Creating invitation…';
    try {
      if (hostPeer) hostPeer.close();
      const peer = createHostPeer();
      hostPeer = peer;
      // Phase 64: register with the session so the status chip +
      // the entry's full-state-rebroadcast logic can observe.
      opts.session?.attachPeer(peer);
      peer.onStateChange((s) => {
        hostState.textContent = stateToText(s);
      });
      const offerStr = await peer.offer();
      hostOfferTa.value = offerStr;
      hostCopyBtn.disabled = false;
      hostAcceptBtn.disabled = false;
      hostState.textContent = 'Waiting for answer…';
    } catch (err) {
      console.error('[remote-play] host create failed', err);
      hostState.textContent = 'Could not create invitation';
      hostCreateBtn.disabled = false;
    }
  });

  hostAcceptBtn.addEventListener('click', async () => {
    const peer = hostPeer;
    if (!peer) return;
    const ans = hostAnswerTa.value.trim();
    if (!ans) return;
    hostAcceptBtn.disabled = true;
    try {
      await peer.acceptAnswer(ans);
      detachAttached?.();
      detachAttached = opts.channel.attachRemote(peer);
    } catch (err) {
      console.error('[remote-play] accept answer failed', err);
      hostState.textContent = 'Invalid answer';
      hostAcceptBtn.disabled = false;
    }
  });

  // ───────── Guest flow ─────────
  guestOfferTa.addEventListener('input', () => {
    guestAcceptBtn.disabled = guestOfferTa.value.trim().length === 0;
  });

  guestAcceptBtn.addEventListener('click', async () => {
    const offerStr = guestOfferTa.value.trim();
    if (!offerStr) return;
    guestAcceptBtn.disabled = true;
    guestState.textContent = 'Generating answer…';
    try {
      if (guestPeer) guestPeer.close();
      const peer = createGuestPeer(offerStr);
      guestPeer = peer;
      // Phase 64: same session attachment as the host flow.
      opts.session?.attachPeer(peer);
      peer.onStateChange((s) => {
        guestState.textContent = stateToText(s);
      });
      const answerStr = await peer.answer();
      guestAnswerTa.value = answerStr;
      guestCopyBtn.disabled = false;
      detachAttached?.();
      detachAttached = opts.channel.attachRemote(peer);
    } catch (err) {
      console.error('[remote-play] guest generate failed', err);
      guestState.textContent = 'Invalid invitation';
      guestAcceptBtn.disabled = false;
    }
  });

  // ───────── Copy buttons ─────────
  async function copyToClipboard(text: string, btn: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Copied ✓';
      window.setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    } catch {
      // Fallback for browsers without clipboard permission: select the
      // textarea content so the user can Ctrl-C manually.
      const ta = btn.parentElement?.querySelector('textarea');
      ta?.select();
    }
  }
  hostCopyBtn.addEventListener('click', () => copyToClipboard(hostOfferTa.value, hostCopyBtn));
  guestCopyBtn.addEventListener('click', () =>
    copyToClipboard(guestAnswerTa.value, guestCopyBtn),
  );

  // ───────── Modal show/hide ─────────
  function open(): void {
    // Reset to the view's primary role every time the modal opens
    // (in case the tab strip is ever shown + the user clicked around).
    setTab(primaryRole);
    backdrop.hidden = false;
    // Focus the primary call-to-action button for the active role.
    window.setTimeout(() => {
      if (primaryRole === 'host') hostCreateBtn.focus();
      else guestOfferTa.focus();
    }, 0);
  }
  function close(): void {
    backdrop.hidden = true;
  }
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  // `viewLabel` is accepted for the API surface but not yet displayed
  // in the UI — reserved for a future "You are hosting as GM / joining
  // as Spectator" subtitle.
  void opts.viewLabel;

  return {
    open,
    close,
    isOpen: () => !backdrop.hidden,
  };
}
