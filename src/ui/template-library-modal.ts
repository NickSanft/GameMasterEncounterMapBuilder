import {
  listLibraryTemplates,
  deleteLibraryTemplate,
  type TemplateCatalogEntry,
} from '../state/template-catalog.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface TemplateLibraryModalHandle {
  open(): void;
  close(): void;
}

export interface TemplateLibraryModalOptions {
  onPlace(entry: TemplateCatalogEntry): void | Promise<void>;
}

export function mountTemplateLibraryModal(
  opts: TemplateLibraryModalOptions,
): TemplateLibraryModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal library-modal template-library-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Template Library');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Template Library</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="library-hint">Click a template to drop its tokens at the center of your view. Save a new template by selecting multiple tokens and choosing "Save as template…" from the right-click menu.</p>
      <div class="library-grid" data-field="grid"></div>
      <div class="library-empty" data-field="empty" hidden>
        <p>No templates saved yet.</p>
        <p class="settings-hint">Select two or more tokens, right-click, and choose "Save as template…".</p>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const grid = modal.querySelector<HTMLDivElement>('[data-field="grid"]')!;
  const empty = modal.querySelector<HTMLDivElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;

  async function refresh() {
    const entries = await listLibraryTemplates();
    grid.innerHTML = '';
    if (entries.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const entry of entries) {
      grid.appendChild(renderCard(entry));
    }
  }

  function renderCard(entry: TemplateCatalogEntry): HTMLElement {
    const card = document.createElement('div');
    card.className = 'library-card';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', entry.name);

    card.innerHTML = `
      <button type="button" class="library-card-main" data-action="place">
        <div class="library-thumb template-thumb" data-field="thumb"></div>
        <div class="library-meta">
          <div class="library-name">${escapeHtml(entry.name)}</div>
          <div class="library-sub">${entry.tokens.length} token${entry.tokens.length === 1 ? '' : 's'}</div>
        </div>
      </button>
      <button type="button" class="library-delete" data-action="delete" aria-label="Delete ${escapeHtml(entry.name)} template" title="Delete template">×</button>
    `;

    const thumb = card.querySelector<HTMLDivElement>('[data-field="thumb"]')!;
    drawTemplateThumb(thumb, entry);

    card
      .querySelector<HTMLButtonElement>('[data-action="place"]')!
      .addEventListener('click', async () => {
        close();
        await opts.onPlace(entry);
      });

    card
      .querySelector<HTMLButtonElement>('[data-action="delete"]')!
      .addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = window.confirm(`Delete template "${entry.name}"?`);
        if (!ok) return;
        await deleteLibraryTemplate(entry.id);
        await refresh();
      });

    return card;
  }

  function open() {
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    void refresh().then(() => {
      const first = modal.querySelector<HTMLButtonElement>('[data-action="place"]');
      (first ?? closeBtn).focus();
    });
  }

  function close() {
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

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

  return { open, close };
}

/** Draw a tiny SVG preview of the token group layout. */
function drawTemplateThumb(host: HTMLElement, entry: TemplateCatalogEntry): void {
  if (entry.tokens.length === 0) {
    host.textContent = '—';
    return;
  }
  const maxDx = Math.max(...entry.tokens.map((t) => t.dx + t.size));
  const maxDy = Math.max(...entry.tokens.map((t) => t.dy + t.size));
  const span = Math.max(1, maxDx, maxDy);
  const SIZE = 80;
  const cell = SIZE / (span + 1);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('width', String(SIZE));
  svg.setAttribute('height', String(SIZE));

  // Background grid
  for (let i = 0; i <= span + 1; i++) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('x2', String(SIZE));
    line.setAttribute('y1', String(i * cell));
    line.setAttribute('y2', String(i * cell));
    line.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    svg.appendChild(line);
    const v = document.createElementNS(svgNS, 'line');
    v.setAttribute('y1', '0');
    v.setAttribute('y2', String(SIZE));
    v.setAttribute('x1', String(i * cell));
    v.setAttribute('x2', String(i * cell));
    v.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    svg.appendChild(v);
  }

  // Tokens
  const offsetX = (SIZE - (maxDx + 1) * cell) / 2;
  const offsetY = (SIZE - (maxDy + 1) * cell) / 2;
  for (const t of entry.tokens) {
    const r = document.createElementNS(svgNS, 'rect');
    r.setAttribute('x', String(offsetX + t.dx * cell + 1));
    r.setAttribute('y', String(offsetY + t.dy * cell + 1));
    r.setAttribute('width', String(Math.max(1, t.size * cell - 2)));
    r.setAttribute('height', String(Math.max(1, t.size * cell - 2)));
    r.setAttribute('rx', String(cell * 0.25));
    r.setAttribute('fill', t.color);
    if (t.borderColor) {
      r.setAttribute('stroke', t.borderColor);
      r.setAttribute('stroke-width', '1.5');
    }
    svg.appendChild(r);
  }

  host.innerHTML = '';
  host.appendChild(svg);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}
