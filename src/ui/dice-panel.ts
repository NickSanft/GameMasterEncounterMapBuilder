import type { ViewMode } from '../state/types.js';
import {
  parseDiceExpression,
  rollDice,
  formatRoll,
  DiceParseError,
  type DiceRollResult,
} from '../state/dice.js';
import type { DiceRollBroadcast } from '../sync/messages.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface DicePanelHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  /** Record a roll made remotely (e.g. via sync channel) in the history. */
  pushRemoteRoll(roll: DiceRollBroadcast): void;
  destroy(): void;
}

export interface DicePanelOptions {
  viewMode: ViewMode;
  /**
   * Called whenever the local user rolls. Used by the GM entry to
   * broadcast rolls to the Spectator. Optional — the panel works even
   * without sync (it just won't share).
   */
  onLocalRoll?(roll: DiceRollBroadcast): void;
}

interface HistoryEntry {
  id: number;
  source: string;
  breakdown: string;
  total: number;
  /** 'local' = this tab rolled, 'gm' / 'spectator' = from sync. */
  who: 'local' | 'gm' | 'spectator';
  /** d20-crit highlight flags based on the first d20 rolled, if any. */
  crit?: 'nat20' | 'nat1';
}

const HISTORY_LIMIT = 20;

const QUICK_DICE: Array<{ label: string; expr: string }> = [
  { label: 'd4', expr: '1d4' },
  { label: 'd6', expr: '1d6' },
  { label: 'd8', expr: '1d8' },
  { label: 'd10', expr: '1d10' },
  { label: 'd12', expr: '1d12' },
  { label: 'd20', expr: '1d20' },
  { label: 'd100', expr: '1d100' },
];

