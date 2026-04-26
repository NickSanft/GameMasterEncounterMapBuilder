/**
 * @vitest-environment jsdom
 *
 * 0.84.1 — focused tests on the Spectator fog masking behavior. The
 * pre-0.84.1 bug: the overlay only checked the top-left cell against
 * raw `state.fog`, so animated GIFs leaked through the LoS-derived
 * effective fog. Two fixes pinned here:
 *   1. The overlay accepts a `getEffectiveFog?()` callback and uses
 *      it (instead of state.fog) when present + mode === 'spectator'.
 *   2. Visibility is checked across the token's full footprint — any
 *      hidden cell hides the GIF entirely, even for size > 1 tokens
 *      partially in fog. (The DOM <img> can't be partially masked by
 *      the canvas fog overlay the way a canvas-rendered token can.)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountAnimatedTokenOverlay } from './animated-token-overlay.js';
import type { SessionState, Token, Camera } from '../state/types.js';
import { createDefaultState } from '../state/types.js';

function makeToken(over: Partial<Token> = {}): Token {
  return {
    id: 't1',
    x: 5,
    y: 5,
    label: 'A',
    color: '#ff0000',
    imageId: 'img-1',
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ...over,
  };
}

function makeState(over: Partial<SessionState> = {}): SessionState {
  const s = createDefaultState();
  return { ...s, ...over };
}

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // Stub the layout values jsdom doesn't compute.
  Object.defineProperty(c, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(c, 'clientHeight', { value: 600, configurable: true });
  document.body.appendChild(c);
  return c;
}

const camera: Camera = { x: 0, y: 0, zoom: 1 };

describe('mountAnimatedTokenOverlay — Spectator fog (0.84.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a GIF token when its footprint cells are all revealed', () => {
    const state = makeState({ tokens: [makeToken()] });
    state.fog[5 * state.grid.cols + 5] = 1; // (5,5) revealed
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(1);
    handle.destroy();
  });

  it('hides the GIF when its footprint cell is in fog (raw state.fog fallback)', () => {
    const state = makeState({ tokens: [makeToken()] });
    // (5,5) left at default 0 = hidden; everything else also 0 here.
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(0);
    handle.destroy();
  });

  it('uses getEffectiveFog when provided — hides even when raw state.fog says revealed', () => {
    const state = makeState({ tokens: [makeToken()] });
    state.fog[5 * state.grid.cols + 5] = 1; // GM-revealed
    // Effective fog (LoS-masked) marks the same cell as hidden — the
    // player has no line-of-sight despite the GM revealing it.
    const effective = new Uint8Array(state.fog.length);
    // all zeros = nothing visible to spectator
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => effective,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(0);
    handle.destroy();
  });

  it('uses getEffectiveFog when provided — shows when LoS reveals a GM-hidden-by-default cell', () => {
    const state = makeState({ tokens: [makeToken()] });
    // raw state.fog left as default 0 (hidden everywhere)
    // effective fog marks the cell as visible — e.g. permanent light source
    // even without the GM having explicitly revealed it.
    const effective = new Uint8Array(state.fog.length);
    effective[5 * state.grid.cols + 5] = 1;
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => effective,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(1);
    handle.destroy();
  });

  it('hides a size-2 token when ANY footprint cell is hidden in effective fog', () => {
    // Token at (5,5) with size 2 covers cells (5,5), (5,6), (6,5), (6,6).
    const state = makeState({ tokens: [makeToken({ size: 2 })] });
    const effective = new Uint8Array(state.fog.length);
    // Three of four cells revealed; (6,6) hidden.
    effective[5 * state.grid.cols + 5] = 1;
    effective[5 * state.grid.cols + 6] = 1;
    effective[6 * state.grid.cols + 5] = 1;
    // effective[6*cols+6] left 0 = hidden
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => effective,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(0);
    handle.destroy();
  });

  it('shows a size-2 token only when ALL footprint cells are revealed', () => {
    const state = makeState({ tokens: [makeToken({ size: 2 })] });
    const effective = new Uint8Array(state.fog.length);
    // All four cells revealed.
    effective[5 * state.grid.cols + 5] = 1;
    effective[5 * state.grid.cols + 6] = 1;
    effective[6 * state.grid.cols + 5] = 1;
    effective[6 * state.grid.cols + 6] = 1;
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => effective,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(1);
    handle.destroy();
  });

  it('treats off-grid cells as hidden (no peeking GIFs in the void)', () => {
    // Default grid is 30 cols x 20 rows. Token straddles the right
    // edge at x = 29, size 2 → covers cells (29,5)+(30,5)+(29,6)+(30,6).
    // Cells with x = 30 are off the grid → token must be hidden.
    const state = makeState({ tokens: [makeToken({ x: 29, y: 5, size: 2 })] });
    const effective = new Uint8Array(state.fog.length);
    // Reveal everything that exists.
    for (let i = 0; i < effective.length; i++) effective[i] = 1;
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => effective,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(0);
    handle.destroy();
  });

  it('GM mode ignores fog entirely (always shows the GIF)', () => {
    const state = makeState({ tokens: [makeToken()] });
    // state.fog all zeros, no effective fog provided — would hide on
    // spectator, but GM should still see all tokens.
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'gm',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(1);
    handle.destroy();
  });

  it('falls back to state.fog when getEffectiveFog returns null', () => {
    const state = makeState({ tokens: [makeToken()] });
    state.fog[5 * state.grid.cols + 5] = 1; // revealed
    const handle = mountAnimatedTokenOverlay({
      canvas: makeCanvas(),
      mode: 'spectator',
      getState: () => state,
      getCamera: () => camera,
      isAnimated: () => true,
      getUrl: () => 'blob:fake',
      getEffectiveFog: () => null,
    });
    handle.update();
    expect(document.querySelectorAll('.animated-token-img')).toHaveLength(1);
    handle.destroy();
  });
});
