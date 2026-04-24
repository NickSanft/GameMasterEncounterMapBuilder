/**
 * WebRTC remote-peer transport (Phase 62).
 *
 * Wraps a single `RTCPeerConnection` + `RTCDataChannel` so the rest
 * of the app can treat remote sync the same way it treats a local
 * BroadcastChannel — `send(msg)` + `onMessage(fn)` + `close()`. The
 * signaling flow is deliberately manual (copy / paste of SDP
 * strings) so Phase 62 ships without needing a dedicated signaling
 * server — good enough for a friend-to-friend session started over
 * Discord or email, and keeps the deploy story "just GitHub Pages."
 *
 * Connection roles:
 *   - **Host** creates the data channel + generates an SDP offer.
 *     The offer is handed to the user to share out-of-band. The
 *     remote peer's answer gets pasted back + applied.
 *   - **Guest** receives the offer via paste, creates its data
 *     channel as the "incoming" side, generates an answer, and
 *     hands that back to the host.
 *
 * Why no ICE trickle: Phase 62's copy-paste flow is simpler with
 * full SDPs that include all gathered candidates. We wait for
 * `iceGatheringState === 'complete'` before returning the offer /
 * answer string. Trade-off: slightly slower connection setup
 * (typically 1–3s for LAN, 2–5s with a STUN server), but no need
 * for a persistent signaling channel.
 *
 * STUN: uses Google's public `stun.l.google.com:19302` by default
 * which is stable and free. Users behind symmetric NATs will need
 * a TURN server — out of scope for Phase 62 (the UI surfaces a
 * "connection failed" state rather than pretending).
 */

import type { SyncEnvelope } from './messages.js';

/** Default ICE server list. Google's public STUN is effectively universal. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

/**
 * Label applied to the data channel. Plays the role of a "protocol
 * version" — if we ever change the wire format in a breaking way
 * we can bump this and refuse connections from older peers.
 */
export const DATA_CHANNEL_LABEL = 'gm-encounter-maps-sync/1';

/** Top-level connection state. Drives the UI status display. */
export type PeerState =
  | 'new' // freshly constructed, no signaling started
  | 'connecting' // offer/answer exchange in progress
  | 'connected' // data channel open + ready
  | 'disconnected' // lost after connect; may recover
  | 'failed' // permanently broken (ICE failed etc.)
  | 'closed'; // explicitly torn down

export interface RemotePeer {
  /**
   * Role of this peer in the handshake. Mostly informational, but
   * callers sometimes want to show different UI hints based on it.
   */
  readonly role: 'host' | 'guest';
  /** Current high-level state. */
  getState(): PeerState;
  /** Subscribe to state transitions. Returns unsubscribe fn. */
  onStateChange(listener: (state: PeerState) => void): () => void;
  /**
   * Send a sync message. Silently drops the message when the
   * data channel isn't `open` — the caller retries at the
   * `send(msg)` shape above this layer if needed.
   */
  send(msg: SyncEnvelope): void;
  /** Subscribe to inbound sync messages. Returns unsubscribe fn. */
  onMessage(listener: (msg: SyncEnvelope) => void): () => void;
  /** Tear down + release the RTCPeerConnection. */
  close(): void;
}

export interface HostPeer extends RemotePeer {
  readonly role: 'host';
  /** Generated SDP offer (with all ICE candidates) as a string. */
  offer(): Promise<string>;
  /** Apply the guest's answer string. Resolves once connection is established. */
  acceptAnswer(answer: string): Promise<void>;
}

export interface GuestPeer extends RemotePeer {
  readonly role: 'guest';
  /** Generated SDP answer (with all ICE candidates) as a string. */
  answer(): Promise<string>;
}

export interface PeerOptions {
  /** Override the default ICE servers (tests + custom TURN setups). */
  iceServers?: RTCIceServer[];
  /**
   * Test seam. Defaults to `RTCPeerConnection` on `window`; tests
   * inject a stub so specs don't depend on a real WebRTC stack.
   */
  pcFactory?: (config: RTCConfiguration) => RTCPeerConnection;
}

