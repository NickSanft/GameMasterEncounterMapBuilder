/**
 * Phase 73 — animated dice tray.
 *
 * Lazy-loaded: `dice-panel.ts` pulls this module in via `import()` on
 * the first roll, so the animation code (HTML-string-building + SVG
 * polygons + per-frame timers) doesn't bloat the initial bundle.
 *
 * Visual model:
 *   - A bottom-centered overlay panel renders one polygon silhouette
 *     per die in the roll (via `flattenGroups` → `FlatRoll[]`).
 *   - Tumble phase (~700ms): each die rotates + its face number
 *     cycles through random values via a ~60ms interval.
 *   - Settle phase (~220ms): rotation eases to zero, the real rolled
 *     value locks in with a brief scale pop + drop-shadow glow.
 *   - Hold phase (~2400ms): static, showing the values + caption +
 *     total.
 *   - Fade phase (~200ms): opacity → 0, then the tray is removed.
 *
 * Early-dismiss: a click anywhere on the overlay OR pressing Escape
 * skips directly to fade.
 *
 * Reduced motion: skip the tumble — just fade in, show the result
 * for ~1.5s, fade out. Same code path, fewer keyframes.
 *
 * Non-goals: no physics, no real 3D. A higher-fidelity renderer
 * would bring in 3-500 KB of WebGL / physics code which the
 * project's bundle budget can't absorb. The 2D polygon + face-
 * cycle approach gets the D&D Beyond "tumble-and-settle" feel for
 * under 3 KB lazy-loaded.
 */

import type { DiceRollResult } from '../state/dice.js';
import {
  shapeForSides,
  faceLabel,
  flattenGroups,
  buildTumbleFrames,
  type FlatRoll,
} from './dice-animation-shapes.js';

export interface DiceAnimationOptions {
  /** If true, skip the tumble and just flash the result. */
  reducedMotion?: boolean;
  /** Source of the roll — drives the caption. */
  who?: 'local' | 'gm' | 'spectator';
  /** Display name of the roller (Phase 63). */
  senderName?: string;
}

const TUMBLE_MS = 700;
const SETTLE_MS = 220;
const HOLD_MS = 2400;
const FADE_MS = 200;
const FRAME_INTERVAL_MS = 60;
const REDUCED_HOLD_MS = 1500;

let activeTray: HTMLDivElement | null = null;

/**
 * Render + animate the tray for this roll. Returns a promise that
 * resolves when the tray has been removed from the DOM. Subsequent
 * calls mid-animation replace the current tray immediately (so a
 * rapid-fire roller doesn't stack up overlapping trays).
 */
export async function playDiceAnimation(
  result: DiceRollResult,
  opts: DiceAnimationOptions = {},
): Promise<void> {
  // Replace any in-flight tray immediately.
  if (activeTray) {
    activeTray.remove();
    activeTray = null;
  }

  const dice = flattenGroups(result.groups);
  const tray = buildTray(result, dice, opts);
  document.body.appendChild(tray);
  activeTray = tray;

  // Force a reflow so the opening transition actually runs.
  void tray.offsetWidth;
  tray.classList.add('dice-tray-in');

  const earlyDismiss = new Promise<void>((resolve) => {
    const dismiss = () => resolve();
    tray.addEventListener('click', dismiss, { once: true });
    const escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
      }
    };
    window.addEventListener('keydown', escListener);
    // Cleanup the esc listener when the tray tears down (handled
    // in the main flow via a sentinel on the element).
    (tray as unknown as { __escListener?: (e: KeyboardEvent) => void }).__escListener = escListener;
  });

  if (opts.reducedMotion) {
    // Skip the tumble. The face values are already the final ones
    // (we set them up-front in buildTray when reducedMotion is on).
    await Promise.race([wait(REDUCED_HOLD_MS), earlyDismiss]);
  } else {
    // Tumble: cycle face values at FRAME_INTERVAL_MS per frame.
    const tumblers = startTumble(tray, dice);
    await Promise.race([wait(TUMBLE_MS), earlyDismiss]);
    stopTumble(tumblers);
    // Settle: lock in the real values + trigger the settle-pop CSS.
    applyFinalFaces(tray, dice);
    tray.classList.add('dice-tray-settled');
    await Promise.race([wait(SETTLE_MS + HOLD_MS), earlyDismiss]);
  }

  tray.classList.add('dice-tray-out');
  await wait(FADE_MS);
  const esc = (tray as unknown as { __escListener?: (e: KeyboardEvent) => void }).__escListener;
  if (esc) window.removeEventListener('keydown', esc);
  tray.remove();
  if (activeTray === tray) activeTray = null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildTray(
  result: DiceRollResult,
  dice: readonly FlatRoll[],
  opts: DiceAnimationOptions,
): HTMLDivElement {
  const tray = document.createElement('div');
  tray.className = 'dice-tray';
  tray.setAttribute('role', 'status');
  tray.setAttribute('aria-live', 'polite');

  const caption = buildCaption(result, opts);
  tray.appendChild(caption);

  const diceRow = document.createElement('div');
  diceRow.className = 'dice-tray-dice';
  for (let i = 0; i < dice.length; i++) {
    diceRow.appendChild(buildDie(dice[i]!, i, opts.reducedMotion));
  }
  tray.appendChild(diceRow);

  const totalRow = document.createElement('div');
  totalRow.className = 'dice-tray-total';
  const totalLabel = document.createElement('span');
  totalLabel.className = 'dice-tray-total-label';
  totalLabel.textContent = 'Total';
  const totalValue = document.createElement('span');
  totalValue.className = 'dice-tray-total-value';
  totalValue.textContent = String(result.total);
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalValue);
  tray.appendChild(totalRow);

  return tray;
}

