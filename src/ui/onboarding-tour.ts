/**
 * Onboarding tour DOM mount (Phase 61).
 *
 * Renders the popover + dim backdrop + cutout for the current tour
 * step, delegating step navigation to a `TourController` from
 * `state/onboarding-tour.ts`.
 *
 * Layout strategy:
 *   - **Backdrop**: a fixed-position overlay covering the whole
 *     viewport. Rendered as four `.tour-backdrop-piece` divs (top,
 *     left, right, bottom) sized to surround the target rect — this
 *     gives us a real cutout (interactive elements inside are still
 *     clickable) without needing SVG masks. For the centered (no-
 *     target) steps we collapse the four pieces into one big div.
 *   - **Popover**: a fixed-position card with title + body + Skip /
 *     Back / Next buttons. Anchored relative to the target rect via
 *     the step's `placement`; falls back to centered when the
 *     target isn't found in the DOM (defensive — UI changes can
 *     leave a stale selector).
 *   - **Window resize / scroll** triggers a re-layout so the popover
 *     follows the target if anything moves.
 */

import type { TourController } from '../state/onboarding-tour.js';

export interface OnboardingTourHandle {
  /** Mount + show the tour. No-op if already showing. */
  open(): void;
  /** Tear down the DOM (does NOT touch the controller's complete/skip state). */
  close(): void;
  /** True when the tour DOM is mounted. */
  isOpen(): boolean;
}

const TOUR_GAP_PX = 12;
const POPOVER_WIDTH = 340;

