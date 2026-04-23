/**
 * Onboarding tour state machine (Phase 61).
 *
 * Pure, framework-free. The UI module (`src/ui/onboarding-tour.ts`)
 * owns the popover DOM and just asks this module for the current
 * step + drives transitions via `next`, `prev`, `skip`, `finish`.
 *
 * Why a separate module: a state machine is trivial to unit-test
 * without spinning up a DOM, and keeping the step config out of the
 * UI layer means the same definitions can drive both the GM tour
 * and (in a future phase) a Spectator-side tour without duplicating
 * the navigation logic.
 */

export interface TourStep {
  /** Stable id for analytics + the e2e selector. */
  id: string;
  /** Short title shown at the top of the popover. */
  title: string;
  /** Body copy — supports plain text only (no HTML for safety). */
  body: string;
  /**
   * CSS selector for the element the popover should anchor to.
   * `null` means a centered popover with no anchored element + no
   * highlight cutout (used for intro / outro screens).
   */
  target: string | null;
  /**
   * Where the popover should sit relative to the target. Ignored
   * when `target` is null (centered). Defaults to 'bottom'.
   */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourState {
  /** Zero-based index into the steps array. */
  index: number;
  /** Total step count (capped from the input array). */
  total: number;
  /** Current step (always equal to `steps[index]`). */
  step: TourStep;
  /** True when on the last step (Next button label changes to Finish). */
  isLast: boolean;
  /** True when on the first step (Back button is hidden). */
  isFirst: boolean;
}

export interface TourController {
  /** Read-only snapshot. */
  getState(): TourState;
  /** Advance to the next step. No-op when already on the last step. */
  next(): void;
  /** Step backward. No-op on the first step. */
  prev(): void;
  /** Jump directly to a step index (clamped to valid range). */
  goTo(index: number): void;
  /** Subscribe to state changes. Returns an unsubscribe fn. */
  subscribe(listener: (state: TourState) => void): () => void;
  /** Did the user complete the tour (reached the end + clicked Finish)? */
  isComplete(): boolean;
  /** Did the user explicitly skip the tour mid-flight? */
  isSkipped(): boolean;
  /** Complete the tour. Fires the `onComplete` callback. */
  finish(): void;
  /** Skip the tour. Fires the `onSkip` callback. */
  skip(): void;
}

export interface TourControllerOptions {
  steps: readonly TourStep[];
  /** Fired exactly once when `finish()` runs. */
  onComplete?: () => void;
  /** Fired exactly once when `skip()` runs. */
  onSkip?: () => void;
}

export function createTourController(opts: TourControllerOptions): TourController {
  if (opts.steps.length === 0) {
    throw new Error('createTourController: steps must be non-empty');
  }
  const steps = opts.steps;
  const total = steps.length;
  let index = 0;
  let complete = false;
  let skipped = false;
  const listeners = new Set<(state: TourState) => void>();

  function snapshot(): TourState {
    const step = steps[index]!;
    return {
      index,
      total,
      step,
      isFirst: index === 0,
      isLast: index === total - 1,
    };
  }

  function notify(): void {
    const state = snapshot();
    for (const l of listeners) l(state);
  }

  function next(): void {
    if (index >= total - 1) return;
    index++;
    notify();
  }

  function prev(): void {
    if (index <= 0) return;
    index--;
    notify();
  }

  function goTo(target: number): void {
    const clamped = Math.max(0, Math.min(total - 1, Math.floor(target)));
    if (clamped === index) return;
    index = clamped;
    notify();
  }

  function finish(): void {
    if (complete || skipped) return;
    complete = true;
    opts.onComplete?.();
  }

  function skip(): void {
    if (complete || skipped) return;
    skipped = true;
    opts.onSkip?.();
  }

  return {
    getState: snapshot,
    next,
    prev,
    goTo,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isComplete: () => complete,
    isSkipped: () => skipped,
    finish,
    skip,
  };
}

/**
 * Default GM tour steps. Lives next to the controller so tests +
 * production can both use the same canonical list. Callers can pass
 * their own steps to `createTourController` for a custom tour (e.g.
 * a future Spectator-side walk-through).
 */
export const GM_TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to GM Encounter Maps',
    body: "A quick tour of the GM view — six steps, takes about 30 seconds. You can skip anytime.",
    target: null,
  },
  {
    id: 'toolbar',
    title: 'Tools',
    body: "Pick a tool here, or use the keyboard shortcut shown on each button — T for Token, S for Select, R/H for Reveal/Hide fog, M for Map, W for Walls.",
    target: '.toolbar',
    placement: 'bottom',
  },
  {
    id: 'canvas',
    title: 'The map',
    body: "Click the canvas to place tokens (Token tool active) or to select them (Select tool). Drag tokens to move; right-click for actions like Damage / Heal, conditions, and visibility.",
    target: '#canvas',
    placement: 'top',
  },
  {
    id: 'session-menu',
    title: 'Session menu',
    body: "Save and switch between named scenes, upload a map background, configure settings, open the dice roller and notes panel — all the GM-side controls live here.",
    target: '.session-menu',
    placement: 'left',
  },
  {
    id: 'spectator',
    title: 'Spectator view',
    body: "Open spectator.html in a separate browser tab to mirror the map to your players. Fog, tokens, annotations, and dice rolls all sync automatically over BroadcastChannel — no server required.",
    target: null,
  },
  {
    id: 'help',
    title: 'You\u2019re ready',
    body: "Press ? for the full keyboard shortcut overlay. The session menu has a \u201CTake the tour\u201D entry to replay this walk-through anytime.",
    target: '.help-button',
    placement: 'top',
  },
];