export function mountDicePanel(opts: DicePanelOptions): DicePanelHandle {
  // Floating circular 🎲 button pinned bottom-left, just above the `?` help button.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dice-button';
  button.setAttribute('aria-label', 'Open dice roller');
  button.setAttribute('aria-expanded', 'false');
  button.title = 'Dice roller (quick d4–d100 + custom expressions)';
  button.textContent = '🎲';
  document.body.appendChild(button);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal dice-panel';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Dice roller');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Dice roller</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="dice-quick" role="group" aria-label="Quick dice">
        ${QUICK_DICE.map(
          (d) =>
            `<button type="button" data-quick="${d.expr}" title="Roll ${d.expr}">${d.label}</button>`,
        ).join('')}
      </div>
      <label>Custom expression
        <div class="dice-expr-row">
          <input type="text" data-field="expr" placeholder="e.g. 1d20+5  ·  4d6kh3  ·  2d20kh1" autocomplete="off" spellcheck="false" />
          <button type="button" class="primary" data-action="roll">Roll</button>
        </div>
      </label>
      <p class="dice-error" data-field="error" role="alert" aria-live="polite"></p>
      <div class="dice-history" aria-label="Roll history">
        <div class="dice-history-header">
          <span>Recent rolls</span>
          <button type="button" class="dice-clear" data-action="clear" title="Clear history">Clear</button>
        </div>
        <ul class="dice-history-list" data-field="history"></ul>
        <p class="dice-history-empty" data-field="history-empty">No rolls yet.</p>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const exprInput = modal.querySelector<HTMLInputElement>('[data-field="expr"]')!;
  const rollBtn = modal.querySelector<HTMLButtonElement>('[data-action="roll"]')!;
  const quickBtns = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-quick]'),
  );
  const errorEl = modal.querySelector<HTMLParagraphElement>('[data-field="error"]')!;
  const historyList = modal.querySelector<HTMLUListElement>('[data-field="history"]')!;
  const historyEmpty = modal.querySelector<HTMLParagraphElement>('[data-field="history-empty"]')!;
  const clearBtn = modal.querySelector<HTMLButtonElement>('[data-action="clear"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  const history: HistoryEntry[] = [];
  let triggerFocus: HTMLElement | null = null;

  function detectCrit(result: DiceRollResult): HistoryEntry['crit'] {
    const firstD20 = result.groups.find((g) => g.sides === 20);
    if (!firstD20) return undefined;
    const keptRolls = firstD20.rolls.filter((_, i) => firstD20.kept[i]);
    if (keptRolls.length !== 1) return undefined;
    if (keptRolls[0] === 20) return 'nat20';
    if (keptRolls[0] === 1) return 'nat1';
    return undefined;
  }

  function renderHistory() {
    historyEmpty.hidden = history.length > 0;
    historyList.innerHTML = '';
    for (const entry of history) {
      const li = document.createElement('li');
      li.className = 'dice-history-item';
      if (entry.crit === 'nat20') li.classList.add('dice-nat20');
      if (entry.crit === 'nat1') li.classList.add('dice-nat1');
      if (entry.who === 'gm') li.classList.add('dice-from-gm');
      if (entry.who === 'spectator') li.classList.add('dice-from-spectator');

      const whoLabel =
        entry.who === 'local'
          ? ''
          : entry.who === 'gm'
            ? 'GM · '
            : 'Spectator · ';

      li.innerHTML = `
        <div class="dice-history-line">
          <span class="dice-history-source">${escapeText(whoLabel)}${escapeText(entry.source)}</span>
          <span class="dice-history-total">${entry.total}</span>
        </div>
        <div class="dice-history-breakdown">${escapeText(entry.breakdown)}</div>
      `;
      historyList.appendChild(li);
    }
  }

  function pushHistoryEntry(entry: HistoryEntry) {
    history.unshift(entry);
    if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
    renderHistory();
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }

  function showError(msg: string) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }

  function executeExpression(source: string) {
    clearError();
    let expr;
    try {
      expr = parseDiceExpression(source);
    } catch (err) {
      if (err instanceof DiceParseError) showError(err.message);
      else showError('Could not parse expression.');
      return;
    }
    const result = rollDice(expr);
    const breakdown = formatRoll(result);
    const crit = detectCrit(result);
    const id = Date.now();
    const entry: HistoryEntry = {
      id,
      source: result.source,
      breakdown,
      total: result.total,
      who: 'local',
      ...(crit ? { crit } : {}),
    };
    pushHistoryEntry(entry);
    opts.onLocalRoll?.({
      source: result.source,
      from: opts.viewMode,
      total: result.total,
      breakdown,
      id,
    });
  }

  function pushRemoteRoll(roll: DiceRollBroadcast) {
    // Ignore self-echos (e.g. BroadcastChannel delivers to every tab
    // including the sender in some browsers).
    if (roll.from === opts.viewMode) return;
    // De-dupe: if we've already seen this id, skip.
    if (history.some((h) => h.id === roll.id)) return;
    const entry: HistoryEntry = {
      id: roll.id,
      source: roll.source,
      breakdown: roll.breakdown,
      total: roll.total,
      who: roll.from,
    };
    pushHistoryEntry(entry);
  }

  // Wiring — quick buttons, Roll button, Enter-in-expr.
  for (const qb of quickBtns) {
    qb.addEventListener('click', () => {
      const expr = qb.dataset.quick;
      if (!expr) return;
      executeExpression(expr);
      exprInput.focus();
    });
  }

  rollBtn.addEventListener('click', () => {
    const value = exprInput.value.trim();
    if (!value) return;
    executeExpression(value);
  });

  exprInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = exprInput.value.trim();
      if (value) executeExpression(value);
    }
  });

  clearBtn.addEventListener('click', () => {
    history.length = 0;
    renderHistory();
    exprInput.focus();
  });

  closeBtn.addEventListener('click', () => close());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  function open() {
    if (!backdrop.hidden) return;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    clearError();
    // Focus the expression input for quick typing.
    window.setTimeout(() => {
      exprInput.focus();
      exprInput.select();
    }, 0);
  }

  function close() {
    if (backdrop.hidden) return;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function toggle() {
    if (backdrop.hidden) open();
    else close();
  }

  button.addEventListener('click', () => {
    button.blur();
    toggle();
  });

  const escListener = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', escListener);

  renderHistory();

  return {
    open,
    close,
    toggle,
    isOpen: () => !backdrop.hidden,
    pushRemoteRoll,
    destroy() {
      window.removeEventListener('keydown', escListener);
      button.remove();
      backdrop.remove();
    },
  };
}

function escapeText(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
