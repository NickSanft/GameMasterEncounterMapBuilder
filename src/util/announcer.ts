/**
 * Central aria-live announcer. Produces two visually-hidden live regions —
 * one `polite` (default), one `assertive` — so the app can narrate events
 * to screen-reader users without shoving focus around.
 *
 * Usage:
 *   const announce = createAnnouncer();
 *   announce('Switched to Select tool');
 *   announce('Another GM tab detected', 'assertive');
 *
 * The same text in a row would be merged by some screen readers (because
 * the DOM mutation is a no-op); we guard that by appending a zero-width
 * space toggle so repeats are honoured.
 */
export type AnnouncerPriority = 'polite' | 'assertive';

export interface AnnouncerHandle {
  /** Queue a new announcement. Later calls replace earlier ones. */
  announce(message: string, priority?: AnnouncerPriority): void;
  /** Unmount the regions from the DOM. Mostly for tests. */
  destroy(): void;
  /** Read the current text of a region (test helper). */
  readCurrent(priority?: AnnouncerPriority): string;
}

export function createAnnouncer(parent: HTMLElement = document.body): AnnouncerHandle {
  const polite = makeRegion('polite');
  const assertive = makeRegion('assertive');
  parent.appendChild(polite);
  parent.appendChild(assertive);

  // Toggle flag — flips on every write so the DOM mutation is always
  // visible to screen readers even when the text doesn't change.
  let toggle = false;

  function announce(message: string, priority: AnnouncerPriority = 'polite'): void {
    const region = priority === 'assertive' ? assertive : polite;
    toggle = !toggle;
    // Non-breaking space suffix (only on toggled writes) keeps the text
    // visually identical but forces a DOM change.
    region.textContent = toggle ? `${message}\u00A0` : message;
  }

  function destroy(): void {
    polite.remove();
    assertive.remove();
  }

  function readCurrent(priority: AnnouncerPriority = 'polite'): string {
    const region = priority === 'assertive' ? assertive : polite;
    // Strip the trailing NBSP used for repeat-forcing.
    return (region.textContent ?? '').replace(/\u00A0$/, '');
  }

  return { announce, destroy, readCurrent };
}

function makeRegion(priority: AnnouncerPriority): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.dataset.announcer = priority;
  return el;
}
