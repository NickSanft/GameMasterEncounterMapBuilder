export interface ZoomControlsActions {
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onReset(): void;
}

export function mountZoomControls(
  container: HTMLElement,
  actions: ZoomControlsActions,
): void {
  const panel = document.createElement('div');
  panel.className = 'zoom-controls';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Camera controls');

  const entries: Array<{ label: string; aria: string; title: string; onClick: () => void }> = [
    { label: '+', aria: 'Zoom in', title: 'Zoom in (+ or =)', onClick: actions.onZoomIn },
    { label: '−', aria: 'Zoom out', title: 'Zoom out (−)', onClick: actions.onZoomOut },
    { label: 'Fit', aria: 'Fit content to screen', title: 'Fit content to screen (F)', onClick: actions.onFit },
    { label: 'Reset', aria: 'Reset camera', title: 'Reset camera (0)', onClick: actions.onReset },
  ];

  for (const e of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = e.label;
    btn.title = e.title;
    btn.setAttribute('aria-label', e.aria);
    btn.addEventListener('click', () => {
      e.onClick();
      btn.blur();
    });
    panel.appendChild(btn);
  }

  container.appendChild(panel);
}
