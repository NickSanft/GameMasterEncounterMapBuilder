export interface ContextMenuItem {
  kind?: 'item';
  label: string;
  shortcut?: string;
  onClick(): void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

export interface ContextMenuSeparator {
  kind: 'separator';
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

export interface ContextMenuOptions {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  label?: string;
}

let currentMenu: HTMLElement | null = null;
let currentCleanup: (() => void) | null = null;

export function dismissContextMenu(): void {
  currentCleanup?.();
  currentCleanup = null;
  currentMenu?.remove();
  currentMenu = null;
}

export function showContextMenu(opts: ContextMenuOptions): void {
  dismissContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  if (opts.label) menu.setAttribute('aria-label', opts.label);

  const buttons: HTMLButtonElement[] = [];
  for (const entry of opts.items) {
    if ('kind' in entry && entry.kind === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'context-menu-sep';
      sep.setAttribute('role', 'separator');
      menu.appendChild(sep);
      continue;
    }

    const item = entry as ContextMenuItem;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'menuitem');
    if (item.variant === 'danger') btn.classList.add('danger');
    if (item.disabled) btn.disabled = true;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);
    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'shortcut';
      shortcut.textContent = item.shortcut;
      btn.appendChild(shortcut);
    }
    btn.addEventListener('click', () => {
      dismissContextMenu();
      item.onClick();
    });
    menu.appendChild(btn);
    buttons.push(btn);
  }

  // Off-screen measure → position inside viewport bounds.
  menu.style.visibility = 'hidden';
  menu.style.left = '0px';
  menu.style.top = '0px';
  document.body.appendChild(menu);
  currentMenu = menu;

  const rect = menu.getBoundingClientRect();
  const margin = 8;
  let left = opts.x;
  let top = opts.y;
  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - rect.height - margin;
  }
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
  menu.style.visibility = '';

  const firstEnabled = buttons.find((b) => !b.disabled);
  firstEnabled?.focus();

  function onKeyDown(e: KeyboardEvent) {
    const enabled = buttons.filter((b) => !b.disabled);
    if (enabled.length === 0) return;
    const active = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      const next = enabled[(active + 1 + enabled.length) % enabled.length]!;
      next.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      const next = enabled[(active - 1 + enabled.length) % enabled.length]!;
      next.focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      enabled[0]!.focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      enabled[enabled.length - 1]!.focus();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      dismissContextMenu();
      e.preventDefault();
    } else if (e.key === 'Tab') {
      // Don't let Tab leak out of the menu.
      dismissContextMenu();
    }
  }

  function onOutside(e: Event) {
    if (!menu.contains(e.target as Node)) {
      dismissContextMenu();
    }
  }

  function onScroll() {
    dismissContextMenu();
  }

  // Capture-phase so the dismissal wins before canvas tools call
  // preventDefault() on their own pointerdown and suppress the compat
  // mousedown event.
  const captureArgs = { capture: true } as const;

  menu.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onOutside, captureArgs);
  document.addEventListener('mousedown', onOutside, captureArgs);
  document.addEventListener('contextmenu', onOutside, captureArgs);
  window.addEventListener('scroll', onScroll, true);

  currentCleanup = () => {
    menu.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onOutside, captureArgs);
    document.removeEventListener('mousedown', onOutside, captureArgs);
    document.removeEventListener('contextmenu', onOutside, captureArgs);
    window.removeEventListener('scroll', onScroll, true);
  };
}
