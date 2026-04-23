import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createHostPeer,
  createGuestPeer,
  isWebRtcSupported,
  DATA_CHANNEL_LABEL,
} from './remote-peer.js';
import type { SyncMessage } from './messages.js';

/**
 * Mock WebRTC plumbing. Enough to exercise the host / guest flows
 * without a real network stack — the wrapper module is deliberately
 * thin so this is mostly "did we call the right methods in the
 * right order + route events to listeners."
 */

interface MockDataChannel {
  readyState: 'connecting' | 'open' | 'closed';
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((ev: MessageEvent<string>) => void) | null;
  send: (data: string) => void;
  close: () => void;
  sent: string[];
}

function newDc(): MockDataChannel {
  return {
    readyState: 'connecting',
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    sent: [],
    send(data) {
      this.sent.push(data);
    },
    close() {
      this.readyState = 'closed';
      this.onclose?.();
    },
  };
}

class MockRtcPeerConnection {
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  iceGatheringState: RTCIceGatheringState = 'complete';
  iceConnectionState: RTCIceConnectionState = 'new';
  onicegatheringstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((ev: { channel: MockDataChannel }) => void) | null = null;
  // Host side keeps its channel in `hostDc`; guest side receives via
  // the `ondatachannel` event.
  hostDc: MockDataChannel | null = null;

  eventListeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, fn: () => void) {
    let set = this.eventListeners.get(type);
    if (!set) {
      set = new Set();
      this.eventListeners.set(type, set);
    }
    set.add(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.eventListeners.get(type)?.delete(fn);
  }
  createDataChannel(_label: string): MockDataChannel {
    this.hostDc = newDc();
    return this.hostDc;
  }
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'fake-offer-sdp' };
  }
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'fake-answer-sdp' };
  }
  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = desc;
  }
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    this.remoteDescription = desc;
    // For a guest peer, receiving the remote description is the
    // moment we'd see the host's data channel materialize. Emit
    // the `ondatachannel` synchronously for the test.
    if (desc.type === 'offer' && this.ondatachannel) {
      const dc = newDc();
      this.ondatachannel({ channel: dc });
      this.hostDc = dc; // expose for the test to flip state
    }
  }
  close() {
    this.iceConnectionState = 'closed';
    this.oniceconnectionstatechange?.();
  }
}

let lastPc: MockRtcPeerConnection | null = null;
function pcFactory(): RTCPeerConnection {
  lastPc = new MockRtcPeerConnection();
  return lastPc as unknown as RTCPeerConnection;
}

beforeEach(() => {
  lastPc = null;
});

describe('isWebRtcSupported', () => {
  it('returns false when window has no RTCPeerConnection', () => {
    const fake = {} as Window;
    expect(isWebRtcSupported(fake)).toBe(false);
  });

  it('returns true when RTCPeerConnection is a function on window', () => {
    const fake = { RTCPeerConnection: class {} } as unknown as Window;
    expect(isWebRtcSupported(fake)).toBe(true);
  });
});

