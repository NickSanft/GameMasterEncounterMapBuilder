import type { ViewMode } from '../state/types.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface HelpOverlayHandle {
  open(): void;
  close(): void;
  toggle(): void;
}

interface HelpEntry {
  name: string;
  desc: string;
}

interface HelpSection {
  title: string;
  intro?: string;
  entries: HelpEntry[];
}

const GM_SECTIONS: HelpSection[] = [
  {
    title: 'Tools (left side)',
    intro: 'Pick a tool, then interact with the map. Hover a tool to see its keyboard shortcut.',
    entries: [
      { name: 'Select', desc: 'Click a token to select it. Shift+click toggles a token in/out of the selection. Drag an empty area to rubber-band-select. Drag a selected token (or group) to move them together. Works on tokens, annotations, and AoE templates.' },
      { name: 'Token', desc: 'Click any grid cell to drop a new token. Alt+click stamps a copy of the most recently placed token so you can fill a room quickly.' },
      { name: 'Reveal', desc: 'Drag across cells to uncover them to the Spectator. The GM always sees the whole map (just dimmed over hidden areas).' },
      { name: 'Hide', desc: 'Drag across cells to re-hide them under fog of war.' },
      { name: 'Map', desc: 'Drag the background image to reposition it under the grid. Scroll wheel scales it up or down so the art lines up with your chosen cell size.' },
      { name: 'Note', desc: 'Click anywhere on the map to drop a text annotation (loot, traps, callouts). Right-click a note to make it GM-only or share it with the Spectator.' },
      { name: 'Ruler', desc: 'Drag between two points to measure distance in grid squares. Release to clear. A side panel lets you pick 5 / 30 / 60 / 90 / 120 ft presets (shortcut keys 1–5) that snap the endpoint to that reach; 0 goes back to freeform.' },
      { name: 'AoE', desc: 'Drag to place a spell or effect template — sphere, cone, line, or cube. Choose the shape and color from the panel that appears when the tool is active.' },
      { name: 'Draw', desc: 'Freehand ink tool (shortcut K). Pick a color, width, and Shared/GM-only visibility from the side panel. Right-click a stroke to delete it or toggle visibility. "Clear Drawings" in the session menu erases all strokes.' },
      { name: 'Undo / Redo', desc: 'Step backward or forward through your last actions. Also Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.' },
    ],
  },
  {
    title: 'Session menu (left column)',
    entries: [
      { name: 'Upload Map', desc: 'Pick an image file from your computer to use as the battle map background.' },
      { name: 'Preset Maps', desc: 'Choose from a built-in gallery of ready-made backgrounds (tavern, dungeon, forest, etc.).' },
      { name: 'Scenes…', desc: 'Manage multiple saved encounters in one session. Each scene has its own map, tokens, fog, annotations, drawings, AoE templates, and initiative. Switching scenes saves the outgoing one and loads the incoming one; undo history is per-scene. Click the "Scene: X" indicator near the top-left badge to jump back here.' },
      { name: 'Token Library', desc: 'Save individual tokens (name, color, image, border) for reuse across sessions. Click a saved token to drop it at the center of your current view.' },
      { name: 'Template Library', desc: 'Save a group of selected tokens as a named template, preserving their relative positions. Drop the whole pack with one click.' },
      { name: 'Initiative', desc: 'Open the combat initiative tracker. Add entries, link them to tokens on the map, and cycle through turns. The active combatant glows on the canvas.' },
      { name: 'Export', desc: 'Download the current session (map, tokens, fog, annotations, AoE, initiative) as a JSON file so you can share or back it up.' },
      { name: 'Export Image…', desc: 'Render the scene to a PNG for handouts, VTT tiles, or printing. Pick Whole map or Visible area, GM fog or Spectator fog, and a 1×/2×/4× resolution scale. Filename is the one stem — the app adds .png.' },
      { name: 'Import', desc: 'Load a previously exported JSON file. A dialog lets you pick which slices (Background / Tokens / Fog / Annotations / AoE / Initiative / Drawings / Grid) to merge into the current scene. Unchecked slices keep your current data.' },
      { name: 'Notes', desc: 'Toggle a plain-text scratchpad you can use for DM notes, stat blocks, or scratch math during play.' },
      { name: 'Clear Drawings', desc: 'Erase every freehand stroke on the map at once (undoable).' },
      { name: 'Shortcuts', desc: 'Show all keyboard shortcuts (same overlay as pressing ?).' },
      { name: 'Settings', desc: 'Grid dimensions, theme (dark/light), label size, fog color, camera behavior, accessibility options, and diagnostics.' },
      { name: 'New Session', desc: 'Clear everything (tokens, fog, background, annotations) and start from a blank grid. Prompts for confirmation.' },
    ],
  },
  {
    title: 'Initiative bar (top center)',
    intro: 'Visible once you start initiative from the tracker.',
    entries: [
      { name: 'Round counter', desc: 'Shows the current round number.' },
      { name: 'Active name', desc: 'Click to jump to the initiative tracker for quick edits.' },
      { name: '‹ / ›', desc: 'Advance or retreat the active turn. The current token gets a gold ring on the canvas.' },
    ],
  },
  {
    title: 'Zoom controls (bottom right)',
    entries: [
      { name: '+ / −', desc: 'Zoom in or out around the center of the view.' },
      { name: 'Fit', desc: 'Zoom and pan to fit all placed content (map + tokens) on screen. Also F.' },
      { name: 'Reset', desc: 'Return to the default camera (origin + 1× zoom). Also 0.' },
      { name: 'Mini-map', desc: 'Optional thumbnail above the zoom controls (Settings → Grid → Show mini-map). Shows the whole map + your viewport as a yellow rectangle. Click anywhere inside to recenter the main camera there.' },
    ],
  },
  {
    title: 'Canvas interactions',
    entries: [
      { name: 'Right-click', desc: 'Context menu — place a token, paste, ping, reveal/hide 5×5, fit, damage/heal, or act on what you clicked (token / annotation / AoE).' },
      { name: 'Space+drag / middle-mouse', desc: 'Pan the camera without switching tools.' },
      { name: 'Scroll wheel', desc: 'Zoom toward the cursor.' },
      { name: 'Arrow keys / WASD', desc: 'Nudge the selected tokens one cell at a time (+Shift = 5 cells).' },
      { name: 'E', desc: 'Open the token editor for the first selected token.' },
      { name: ', / .', desc: 'Rotate the selection 45° counter-clockwise / clockwise. Add Shift for 90° steps.' },
      { name: 'Alt+click stacked cell', desc: 'When two or more tokens share a cell, Alt+click cycles selection down through the stack one at a time. Right-click the stack for a full list of members.' },
      { name: 'Drag a token', desc: 'A dashed yellow line + distance pill show where you started and how far you\u2019ve moved. Unit (squares/feet) and diagonal rule are configurable in Settings → Appearance → Distance.' },
      { name: 'Dice roller (🎲)', desc: 'Bottom-left button opens a dice panel. Quick-pick d4–d100 + custom expressions like 1d20+5, 4d6kh3, 2d20kh1 (advantage). Results are shared with the Spectator automatically.' },
    ],
  },
  {
    title: 'Facing & rotation',
    intro: 'Tokens track a facing angle (0° = north). A small notch appears on rotated tokens.',
    entries: [
      { name: 'Rotation field', desc: 'In the token editor, type a degree value (0–359) or use ↺ 45° / ↻ 45° / ↺ 90° / ↻ 90° quick-snap buttons.' },
      { name: 'N button', desc: 'Reset the token to face North (0°).' },
      { name: 'Compass readout', desc: 'Shows the current heading as N, NE, E, SE, S, SW, W, or NW.' },
      { name: ', / .', desc: 'On the canvas, rotate the selection 45° CCW / CW. Shift+,/Shift+. steps by 90°. Hold down the key to rotate quickly.' },
    ],
  },
  {
    title: 'Accessibility',
    intro: 'The app is designed to be usable end-to-end from a keyboard + screen reader.',
    entries: [
      { name: 'Skip to battle map', desc: 'Press Tab once from anywhere on the page — a "Skip to battle map" link pops to the top-left. Enter jumps focus directly to the canvas, skipping the session menu + toolbar.' },
      { name: 'Focus ring', desc: 'Every interactive control has a visible red outline when keyboard-focused, including the canvas itself. Tab traversal follows DOM order; focus-trap keeps Tab inside any open modal.' },
      { name: 'Live-region narration', desc: 'Tool switches, token placement / deletion, damage & healing, scene switches, dice rolls, and import/export outcomes are narrated through a polite aria-live region so screen-reader users hear what changed. Warnings like "another GM tab is open" use assertive priority.' },
      { name: 'Restoring focus', desc: 'Closing a modal, context menu, or overlay always returns focus to the element that opened it — so Escape never strands you on <body>.' },
    ],
  },
  {
    title: 'Installable + offline (PWA)',
    intro: 'The app is a Progressive Web App — install it to your home screen, run it offline between sessions.',
    entries: [
      { name: 'Install', desc: 'Your browser should surface an "Install" prompt (Chrome address bar, Edge menu, iOS Safari → Share → Add to Home Screen). Once installed, the app runs in its own window with no URL bar and a matching dark theme-color.' },
      { name: 'Offline boot', desc: 'After the first successful visit, a service worker caches the app shell + all hashed JS/CSS bundles. Subsequent launches work with zero network — IndexedDB still holds your scenes, tokens, and drawings locally.' },
      { name: 'Update prompt', desc: 'When a new version deploys, an "A new version is available" banner appears at the top of the page with a Reload button. Click it to adopt the new SW immediately; the page reloads once into the updated bundle.' },
      { name: 'App shortcuts', desc: 'Installed app launchers expose two shortcuts: "Open GM View" and "Open Spectator View" — useful for opening the players\u2019 display on a second monitor without visiting the landing page.' },
    ],
  },
  {
    title: 'Mobile / touch',
    intro: 'The app works on phones and tablets — every tool is reachable, gestures map naturally.',
    entries: [
      { name: 'One finger', desc: 'Drives whatever tool is active: tap to place / select, drag to move tokens, drag to paint fog, etc. Tapping moves focus to the canvas and plays its aria-label through your screen reader.' },
      { name: 'Two fingers (pinch)', desc: 'Zoom in/out around the midpoint between your fingers. Moving both fingers together pans the camera without changing zoom. While you\u2019re pinching, the active tool\u2019s single-finger state machine pauses so you don\u2019t accidentally drop tokens or draw strokes.' },
      { name: 'Toolbar scrolls', desc: 'On narrow viewports the tool strip lays out horizontally and scrolls — every tool is always reachable, even on a phone.' },
      { name: 'Bigger hit targets', desc: 'On touch-only devices (coarse pointer, no hover) every button bumps up to at least 44px tall so finger taps land reliably.' },
    ],
  },
  {
    title: 'HP & conditions',
    intro: 'Optional per-token tracking, visible to the Spectator when set to "Shared" visibility.',
    entries: [
      { name: 'Track HP', desc: 'Toggle in the token editor. Once enabled, the editor exposes Current / Max fields and a Shared/GM-only visibility toggle.' },
      { name: 'HP bar', desc: 'A small color-coded bar (green → yellow → orange → red) appears under the token with "current / max" text. GM-only HP is tagged "(GM)" on the GM canvas.' },
      { name: 'Conditions', desc: 'Pick from the standard D&D 5e set (Blinded, Charmed, Poisoned, Stunned, etc.) in the token editor. Small colored dots appear above the token.' },
      { name: 'Damage / Heal…', desc: 'Right-click a token (or a selection) → "Damage / Heal…" opens a dialog. Positive = damage, negative = healing. Apply with Enter. Applies to every HP-tracked token in the selection at once.' },
    ],
  },
];

