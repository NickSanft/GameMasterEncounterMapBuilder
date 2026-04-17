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

  const entries: Array<{ label: string; title: string; onClick: () => void }> = [
    { label: '+', title: 'Zoom in (+ or =)', onClick: actions.onZoomIn },
    { label: '−', title: 'Zoom out (−)', onClick: actions.onZoomOut },
    { label: 'Fit', title: 'Fit content to screen (F)', onClick: actions.onFit },
    { label: 'Reset', title: 'Reset camera (0)', onClick: actions.onReset },
  ];

  for (const e of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = e.label;
    btn.title = e.title;
    btn.addEventListener('click', () => {
      e.onClick();
      btn.blur();
    });
    panel.appendChild(btn);
  }

  container.appendChild(panel);
}
