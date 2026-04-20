export interface SceneIndicatorHandle {
  setName(name: string | null, total: number): void;
  /** Destroy the indicator. */
  destroy(): void;
}

export interface SceneIndicatorOptions {
  onClick(): void;
}

/**
 * Small top-left badge next to the GM-view label that shows the
 * currently-active scene name + a "1/3" scene-count pill. Clicking it
 * opens the Scenes modal.
 */
export function mountSceneIndicator(
  opts: SceneIndicatorOptions,
): SceneIndicatorHandle {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scene-indicator';
  btn.setAttribute('aria-label', 'Open scenes');
  btn.title = 'Open scenes (switch / rename / duplicate / delete)';
  btn.innerHTML = `
    <span class="scene-indicator-label" data-field="name">Scene: (loading…)</span>
    <span class="scene-indicator-count" data-field="count" aria-hidden="true"></span>
  `;
  btn.addEventListener('click', () => {
    btn.blur();
    opts.onClick();
  });
  document.body.appendChild(btn);

  const nameEl = btn.querySelector<HTMLSpanElement>('[data-field="name"]')!;
  const countEl = btn.querySelector<HTMLSpanElement>('[data-field="count"]')!;

  function setName(name: string | null, total: number): void {
    if (name === null) {
      nameEl.textContent = 'Scene: —';
    } else {
      nameEl.textContent = `Scene: ${name}`;
    }
    if (total > 1) {
      countEl.textContent = `${total}`;
      countEl.hidden = false;
    } else {
      countEl.textContent = '';
      countEl.hidden = true;
    }
  }

  return {
    setName,
    destroy() {
      btn.remove();
    },
  };
}