const SPECTATOR_SECTIONS: HelpSection[] = [
  {
    title: 'Tools (left side)',
    entries: [
      { name: 'Ruler', desc: 'Drag between two points to measure distance in grid squares. Release to clear. 1–5 snap the endpoint to 5/30/60/90/120 ft preset reaches; 0 = freeform.' },
    ],
  },
  {
    title: 'Session menu (left column)',
    entries: [
      { name: 'Shortcuts', desc: 'Show all keyboard shortcuts (same overlay as pressing ?).' },
      { name: 'Settings', desc: 'Theme, label size, camera behavior, accessibility, diagnostics. Turn on "Follow GM\u2019s camera" to mirror what the GM is looking at.' },
    ],
  },
  {
    title: 'Initiative bar (top center)',
    intro: 'Read-only mirror of the GM\u2019s initiative tracker. Updates automatically.',
    entries: [
      { name: 'Round counter + active name', desc: 'Shows whose turn it is and which round of combat you\u2019re on.' },
    ],
  },
  {
    title: 'Zoom controls (bottom right)',
    entries: [
      { name: '+ / −', desc: 'Zoom in or out.' },
      { name: 'Fit', desc: 'Fit the revealed map on screen. Also F.' },
      { name: 'Reset', desc: 'Back to the default view. Also 0.' },
    ],
  },
  {
    title: 'Canvas interactions',
    entries: [
      { name: 'Space+drag / middle-mouse', desc: 'Pan the camera.' },
      { name: 'Scroll wheel', desc: 'Zoom toward the cursor.' },
      { name: 'Fog of war', desc: 'Only cells the GM has revealed are fully visible. Tokens under hidden cells don\u2019t render here.' },
      { name: 'Dice roller (🎲)', desc: 'Bottom-left button opens a dice panel. Quick-pick d4–d100 + custom expressions like 1d20+5, 4d6kh3 (stat rolling), 2d20kh1 (advantage). Rolls are shared with the GM automatically.' },
    ],
  },
  {
    title: 'Accessibility',
    intro: 'Keyboard + screen reader parity with the GM view.',
    entries: [
      { name: 'Skip to battle map', desc: 'Tab once from anywhere on the page to reveal a "Skip to battle map" link; Enter focuses the canvas directly.' },
      { name: 'Live-region narration', desc: 'Ruler on/off, your dice rolls, and rolls the GM makes are narrated through a polite aria-live region so screen-reader users hear what changed.' },
      { name: 'Focus management', desc: 'Every modal traps Tab within itself while open and returns focus to the trigger when closed. All interactive controls (including the canvas) show a visible red focus outline.' },
    ],
  },
  {
    title: 'Mobile / touch',
    intro: 'Read-only views work great on phones + tablets too.',
    entries: [
      { name: 'Pinch to zoom', desc: 'Two-finger pinch zooms around the midpoint between your fingers; two-finger drag pans.' },
      { name: 'One-finger pan', desc: 'With the Ruler tool off, a one-finger drag on the canvas pans when you hold space (on physical keyboards) — on touch, use two fingers to pan instead.' },
      { name: 'Responsive layout', desc: 'The Spectator menu stacks into a scrollable strip on narrow viewports.' },
    ],
  },
];

