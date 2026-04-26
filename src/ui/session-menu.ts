export interface SessionMenuActions {
  onNewSession(): void;
  onUploadBackground(file: File): void | Promise<void>;
  onPresetBackground(): void;
  onExport(): void | Promise<void>;
  onExportImage(): void | Promise<void>;
  onImport(file: File): void | Promise<void>;
  onSettings(): void;
  onToggleNotes(): void;
  onShortcuts(): void;
  onInitiative(): void;
  onTokenLibrary(): void;
  onTemplateLibrary(): void;
  onClearDrawings(): void;
  onScenes(): void;
  /**
   * Phase 61 — replay the onboarding tour. Optional so existing
   * Spectator-side `mountSessionMenu` callers (if any) don't need
   * to wire it; the menu hides the button when the callback is
   * absent.
   */
  onReplayTour?: () => void;
  /**
   * Phase 62 — open the Remote Play (WebRTC) modal. Optional for
   * the same reason as `onReplayTour` — the button is only mounted
   * when the caller wires a handler.
   */
  onRemotePlay?: () => void;
  /**
   * Phase 82 — open the per-Spectator Permissions manager. Optional;
   * GM-only (Spectator entries pass nothing).
   */
  onPermissions?: () => void;
  /**
   * Phase 94 — toggle the combat log side panel. Optional; GM-only.
   */
  onToggleCombatLog?: () => void;
  /**
   * Phase 97 — open the snapshot-history restore modal. Optional;
   * GM-only.
   */
  onOpenSnapshotHistory?: () => void;
}

