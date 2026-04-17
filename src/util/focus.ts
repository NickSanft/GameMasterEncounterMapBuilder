export function isEditableFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && isVisible(el));
}

export function attachFocusTrap(container: HTMLElement): void {
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = getFocusables(container);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (!container.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  });
}

export function rememberFocus(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

export function restoreFocus(el: HTMLElement | null): void {
  if (el && typeof el.focus === 'function') {
    el.focus();
  }
}

function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.offsetParent !== null || el.tagName === 'DIALOG';
}
