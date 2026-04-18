import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';
import type { ViewMode } from '../state/types.js';

export interface ShortcutOverlayHandle {
  open(): void;
  close(): void;
  toggle(): void;
}

interface ShortcutEntry {
  keys: string;
  desc: string;
}

interface ShortcutSection {
  title: string;
  entries: ShortcutEntry[];
}

const GM_SECTIONS: ShortcutSection[] = [
  {
    title: 'Tools',
    entries: [
      { keys: 'S', desc: 'Select tool' },
      { keys: 'T', desc: 'Token tool (Alt+click to stamp last-placed)' },
      { keys: 'R', desc: 'Reveal fog' },
      { keys: 'H', desc: 'Hide fog' },
      { keys: 'M', desc: 'Map positioning' },
      { keys: 'N', desc: 'Note — drop a map annotation' },
    ],
  },
  {
    title: 'Selection & editing',
    entries: [
      { keys: 'Click token', desc: 'Select one token' },
      { keys: 'Shift+click token', desc: 'Toggle token in selection' },
      { keys: 'Drag empty', desc: 'Rubber-band select' },
      { keys: 'Shift+drag empty', desc: 'Add to selection' },
      { keys: 'Right-click', desc: 'Contextual menu' },
      { keys: 'Arrow / WASD', desc: 'Move selection by 1 cell (+Shift = 5)' },
      { keys: 'Delete / Backspace', desc: 'Delete selection' },
      { keys: 'Ctrl/Cmd+C / V / X', desc: 'Copy, paste, cut' },
      { keys: 'Ctrl/Cmd+D', desc: 'Duplicate in place' },
      { keys: 'Ctrl/Cmd+Z', desc: 'Undo' },
      { keys: 'Ctrl/Cmd+Shift+Z or Ctrl+Y', desc: 'Redo' },
    ],
  },
  {
    title: 'Camera',
    entries: [
      { keys: 'Space+drag / middle-mouse', desc: 'Pan camera' },
      { keys: 'Wheel', desc: 'Zoom to cursor' },
      { keys: '+ / =', desc: 'Zoom in' },
      { keys: '− / _', desc: 'Zoom out' },
      { keys: 'F', desc: 'Fit content to screen' },
      { keys: '0', desc: 'Reset camera' },
    ],
  },
  {
    title: 'Other',
    entries: [
      { keys: '?', desc: 'Open this help overlay' },
      { keys: 'Escape', desc: 'Close modal / menu / editor' },
      { keys: 'Right-click empty', desc: 'Reveal/Hide 5×5, Place/Paste, Fit, Reset' },
    ],
  },
];

const SPECTATOR_SECTIONS: ShortcutSection[] = [
  {
    title: 'Camera',
    entries: [
      { keys: 'Space+drag / middle-mouse', desc: 'Pan camera' },
      { keys: 'Wheel', desc: 'Zoom to cursor' },
      { keys: '+ / =', desc: 'Zoom in' },
      { keys: '− / _', desc: 'Zoom out' },
      { keys: 'F', desc: 'Fit content to screen' },
      { keys: '0', desc: 'Reset camera' },
    ],
  },
  {
    title: 'Other',
    entries: [
      { keys: '?', desc: 'Open this help overlay' },
      { keys: 'Escape', desc: 'Close modal' },
    ],
  },
];

export function mountShortcutOverlay(viewMode: ViewMode): ShortcutOverlayHandle {
  const sections = viewMode === 'gm' ? GM_SECTIONS : SPECTATOR_SECTIONS;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal shortcut-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Keyboard shortcuts');

  const body = sections
    .map(
      (section) => `
        <section class="shortcut-section">
          <h3>${escape(section.title)}</h3>
          <dl>
            ${section.entries
              .map(
                (e) => `
                  <div>
                    <dt><kbd>${escape(e.keys)}</kbd></dt>
                    <dd>${escape(e.desc)}</dd>
                  </div>`,
              )
              .join('')}
          </dl>
        </section>`,
    )
    .join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Keyboard shortcuts</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body shortcut-body">${body}</div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  let triggerFocus: HTMLElement | null = null;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  function open() {
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    window.setTimeout(() => closeBtn.focus(), 0);
  }

  function close() {
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  return {
    open,
    close,
    toggle() {
      if (backdrop.hidden) open();
      else close();
    },
  };
}

function escape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