describe('createHostPeer', () => {
  it('creates a data channel labeled with the protocol version', () => {
    const spy = vi.spyOn(
      MockRtcPeerConnection.prototype as unknown as {
        createDataChannel: (s: string) => MockDataChannel;
      },
      'createDataChannel',
    );
    createHostPeer({ pcFactory });
    expect(spy).toHaveBeenCalledWith(DATA_CHANNEL_LABEL);
    spy.mockRestore();
  });

  it('offer() returns an SDP string once ICE gathering completes', async () => {
    const peer = createHostPeer({ pcFactory });
    const offer = await peer.offer();
    expect(offer).toContain('fake-offer-sdp');
    expect(peer.getState()).toBe('connecting');
  });

  it('flips state to "connected" when the data channel opens', async () => {
    const peer = createHostPeer({ pcFactory });
    const states: string[] = [];
    peer.onStateChange((s) => states.push(s));
    await peer.offer();
    // Simulate the datachannel opening after the remote peer accepts.
    lastPc!.hostDc!.readyState = 'open';
    lastPc!.hostDc!.onopen?.();
    expect(peer.getState()).toBe('connected');
    expect(states).toContain('connected');
  });

  it('send() serializes + writes to the data channel when open', async () => {
    const peer = createHostPeer({ pcFactory });
    await peer.offer();
    lastPc!.hostDc!.readyState = 'open';
    lastPc!.hostDc!.onopen?.();
    const msg: SyncMessage = { type: 'hello', from: 'gm' };
    peer.send(msg);
    expect(lastPc!.hostDc!.sent).toEqual([JSON.stringify(msg)]);
  });

  it('send() silently drops when the data channel is not open', () => {
    const peer = createHostPeer({ pcFactory });
    const msg: SyncMessage = { type: 'hello', from: 'gm' };
    peer.send(msg);
    expect(lastPc!.hostDc!.sent).toEqual([]);
  });

  it('onMessage fires with parsed SyncMessage from datachannel onmessage', async () => {
    const peer = createHostPeer({ pcFactory });
    const received: SyncMessage[] = [];
    peer.onMessage((m) => received.push(m));
    await peer.offer();
    const msg: SyncMessage = { type: 'ping', x: 1, y: 2 };
    lastPc!.hostDc!.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent<string>);
    expect(received).toEqual([msg]);
  });

  it('onMessage silently drops malformed JSON', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const peer = createHostPeer({ pcFactory });
    const received: SyncMessage[] = [];
    peer.onMessage((m) => received.push(m));
    await peer.offer();
    lastPc!.hostDc!.onmessage?.({ data: 'not json' } as MessageEvent<string>);
    expect(received).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('acceptAnswer() sets the remote description from the parsed string', async () => {
    const peer = createHostPeer({ pcFactory });
    await peer.offer();
    const answerStr = JSON.stringify({ type: 'answer', sdp: 'real-answer' });
    await peer.acceptAnswer(answerStr);
    expect(lastPc!.remoteDescription).toEqual({
      type: 'answer',
      sdp: 'real-answer',
    });
  });

  it('close() closes the datachannel + peer connection + transitions to closed', () => {
    const peer = createHostPeer({ pcFactory });
    peer.close();
    expect(peer.getState()).toBe('closed');
    expect(lastPc!.hostDc!.readyState).toBe('closed');
  });
});

describe('createGuestPeer', () => {
  const OFFER_STR = JSON.stringify({ type: 'offer', sdp: 'fake-offer' });

  it('answer() generates an SDP answer after gathering ICE', async () => {
    const peer = createGuestPeer(OFFER_STR, { pcFactory });
    const ans = await peer.answer();
    expect(ans).toContain('fake-answer-sdp');
  });

  it('routes incoming datachannel messages to onMessage', async () => {
    const peer = createGuestPeer(OFFER_STR, { pcFactory });
    const received: SyncMessage[] = [];
    peer.onMessage((m) => received.push(m));
    await peer.answer();
    const msg: SyncMessage = { type: 'ping', x: 5, y: 5 };
    lastPc!.hostDc!.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent<string>);
    expect(received).toEqual([msg]);
  });

  it('send() after datachannel opens serializes to the channel', async () => {
    const peer = createGuestPeer(OFFER_STR, { pcFactory });
    await peer.answer();
    lastPc!.hostDc!.readyState = 'open';
    lastPc!.hostDc!.onopen?.();
    const msg: SyncMessage = { type: 'hello', from: 'spectator' };
    peer.send(msg);
    expect(lastPc!.hostDc!.sent).toEqual([JSON.stringify(msg)]);
  });

  it('send() before datachannel exists is a no-op (no crash)', () => {
    const peer = createGuestPeer(OFFER_STR, { pcFactory });
    // No answer() yet, so ondatachannel never fired — dc is null.
    expect(() => peer.send({ type: 'hello', from: 'spectator' })).not.toThrow();
  });

  it('close() tears down the peer connection', async () => {
    const peer = createGuestPeer(OFFER_STR, { pcFactory });
    await peer.answer();
    peer.close();
    expect(peer.getState()).toBe('closed');
  });
});