function buildCaption(
  result: DiceRollResult,
  opts: DiceAnimationOptions,
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'dice-tray-caption';

  const who = opts.who ?? 'local';
  const name = opts.senderName?.trim();
  const whoText =
    who === 'local'
      ? 'You rolled'
      : name
        ? `${name} rolled`
        : who === 'gm'
          ? 'GM rolled'
          : 'Spectator rolled';

  const whoEl = document.createElement('span');
  whoEl.className = 'dice-tray-who';
  whoEl.textContent = whoText;

  const sourceEl = document.createElement('span');
  sourceEl.className = 'dice-tray-source';
  sourceEl.textContent = result.source;

  el.appendChild(whoEl);
  el.appendChild(sourceEl);
  return el;
}

function buildDie(roll: FlatRoll, index: number, reducedMotion?: boolean): HTMLDivElement {
  const shape = shapeForSides(roll.sides);
  const el = document.createElement('div');
  el.className = 'dice-tray-die';
  el.dataset.idx = String(index);
  el.dataset.sides = String(roll.sides);
  el.dataset.finalFace = String(roll.value);
  if (!roll.kept) el.classList.add('dice-tray-die-dropped');
  if (roll.sign === -1) el.classList.add('dice-tray-die-negative');

  // Deterministic-but-varied per-die rotation start so a batch of
  // 4d6 doesn't tumble in lockstep.
  const seedRot = (index * 37) % 360;
  el.style.setProperty('--dice-seed-rot', `${seedRot}deg`);

  // SVG silhouette.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-1.1 -1.1 2.2 2.2');
  svg.setAttribute('class', 'dice-tray-svg');
  svg.setAttribute('aria-hidden', 'true');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', shape.points);
  polygon.setAttribute('fill', shape.color);
  polygon.setAttribute('stroke', 'rgba(255,255,255,0.25)');
  polygon.setAttribute('stroke-width', '0.08');
  polygon.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(polygon);

  // Face number — a <text> element centered with the shape's Y offset.
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', String(shape.textOffsetY));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('class', 'dice-tray-face');
  // Reduced motion: show the final value from frame 1 (no tumble).
  text.textContent = faceLabel(
    roll.sides,
    reducedMotion ? roll.value : roll.value,
  );
  svg.appendChild(text);

  el.appendChild(svg);

  // Under-die caption — "d20" + an optional "-" prefix for negative
  // groups. Small, muted; disappears once settled to let the face
  // number dominate.
  const sub = document.createElement('span');
  sub.className = 'dice-tray-die-sub';
  sub.textContent = `${roll.sign === -1 ? '−' : ''}d${roll.sides}`;
  el.appendChild(sub);

  return el;
}

/**
 * Start the per-die tumble intervals. Returns the timer handles so
 * the caller can stop them on settle / dismiss. Each die gets its
 * OWN pre-built frame list (from `buildTumbleFrames`) so ties go
 * to different random sequences — makes a batch of 4d6 look like
 * four different dice rather than one die rendered four times.
 */
function startTumble(
  tray: HTMLDivElement,
  dice: readonly FlatRoll[],
): number[] {
  const handles: number[] = [];
  const dieEls = tray.querySelectorAll<HTMLDivElement>('.dice-tray-die');
  dieEls.forEach((el, i) => {
    const roll = dice[i];
    if (!roll) return;
    el.classList.add('dice-tray-die-tumbling');
    const frames = buildTumbleFrames(roll.sides, roll.value);
    const faceEl = el.querySelector<SVGTextElement>('.dice-tray-face');
    let f = 0;
    if (faceEl && frames.length > 0) {
      faceEl.textContent = faceLabel(roll.sides, frames[0]!);
    }
    const h = window.setInterval(() => {
      f++;
      if (faceEl && frames.length > 0) {
        faceEl.textContent = faceLabel(roll.sides, frames[f % frames.length]!);
      }
    }, FRAME_INTERVAL_MS);
    handles.push(h);
  });
  return handles;
}

function stopTumble(handles: readonly number[]): void {
  for (const h of handles) window.clearInterval(h);
}

/**
 * Lock in each die's final face value + drop the tumble class so
 * the settle keyframes run.
 */
function applyFinalFaces(tray: HTMLDivElement, dice: readonly FlatRoll[]): void {
  const dieEls = tray.querySelectorAll<HTMLDivElement>('.dice-tray-die');
  dieEls.forEach((el, i) => {
    const roll = dice[i];
    if (!roll) return;
    el.classList.remove('dice-tray-die-tumbling');
    el.classList.add('dice-tray-die-settled');
    const faceEl = el.querySelector<SVGTextElement>('.dice-tray-face');
    if (faceEl) faceEl.textContent = faceLabel(roll.sides, roll.value);
  });
}