function createPeerConnection(opts: PeerOptions): RTCPeerConnection {
  const factory =
    opts.pcFactory ??
    ((config: RTCConfiguration) => new RTCPeerConnection(config));
  return factory({ iceServers: opts.iceServers ?? DEFAULT_ICE_SERVERS });
}

/** Shared plumbing both host + guest use once a data channel is live. */
function wireDataChannel(
  pc: RTCPeerConnection,
  dc: RTCDataChannel,
  setState: (s: PeerState) => void,
  messageListeners: Set<(msg: SyncEnvelope) => void>,
): void {
  dc.onopen = () => setState('connected');
  dc.onclose = () => setState('closed');
  dc.onerror = () => setState('failed');
  dc.onmessage = (ev: MessageEvent<string>) => {
    try {
      const parsed = JSON.parse(ev.data) as SyncEnvelope;
      for (const l of messageListeners) l(parsed);
    } catch (err) {
      // Malformed frames come from a peer on an older wire-format
      // version or from network corruption; silently drop rather
      // than risk the store reducer crashing on a malformed patch.
      console.warn('[remote-peer] dropped malformed message', err);
    }
  };
  pc.oniceconnectionstatechange = () => {
    switch (pc.iceConnectionState) {
      case 'disconnected':
        setState('disconnected');
        break;
      case 'failed':
        setState('failed');
        break;
      case 'closed':
        setState('closed');
        break;
      case 'connected':
      case 'completed':
        // Data channel state wins over ICE — it's what drives the
        // actual `send()` path. Only upgrade to 'connected' once
        // the data channel's `onopen` has fired (above).
        break;
    }
  };
}

/**
 * Hard cap on how long we wait for ICE gathering to finish before
 * returning the SDP with whatever candidates have arrived so far.
 *
 * Why a cap matters (0.62.1): some networks can't reach one or more
 * of the STUN endpoints (corporate firewall, captive portal, ad-
 * blocking DNS, …). Chrome's internal ICE timeout is ~40 seconds
 * per unreachable candidate server — which the user experiences as
 * "creating the invitation took a full minute." By short-circuiting
 * at 5s we return a SDP containing at least the host candidates
 * (the LAN IP) and whatever srflx candidates finished in time;
 * that's enough for LAN peers + the vast majority of home NATs.
 * Peers behind symmetric NATs would have needed TURN anyway —
 * waiting 60s for a never-arriving relay candidate doesn't help.
 */
const ICE_GATHERING_TIMEOUT_MS = 5_000;

/**
 * Wait for ICE gathering to resolve. Returns a JSON-stringified
 * `localDescription` containing every candidate gathered by the
 * time we resolve. Resolution order of preference:
 *
 *   1. `iceGatheringState === 'complete'` (best case — all
 *      reachable servers answered and gathering finished naturally).
 *   2. A `null` ICE candidate event (MDN + webrtc-pc spec: "An
 *      icecandidate event with a null candidate indicates that the
 *      end of gathering has been reached"). Some browsers fire
 *      this before flipping `iceGatheringState`.
 *   3. Timeout after {@link ICE_GATHERING_TIMEOUT_MS}. This is the
 *      pragmatic "don't make the user wait a full minute" guard;
 *      returns whatever SDP candidates are present.
 */
