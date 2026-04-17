export interface SessionMenuActions {
  onNewSession(): void;
}

export function mountSessionMenu(
  container: HTMLElement,
  actions: SessionMenuActions,
): void {
  const menu = document.createElement('div');
  menu.className = 'session-menu';

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.textContent = 'New Session';
  newBtn.title = 'Clear all tokens and reset the map';
  newBtn.addEventListener('click', () => {
    const ok = window.confirm(
      'Start a new session? All current tokens will be cleared.',
    );
    newBtn.blur();
    if (ok) actions.onNewSession();
  });
  menu.appendChild(newBtn);

  container.appendChild(menu);
}