export function mountOnboardingTour(controller: TourController): OnboardingTourHandle {
  let root: HTMLDivElement | null = null;
  let unsubscribe: (() => void) | null = null;
  let layoutFrame = 0;

  function open(): void {
    if (root) return;
    root = document.createElement('div');
    root.className = 'tour-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Onboarding tour');
    root.innerHTML = `
      <div class="tour-backdrop-piece" data-region="top"></div>
      <div class="tour-backdrop-piece" data-region="left"></div>
      <div class="tour-backdrop-piece" data-region="right"></div>
      <div class="tour-backdrop-piece" data-region="bottom"></div>
      <div class="tour-popover" data-field="popover" role="document">
        <div class="tour-popover-header">
          <h3 class="tour-popover-title" data-field="title"></h3>
          <span class="tour-popover-counter" data-field="counter" aria-live="polite"></span>
        </div>
        <p class="tour-popover-body" data-field="body"></p>
        <div class="tour-popover-actions">
          <button type="button" class="tour-popover-skip" data-action="skip">Skip tour</button>
          <div class="tour-popover-nav">
            <button type="button" class="tour-popover-back" data-action="back">‹ Back</button>
            <button type="button" class="tour-popover-next primary" data-action="next">Next ›</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const skipBtn = root.querySelector<HTMLButtonElement>('[data-action="skip"]')!;
    const backBtn = root.querySelector<HTMLButtonElement>('[data-action="back"]')!;
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-action="next"]')!;

    skipBtn.addEventListener('click', () => {
      controller.skip();
      close();
    });
    backBtn.addEventListener('click', () => controller.prev());
    nextBtn.addEventListener('click', () => {
      const state = controller.getState();
      if (state.isLast) {
        controller.finish();
        close();
      } else {
        controller.next();
      }
    });

    // Initial render + subscribe to step changes.
    render();
    unsubscribe = controller.subscribe(() => render());

    // Re-layout on viewport changes so the popover follows the target.
    window.addEventListener('resize', scheduleRelayout);
    window.addEventListener('scroll', scheduleRelayout, true);

    // Esc key skips. Captured at window level so the modal-style
    // role doesn't trap it.
    window.addEventListener('keydown', onKeyDown);

    // Move keyboard focus to the popover so screen-readers announce
    // the title without us having to spam aria-live.
    window.setTimeout(() => nextBtn.focus(), 0);
  }

  function close(): void {
    if (!root) return;
    window.removeEventListener('resize', scheduleRelayout);
    window.removeEventListener('scroll', scheduleRelayout, true);
    window.removeEventListener('keydown', onKeyDown);
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    unsubscribe?.();
    unsubscribe = null;
    root.remove();
    root = null;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      controller.skip();
      close();
      e.preventDefault();
    }
  }

  function scheduleRelayout(): void {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      if (root) render();
    });
  }

  function render(): void {
    if (!root) return;
    const state = controller.getState();
    const titleEl = root.querySelector<HTMLElement>('[data-field="title"]')!;
    const bodyEl = root.querySelector<HTMLElement>('[data-field="body"]')!;
    const counterEl = root.querySelector<HTMLElement>('[data-field="counter"]')!;
    const popover = root.querySelector<HTMLElement>('[data-field="popover"]')!;
    const backBtn = root.querySelector<HTMLButtonElement>('[data-action="back"]')!;
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-action="next"]')!;
    titleEl.textContent = state.step.title;
    bodyEl.textContent = state.step.body;
    counterEl.textContent = `${state.index + 1} of ${state.total}`;
    backBtn.hidden = state.isFirst;
    nextBtn.textContent = state.isLast ? 'Finish' : 'Next ›';

    const targetRect = resolveTargetRect(state.step.target);
    layoutBackdrop(targetRect);
    layoutPopover(popover, targetRect, state.step.placement ?? 'bottom');
    popover.dataset['stepId'] = state.step.id;
  }

  function resolveTargetRect(selector: string | null): DOMRect | null {
    if (!selector) return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  function layoutBackdrop(target: DOMRect | null): void {
    if (!root) return;
    const top = root.querySelector<HTMLElement>('[data-region="top"]')!;
    const left = root.querySelector<HTMLElement>('[data-region="left"]')!;
    const right = root.querySelector<HTMLElement>('[data-region="right"]')!;
    const bottom = root.querySelector<HTMLElement>('[data-region="bottom"]')!;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!target) {
      // Centered step — one solid backdrop, the other three pieces zero-sized.
      Object.assign(top.style, { top: '0px', left: '0px', width: `${vw}px`, height: `${vh}px` });
      hideRect(left);
      hideRect(right);
      hideRect(bottom);
      return;
    }
    // Four pieces around the target, leaving an interactive cutout.
    Object.assign(top.style, {
      top: '0px',
      left: '0px',
      width: `${vw}px`,
      height: `${target.top}px`,
    });
    Object.assign(left.style, {
      top: `${target.top}px`,
      left: '0px',
      width: `${target.left}px`,
      height: `${target.height}px`,
    });
    Object.assign(right.style, {
      top: `${target.top}px`,
      left: `${target.right}px`,
      width: `${vw - target.right}px`,
      height: `${target.height}px`,
    });
    Object.assign(bottom.style, {
      top: `${target.bottom}px`,
      left: '0px',
      width: `${vw}px`,
      height: `${vh - target.bottom}px`,
    });
  }

  function hideRect(el: HTMLElement): void {
    Object.assign(el.style, { width: '0px', height: '0px' });
  }

  function layoutPopover(
    popover: HTMLElement,
    target: DOMRect | null,
    placement: 'top' | 'bottom' | 'left' | 'right',
  ): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!target) {
      // Centered step — pin to the viewport center.
      const popoverRect = popover.getBoundingClientRect();
      const left = Math.max(8, (vw - (popoverRect.width || POPOVER_WIDTH)) / 2);
      const top = Math.max(8, (vh - popoverRect.height) / 2);
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.dataset['placement'] = 'center';
      return;
    }
    const popoverRect = popover.getBoundingClientRect();
    const w = popoverRect.width || POPOVER_WIDTH;
    const h = popoverRect.height || 200;
    let left = 0;
    let top = 0;
    switch (placement) {
      case 'top':
        left = clampToViewport(target.left + target.width / 2 - w / 2, w, vw);
        top = Math.max(8, target.top - h - TOUR_GAP_PX);
        break;
      case 'bottom':
        left = clampToViewport(target.left + target.width / 2 - w / 2, w, vw);
        top = Math.min(vh - h - 8, target.bottom + TOUR_GAP_PX);
        break;
      case 'left':
        left = Math.max(8, target.left - w - TOUR_GAP_PX);
        top = clampToViewport(target.top + target.height / 2 - h / 2, h, vh);
        break;
      case 'right':
        left = Math.min(vw - w - 8, target.right + TOUR_GAP_PX);
        top = clampToViewport(target.top + target.height / 2 - h / 2, h, vh);
        break;
    }
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.dataset['placement'] = placement;
  }

  function clampToViewport(value: number, dimension: number, viewport: number): number {
    return Math.max(8, Math.min(viewport - dimension - 8, value));
  }

  return {
    open,
    close,
    isOpen: () => root !== null,
  };
}
