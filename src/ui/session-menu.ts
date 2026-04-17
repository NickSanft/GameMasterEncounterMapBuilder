export interface SessionMenuActions {
  onNewSession(): void;
  onUploadBackground(file: File): void | Promise<void>;
}

export function mountSessionMenu(
  container: HTMLElement,
  actions: SessionMenuActions,
): void {
  const menu = document.createElement('div');
  menu.className = 'session-menu';

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.textContent = 'Upload Map';
  uploadBtn.title = 'Upload a background image for this map';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
    uploadBtn.blur();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) await actions.onUploadBackground(file);
  });

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.textContent = 'New Session';
  newBtn.title = 'Clear all tokens and reset the map';
  newBtn.addEventListener('click', () => {
    const ok = window.confirm(
      'Start a new session? All current tokens, fog, and background will be cleared.',
    );
    newBtn.blur();
    if (ok) actions.onNewSession();
  });

  menu.appendChild(uploadBtn);
  menu.appendChild(newBtn);
  menu.appendChild(fileInput);
  container.appendChild(menu);
}