async function waitForIceGathering(pc: RTCPeerConnection): Promise<string> {
  if (pc.iceGatheringState === 'complete') {
    return JSON.stringify(pc.localDescription);
  }
  return new Promise<string>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('icegatheringstatechange', onStateChange);
      pc.removeEventListener('icecandidate', onCandidate);
      if (timer !== null) clearTimeout(timer);
      resolve(JSON.stringify(pc.localDescription));
    };

    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };

    const onCandidate = (ev: RTCPeerConnectionIceEvent) => {
      // Null candidate = end-of-gathering signal per the WebRTC spec.
      // Some browsers fire this before the iceGatheringState
      // transitions to 'complete', so we listen for both.
      if (ev.candidate === null) finish();
    };

    pc.addEventListener('icegatheringstatechange', onStateChange);
    pc.addEventListener('icecandidate', onCandidate);
    timer = setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);

    // Defensive: if gathering already finished between
    // `setLocalDescription` and this listener being attached,
    // the events would never fire — re-check on the next microtask.
    Promise.resolve().then(onStateChange);
  });
}

/**
 * Create a HOST peer. Generates an SDP offer on first `offer()`
 * call, then waits for `acceptAnswer()` with the guest's reply.
 */
export function createHostPeer(opts: PeerOptions = {}): HostPeer {
  const pc = createPeerConnection(opts);
  const dc = pc.createDataChannel(DATA_CHANNEL_LABEL);
  let state: PeerState = 'new';
  const messageListeners = new Set<(msg: SyncEnvelope) => void>();
  const stateListeners = new Set<(s: PeerState) => void>();

  function setState(next: PeerState): void {
    if (state === next) return;
    state = next;
    for (const l of stateListeners) l(state);
  }

  wireDataChannel(pc, dc, setState, messageListeners);

  async function offer(): Promise<string> {
    setState('connecting');
    const desc = await pc.createOffer();
    await pc.setLocalDescription(desc);
    return waitForIceGathering(pc);
  }

  async function acceptAnswer(answerStr: string): Promise<void> {
    const desc = JSON.parse(answerStr) as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(desc);
    // `connected` fires via the data channel's onopen handler.
  }

  function send(msg: SyncEnvelope): void {
    if (dc.readyState !== 'open') return;
    try {
      dc.send(JSON.stringify(msg));
    } catch (err) {
      console.warn('[remote-peer host] send failed', err);
    }
  }

  function close(): void {
    setState('closed');
    dc.close();
    pc.close();
    messageListeners.clear();
    stateListeners.clear();
  }

  return {
    role: 'host',
    getState: () => state,
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    send,
    close,
    offer,
    acceptAnswer,
  };
}

/**
 * Create a GUEST peer. Accepts the host's offer, creates the local
 * data channel via the `ondatachannel` callback, then generates
 * an answer that the caller ships back to the host.
 */
export function createGuestPeer(
  offerStr: string,
  opts: PeerOptions = {},
): GuestPeer {
  const pc = createPeerConnection(opts);
  let state: PeerState = 'new';
  const messageListeners = new Set<(msg: SyncEnvelope) => void>();
  const stateListeners = new Set<(s: PeerState) => void>();
  let dc: RTCDataChannel | null = null;

  function setState(next: PeerState): void {
    if (state === next) return;
    state = next;
    for (const l of stateListeners) l(state);
  }

  pc.ondatachannel = (ev) => {
    dc = ev.channel;
    wireDataChannel(pc, dc, setState, messageListeners);
  };

  async function answer(): Promise<string> {
    setState('connecting');
    const offerDesc = JSON.parse(offerStr) as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(offerDesc);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    return waitForIceGathering(pc);
  }

  function send(msg: SyncEnvelope): void {
    if (!dc || dc.readyState !== 'open') return;
    try {
      dc.send(JSON.stringify(msg));
    } catch (err) {
      console.warn('[remote-peer guest] send failed', err);
    }
  }

  function close(): void {
    setState('closed');
    dc?.close();
    pc.close();
    messageListeners.clear();
    stateListeners.clear();
  }

  return {
    role: 'guest',
    getState: () => state,
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    send,
    close,
    answer,
  };
}

/** `true` when the browser exposes a RTCPeerConnection constructor. */
export function isWebRtcSupported(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
): boolean {
  if (!win) return false;
  return typeof (win as unknown as { RTCPeerConnection?: unknown })
    .RTCPeerConnection === 'function';
}
