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
  menu.appendChild(clearDrawingsBtn);
  menu.appendChild(shortcutsBtn);
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
