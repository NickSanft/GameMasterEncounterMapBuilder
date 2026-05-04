/**
 * Phase 138 — condition icon module tests.
 *
 * `Path2D` requires DOM-canvas support; jsdom (vitest's default)
 * provides a stub. We assert the shape of the public API + that
 * every condition preset has an icon, rather than pixel-checking
 * the rendered glyph (out of scope for unit tests; the visual
 * regression spec covers actual paint output).
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getConditionIconPath,
  drawConditionIcon,
  listIconIds,
  _resetIconCache,
} from './condition-icons.js';
import { CONDITION_PRESETS } from '../state/conditions.js';

// jsdom does NOT ship Path2D — stub it so the icon module can build
// path instances under unit test. The stub stores the SVG string and
// is otherwise inert (the canvas mock used in `drawConditionIcon`'s
// test stubs `ctx.stroke` separately).
beforeAll(() => {
  if (typeof globalThis.Path2D === 'undefined') {
    class StubPath2D {
      readonly d: string;
      constructor(d: string) {
        this.d = d;
      }
    }
    (globalThis as unknown as { Path2D: typeof Path2D }).Path2D =
      StubPath2D as unknown as typeof Path2D;
  }
});

beforeEach(() => {
  _resetIconCache();
});

describe('condition icons (Phase 138)', () => {
  it('has an icon for every CONDITION_PRESETS entry', () => {
    const ids = new Set(listIconIds());
    for (const preset of CONDITION_PRESETS) {
      expect(ids.has(preset.id)).toBe(true);
    }
  });

  it('listIconIds returns 17 ids (matching the preset count)', () => {
    expect(listIconIds().length).toBe(CONDITION_PRESETS.length);
  });

  it('getConditionIconPath returns a Path2D for known ids', () => {
    const p = getConditionIconPath('blinded');
    expect(p).toBeInstanceOf(Path2D);
  });

  it('getConditionIconPath returns null for unknown ids', () => {
    expect(getConditionIconPath('made-up-condition')).toBe(null);
  });

  it('caches Path2D instances — second lookup returns the same object', () => {
    const a = getConditionIconPath('charmed');
    const b = getConditionIconPath('charmed');
    expect(a).toBe(b);
  });

  it('_resetIconCache clears the cache (subsequent lookup builds a new instance)', () => {
    const a = getConditionIconPath('paralyzed');
    _resetIconCache();
    const b = getConditionIconPath('paralyzed');
    expect(a).not.toBe(b);
    // Both are still valid Path2D instances.
    expect(a).toBeInstanceOf(Path2D);
    expect(b).toBeInstanceOf(Path2D);
  });

  it('drawConditionIcon returns false for unknown ids (caller falls back)', () => {
    const ctx = makeFakeCtx();
    expect(
      drawConditionIcon(
        ctx as unknown as CanvasRenderingContext2D,
        'made-up',
        50,
        50,
        10,
        '#fff',
      ),
    ).toBe(false);
  });

  it('drawConditionIcon returns true + invokes ctx.stroke for known ids', () => {
    const ctx = makeFakeCtx();
    expect(
      drawConditionIcon(
        ctx as unknown as CanvasRenderingContext2D,
        'stunned',
        50,
        50,
        10,
        '#fff',
      ),
    ).toBe(true);
    expect(ctx.strokeCalls).toBe(1);
  });

  it('drawConditionIcon balances save / restore', () => {
    const ctx = makeFakeCtx();
    drawConditionIcon(
      ctx as unknown as CanvasRenderingContext2D,
      'poisoned',
      50,
      50,
      10,
      '#fff',
    );
    expect(ctx.saveCalls).toBe(ctx.restoreCalls);
  });
});

interface FakeCtx {
  strokeCalls: number;
  saveCalls: number;
  restoreCalls: number;
  stroke: (path?: Path2D) => void;
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  scale: (x: number, y: number) => void;
  lineWidth: number;
  strokeStyle: string;
  lineCap: string;
  lineJoin: string;
}

function makeFakeCtx(): FakeCtx {
  const ctx: FakeCtx = {
    strokeCalls: 0,
    saveCalls: 0,
    restoreCalls: 0,
    stroke() {
      ctx.strokeCalls++;
    },
    save() {
      ctx.saveCalls++;
    },
    restore() {
      ctx.restoreCalls++;
    },
    translate() {},
    scale() {},
    lineWidth: 1,
    strokeStyle: '',
    lineCap: '',
    lineJoin: '',
  };
  return ctx;
}