export function mountHelpOverlay(viewMode: ViewMode): HelpOverlayHandle {
  const sections = viewMode === 'gm' ? GM_SECTIONS : SPECTATOR_SECTIONS;

  // Floating "?" button (bottom-left corner).
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-button';
  button.setAttribute('aria-label', 'Open quick tutorial');
  button.title = 'Quick tutorial — what does each button do?';
  button.textContent = '?';
  document.body.appendChild(button);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal help-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Quick tutorial');

  const viewLabel = viewMode === 'gm' ? 'GM View' : 'Spectator View';
  const intro = viewMode === 'gm'
    ? 'A rundown of every button and interaction on this screen. Press Escape or click outside to close.'
    : 'A rundown of every control on this screen. Press Escape or click outside to close.';

  const body = sections
    .map(
      (section) => `
        <section class="help-section">
          <h3>${escape(section.title)}</h3>
          ${section.intro ? `<p class="help-section-intro">${escape(section.intro)}</p>` : ''}
          <dl>
            ${section.entries
              .map(
                (e) => `
                  <div>
                    <dt>${escape(e.name)}</dt>
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
      <h2>Quick tutorial — ${escape(viewLabel)}</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body help-body">
      <p class="help-intro">${escape(intro)}</p>
      ${body}
    </div>
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

  function toggle() {
    if (backdrop.hidden) open();
    else close();
  }

  button.addEventListener('click', () => {
    button.blur();
    toggle();
  });

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

  return { open, close, toggle };
}

function escape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
