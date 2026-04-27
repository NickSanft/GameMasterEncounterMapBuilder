/**
 * Phase 120 — GM-side panel for player-proposed annotations.
 *
 * Sliding right-pinned panel (mirrors chat / combat-log layout). Lists
 * each pending suggestion with sender name, proposed text, world
 * coordinates, and two actions:
 *   - **Approve** — adds the suggestion as a real `Annotation` patch
 *     (visibility: 'shared'); the proposal is removed from the queue.
 *   - **Dismiss** — drops the proposal silently. Nothing crosses the
 *     wire (the Spectator's local "I sent it" cache is independent).
 *
 * Live updates via `proposals.subscribe`. The panel auto-opens on
 * arrival (configurable via `autoOpen`) so the GM doesn't miss new
 * suggestions; if the user closed it deliberately they can re-toggle
 * via the command palette.
 */

import type {
  AnnotationProposal,
  AnnotationProposals,
} from '../state/annotation-proposals.js';

export interface AnnotationProposalsPanelOptions {
  proposals: AnnotationProposals;
  onApprove(p: AnnotationProposal): void;
  onDismiss(p: AnnotationProposal): void;
}

export interface AnnotationProposalsPanelHandle {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function mountAnnotationProposalsPanel(
  opts: AnnotationProposalsPanelOptions,
): AnnotationProposalsPanelHandle {
  const { proposals, onApprove, onDismiss } = opts;

  const panel = document.createElement('aside');
  panel.className = 'annotation-proposals-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Player annotation suggestions');
  panel.hidden = true;

  panel.innerHTML = `
    <header class="annotation-proposals-header">
      <h3>Player Suggestions</h3>
      <div class="annotation-proposals-actions">
        <button type="button" class="annotation-proposals-clear" data-action="clear"
          title="Dismiss every pending suggestion">Dismiss all</button>
        <button type="button" class="annotation-proposals-close" aria-label="Close suggestions panel">×</button>
      </div>
    </header>
    <p class="annotation-proposals-empty" data-field="empty">
      No pending player suggestions. When a player suggests an annotation, it will appear here for you to approve or dismiss.
    </p>
    <ol class="annotation-proposals-list" data-field="list" aria-live="polite" aria-relevant="additions"></ol>
  `;
  document.body.appendChild(panel);

  const list = panel.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = panel.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('.annotation-proposals-close')!;
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-action="clear"]')!;

  let isOpen = false;

  function setOpen(next: boolean) {
    isOpen = next;
    panel.hidden = !next;
    if (next) render();
  }

  function render() {
    const entries = proposals.entries();
    if (entries.length === 0) {
      list.replaceChildren();
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.replaceChildren(...entries.map(renderRow));
  }

  function renderRow(p: AnnotationProposal): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'annotation-proposal';
    li.dataset.proposalId = p.id;

    const meta = document.createElement('div');
    meta.className = 'annotation-proposal-meta';

    const swatch = document.createElement('span');
    swatch.className = 'annotation-proposal-swatch';
    swatch.style.background = p.color;
    swatch.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'annotation-proposal-name';
    name.textContent = p.senderName || 'Player';

    const coords = document.createElement('span');
    coords.className = 'annotation-proposal-coords';
    coords.textContent = `(${Math.round(p.x)}, ${Math.round(p.y)})`;

    meta.appendChild(swatch);
    meta.appendChild(name);
    meta.appendChild(coords);

    const body = document.createElement('div');
    body.className = 'annotation-proposal-body';
    body.textContent = p.text || '(no text)';

    const buttons = document.createElement('div');
    buttons.className = 'annotation-proposal-buttons';

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'annotation-proposal-approve';
    approveBtn.textContent = 'Approve';
    approveBtn.title = 'Add this suggestion to the shared map as a real annotation';
    approveBtn.addEventListener('click', () => onApprove(p));

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'annotation-proposal-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.title = 'Drop this suggestion (does not notify the player)';
    dismissBtn.addEventListener('click', () => onDismiss(p));

    buttons.appendChild(approveBtn);
    buttons.appendChild(dismissBtn);

    li.appendChild(meta);
    li.appendChild(body);
    li.appendChild(buttons);
    return li;
  }

  proposals.subscribe(() => {
    if (isOpen) render();
  });

  closeBtn.addEventListener('click', () => setOpen(false));
  clearBtn.addEventListener('click', () => proposals.clear());

  return {
    toggle: () => setOpen(!isOpen),
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => isOpen,
    destroy: () => panel.remove(),
  };
}
