/**
 * Phase 119 — player chat side panel.
 *
 * Toggleable text-chat panel pinned to the right edge (mirrors the
 * combat-log panel pattern from Phase 94). The host wires:
 *   - `history` — the in-memory chat log (per-tab session)
 *   - `onSend(text, visibility)` — dispatched when the user hits
 *     Send / Enter; the host stamps an id + senderId + senderName +
 *     senderRole + timestamp, calls `history.add` locally, and
 *     broadcasts a `chat` SyncMessage.
 *   - `viewMode` — 'gm' or 'spectator'. The GM sees a "GM-only"
 *     toggle (private notes); the Spectator sees a "Whisper to GM"
 *     toggle (also `gm-only` on the wire).
 *
 * Pure UI module. No persistence; on tab reload the panel starts
 * empty + sees only messages that arrive after.
 */

import type { ChatHistory, ChatMessage, ChatVisibility } from '../state/chat-history.js';

export interface ChatPanelHandle {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface ChatPanelOptions {
  history: ChatHistory;
  viewMode: 'gm' | 'spectator';
  onSend(text: string, visibility: ChatVisibility): void;
}

export function mountChatPanel(opts: ChatPanelOptions): ChatPanelHandle {
  const { history, viewMode, onSend } = opts;

  const panel = document.createElement('aside');
  panel.className = 'chat-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Chat');
  panel.hidden = true;

  // The visibility toggle copy differs by role: GM "Private" hides
  // from spectators; Spectator "Whisper to GM" hides from other
  // spectators. The wire-format is `gm-only` in both cases.
  const toggleLabel = viewMode === 'gm' ? 'Private (GM only)' : 'Whisper to GM';

  panel.innerHTML = `
    <header class="chat-header">
      <h3>Chat</h3>
      <div class="chat-actions">
        <button type="button" class="chat-clear" data-action="clear"
          title="Clear the local chat history (does not delete other tabs' copies)">Clear</button>
        <button type="button" class="chat-close" aria-label="Close chat panel">×</button>
      </div>
    </header>
    <p class="chat-empty" data-field="empty">
      Chat is empty. Type below to send a message — visible to everyone by default. Tick the box to keep it private to the GM only.
    </p>
    <ol class="chat-list" data-field="list" aria-live="polite" aria-relevant="additions"></ol>
    <form class="chat-input-row" data-field="form">
      <label class="chat-private">
        <input type="checkbox" data-field="private" />
        <span>${escapeText(toggleLabel)}</span>
      </label>
      <input
        type="text"
        class="chat-input"
        data-field="input"
        autocomplete="off"
        spellcheck="true"
        placeholder="Type a message…"
        maxlength="500"
      />
      <button type="submit" class="chat-send" data-field="send">Send</button>
    </form>
  `;
  document.body.appendChild(panel);

  const list = panel.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = panel.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('.chat-close')!;
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-action="clear"]')!;
  const form = panel.querySelector<HTMLFormElement>('[data-field="form"]')!;
  const input = panel.querySelector<HTMLInputElement>('[data-field="input"]')!;
  const privateBox = panel.querySelector<HTMLInputElement>('[data-field="private"]')!;

  let isOpen = false;

  function render() {
    const entries = history.entries();
    if (entries.length === 0) {
      list.replaceChildren();
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.replaceChildren(...entries.map(renderRow));
    // Auto-scroll to the bottom so the latest message is in view.
    list.scrollTop = list.scrollHeight;
  }

  function renderRow(msg: ChatMessage): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `chat-row chat-role-${msg.senderRole}`;
    if (msg.visibility === 'gm-only') li.classList.add('chat-private-msg');

    const meta = document.createElement('div');
    meta.className = 'chat-row-meta';

    const name = document.createElement('span');
    name.className = 'chat-row-name';
    name.textContent = msg.senderName || (msg.senderRole === 'gm' ? 'GM' : 'Player');

    const time = document.createElement('time');
    time.className = 'chat-row-time';
    time.textContent = formatClock(msg.timestamp);
    time.dateTime = new Date(msg.timestamp).toISOString();

    meta.appendChild(name);
    meta.appendChild(time);
    if (msg.visibility === 'gm-only') {
      const tag = document.createElement('span');
      tag.className = 'chat-row-tag';
      tag.textContent = msg.senderRole === 'gm' ? 'private' : 'whisper';
      meta.appendChild(tag);
    }

    const body = document.createElement('div');
    body.className = 'chat-row-body';
    body.textContent = msg.text;

    li.appendChild(meta);
    li.appendChild(body);
    return li;
  }

  function setOpen(next: boolean) {
    isOpen = next;
    panel.hidden = !next;
    if (next) {
      render();
      // Defer focus past the show frame so the input actually receives it.
      window.setTimeout(() => input.focus(), 0);
    }
  }

  history.subscribe(() => {
    if (isOpen) render();
  });

  closeBtn.addEventListener('click', () => setOpen(false));
  clearBtn.addEventListener('click', () => {
    history.clear();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const visibility: ChatVisibility = privateBox.checked ? 'gm-only' : 'shared';
    onSend(text, visibility);
    input.value = '';
  });

  return {
    toggle: () => setOpen(!isOpen),
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => isOpen,
    destroy: () => panel.remove(),
  };
}

function formatClock(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function escapeText(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