export function mountSessionMenu(
  container: HTMLElement,
  actions: SessionMenuActions,
): void {
  const menu = document.createElement('div');
  menu.className = 'session-menu';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Session menu');

  const uploadBtn = createButton('Upload Map', 'Upload a background image for this map');
  const bgFileInput = createFileInput('image/*');
  uploadBtn.addEventListener('click', () => {
    bgFileInput.click();
    uploadBtn.blur();
  });
  bgFileInput.addEventListener('change', async () => {
    const file = bgFileInput.files?.[0];
    bgFileInput.value = '';
    if (file) await actions.onUploadBackground(file);
  });

  const presetBtn = createButton('Preset Maps', 'Pick a pre-made background');
  presetBtn.addEventListener('click', () => {
    presetBtn.blur();
    actions.onPresetBackground();
  });

  const exportBtn = createButton('Export', 'Download the session as a JSON file');
  exportBtn.addEventListener('click', async () => {
    exportBtn.blur();
    await actions.onExport();
  });

  const exportImageBtn = createButton(
    'Export Image…',
    'Render the map as a PNG image for handouts, VTT use, or print',
  );
  exportImageBtn.addEventListener('click', async () => {
    exportImageBtn.blur();
    await actions.onExportImage();
  });

  const importBtn = createButton('Import', 'Load a session from a JSON file');
  const jsonInput = createFileInput('application/json,.json');
  importBtn.addEventListener('click', () => {
    jsonInput.click();
    importBtn.blur();
  });
  jsonInput.addEventListener('change', async () => {
    const file = jsonInput.files?.[0];
    jsonInput.value = '';
    if (file) await actions.onImport(file);
  });

  const newBtn = createButton('New Session', 'Clear all tokens, fog, and background');
  newBtn.addEventListener('click', () => {
    const ok = window.confirm(
      'Start a new session? All current tokens, fog, and background will be cleared.',
    );
    newBtn.blur();
    if (ok) actions.onNewSession();
  });

  const settingsBtn = createButton('Settings', 'Open settings panel');
  settingsBtn.addEventListener('click', () => {
    settingsBtn.blur();
    actions.onSettings();
  });

  const notesBtn = createButton('Notes', 'Toggle session notes panel');
  notesBtn.addEventListener('click', () => {
    notesBtn.blur();
    actions.onToggleNotes();
  });

  const initiativeBtn = createButton('Initiative', 'Open the initiative tracker');
  initiativeBtn.addEventListener('click', () => {
    initiativeBtn.blur();
    actions.onInitiative();
  });

  const tokenLibBtn = createButton('Token Library', 'Browse and place saved tokens');
  tokenLibBtn.addEventListener('click', () => {
    tokenLibBtn.blur();
    actions.onTokenLibrary();
  });

  const templateLibBtn = createButton('Template Library', 'Browse and place saved token groups');
  templateLibBtn.addEventListener('click', () => {
    templateLibBtn.blur();
    actions.onTemplateLibrary();
  });

  const shortcutsBtn = createButton('Shortcuts', 'Show keyboard shortcuts (?)');
  shortcutsBtn.addEventListener('click', () => {
    shortcutsBtn.blur();
    actions.onShortcuts();
  });

  const clearDrawingsBtn = createButton(
    'Clear Drawings',
    'Erase every freehand stroke on the map',
  );
  clearDrawingsBtn.addEventListener('click', () => {
    clearDrawingsBtn.blur();
    actions.onClearDrawings();
  });

  const scenesBtn = createButton(
    'Scenes…',
    'Switch between saved scenes, create / duplicate / delete scenes',
  );
  scenesBtn.addEventListener('click', () => {
    scenesBtn.blur();
    actions.onScenes();
  });

  // Phase 61 — "Take the tour" replay entry. Only mounted when the
  // caller wired `onReplayTour` (Spectator entries don't, today).
  const replayTourBtn = actions.onReplayTour
    ? createButton('Take the tour', 'Replay the onboarding walk-through')
    : null;
  if (replayTourBtn && actions.onReplayTour) {
    const handler = actions.onReplayTour;
    replayTourBtn.addEventListener('click', () => {
      replayTourBtn.blur();
      handler();
    });
  }

  // Phase 62 — "Remote play" opens the WebRTC connection modal.
  // Same opt-in pattern as `onReplayTour`: button only mounted when
  // the caller wires a handler.
  const remotePlayBtn = actions.onRemotePlay
    ? createButton(
        'Remote play…',
        'Connect to a peer across the internet via WebRTC (beta)',
      )
    : null;
  if (remotePlayBtn && actions.onRemotePlay) {
    const handler = actions.onRemotePlay;
    remotePlayBtn.addEventListener('click', () => {
      remotePlayBtn.blur();
      handler();
    });
  }

  // Phase 82 — "Permissions" opens the per-Spectator permissions
  // manager. GM-only; Spectator entries don't wire onPermissions.
  const permissionsBtn = actions.onPermissions
    ? createButton(
        'Permissions…',
        'Restrict what specific Spectators can do (pings, dice rolls)',
      )
    : null;
  if (permissionsBtn && actions.onPermissions) {
    const handler = actions.onPermissions;
    permissionsBtn.addEventListener('click', () => {
      permissionsBtn.blur();
      handler();
    });
  }

  // Phase 94 — "Combat Log" opens the side-panel auto-recording every
  // damage / heal, condition change, death-save event, and turn
  // advance. GM-only.
  const combatLogBtn = actions.onToggleCombatLog
    ? createButton(
        'Combat Log',
        'Toggle the auto-recorded combat log (damage, conditions, death saves, turns)',
      )
    : null;
  if (combatLogBtn && actions.onToggleCombatLog) {
    const handler = actions.onToggleCombatLog;
    combatLogBtn.addEventListener('click', () => {
      combatLogBtn.blur();
      handler();
    });
  }

  // Phase 97 — "Snapshots…" opens the rotating per-scene snapshot
  // history. GM-only; up to 8 auto-saved snapshots per scene.
  const snapshotsBtn = actions.onOpenSnapshotHistory
    ? createButton(
        'Snapshots…',
        'Restore from an auto-saved snapshot of this scene',
      )
    : null;
  if (snapshotsBtn && actions.onOpenSnapshotHistory) {
    const handler = actions.onOpenSnapshotHistory;
    snapshotsBtn.addEventListener('click', () => {
      snapshotsBtn.blur();
      handler();
    });
  }

  menu.appendChild(uploadBtn);
  menu.appendChild(presetBtn);
  menu.appendChild(scenesBtn);
  menu.appendChild(tokenLibBtn);
  menu.appendChild(templateLibBtn);
  menu.appendChild(initiativeBtn);
  menu.appendChild(exportBtn);
  menu.appendChild(exportImageBtn);
  menu.appendChild(importBtn);
  menu.appendChild(notesBtn);
  if (combatLogBtn) menu.appendChild(combatLogBtn);
  if (snapshotsBtn) menu.appendChild(snapshotsBtn);
  menu.appendChild(clearDrawingsBtn);
  menu.appendChild(shortcutsBtn);
  if (replayTourBtn) menu.appendChild(replayTourBtn);
  if (remotePlayBtn) menu.appendChild(remotePlayBtn);
  if (permissionsBtn) menu.appendChild(permissionsBtn);
  menu.appendChild(settingsBtn);
  menu.appendChild(newBtn);
  menu.appendChild(bgFileInput);
  menu.appendChild(jsonInput);
  container.appendChild(menu);
}

function createButton(label: string, title: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  return b;
}

function createFileInput(accept: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.hidden = true;
  return input;
}
