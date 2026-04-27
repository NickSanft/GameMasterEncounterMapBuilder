/**
 * Phase 120 — Spectator-side inline prompt for proposing an annotation.
 *
 * UX flow:
 *   1. Spectator activates "Suggest annotation" mode (toolbar button or
 *      `n` keyboard shortcut). Cursor switches to crosshair.
 *   2. Click on the canvas — the inline prompt appears anchored at the
 *      click location with a text input + Send + Cancel buttons.
 *   3. Type text + hit Enter / click Send → host fires `onSubmit(world, text)`,
 *      which broadcasts an `annotation-proposal` SyncMessage.
 *   4. Click Cancel / press Escape → host fires `onCancel()` (mode stays
 *      active so the user can pick a different spot).
 *
 * Pure UI module — no DOM ownership beyond the prompt element. Host
 * mounts once, calls `open(screenX, screenY)` on canvas click, and
 * destroys on unmount.
 */

export interface AnnotationProposalPromptHandle {
  /** Open the prompt anchored at the given screen coordinates. */
  open(screenX: number, screenY: number): void;
  /** Close + clear the prompt without firing onCancel. */
  close(): void;
  /** True while the prompt is mounted + visible. */
  isOpen(): boolean;
  destroy(): void;
}

export interface AnnotationProposalPromptOptions {
  /**
   * Fired when the user hits Send / Enter. `text` is the trimmed
   * non-empty input. Host typically broadcasts the proposal here.
   */
  onSubmit(text: string): void;
  /**
   * Fired when the user hits Cancel / Escape, OR clicks outside the
   * prompt. Host can use this to keep the suggest mode active so the
   * user can pick a different spot.
   */
  onCancel(): void;
}

export function mountAnnotationProposalPrompt(
  opts: AnnotationProposalPromptOptions,
): AnnotationProposalPromptHandle {
  const { onSubmit, onCancel } = opts;

  const prompt = document.createElement('form');
  prompt.className = 'annotation-proposal-prompt';
  prompt.setAttribute('role', 'dialog');
  prompt.setAttribute('aria-label', 'Propose an annotation');
  prompt.hidden = true;
  prompt.innerHTML = `
    <input
      type="text"
      class="annotation-proposal-prompt-input"
      data-field="input"
      placeholder="Describe this spot…"
      maxlength="160"
      autocomplete="off"
      spellcheck="true"
    />
    <button type="submit" class="annotation-proposal-prompt-send" data-field="send">Suggest</button>
    <button type="button" class="annotation-proposal-prompt-cancel" data-field="cancel">Cancel</button>
  `;
  document.body.appendChild(prompt);

  const input = prompt.querySelector<HTMLInputElement>('[data-field="input"]')!;
  const cancelBtn = prompt.querySelector<HTMLButtonElement>('[data-field="cancel"]')!;

  let isOpen = false;

  function close() {
    if (!isOpen) return;
    isOpen = false;
    prompt.hidden = true;
    input.value = '';
  }

  function open(screenX: number, screenY: number) {
    isOpen = true;
    prompt.hidden = false;
    // Position the prompt near the click point; clamp to the viewport
    // so a click near the right / bottom edge doesn't hide the prompt
    // off-screen. Using getBoundingClientRect AFTER showing so the
    // measured size includes padding + borders.
    const rect = prompt.getBoundingClientRect();
    const margin = 8;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    const left = Math.min(Math.max(margin, screenX), maxX);
    const top = Math.min(Math.max(margin, screenY), maxY);
    prompt.style.left = `${left}px`;
    prompt.style.top = `${top}px`;
    input.value = '';
    // Defer focus past the show frame so the input actually receives it.
    window.setTimeout(() => input.focus(), 0);
  }

  prompt.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    onSubmit(text);
    close();
  });

  cancelBtn.addEventListener('click', () => {
    close();
    onCancel();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      onCancel();
    }
  });

  return {
    open,
    close,
    isOpen: () => isOpen,
    destroy: () => prompt.remove(),
  };
}
