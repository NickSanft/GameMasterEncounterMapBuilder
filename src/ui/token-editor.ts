import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import type { ID, Token, TokenHp, TokenLight } from '../state/types.js';
import {
  isStable,
  isDead,
  type DeathSaves,
} from '../state/token-hp.js';
import { putImage, getImageURL } from '../images/store.js';
import type { ImageLoader } from '../images/loader.js';
import { TEAM_PRESETS } from '../state/team-colors.js';
import { saveTokenToLibrary } from '../state/token-catalog.js';
import {
  CONDITION_PRESETS,
  toggleCondition,
  hasCondition,
  getConditionPreset,
  setConditionExpiration,
  clearConditionExpiration,
} from '../state/conditions.js';
import { normalizeHp } from '../state/token-hp.js';
import {
  rotateBy,
  snapRotation,
  radiansToDegrees,
  degreesToRadians,
  compass8Direction,
} from '../state/token-rotation.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';
import {
  cycleTo,
  tokensInSelectionOrder,
} from './token-editor-cycle.js';

export interface TokenEditorHandle {
  openFor(token: Token): void;
  close(): void;
  /** True if the modal is currently visible. */
  isOpen(): boolean;
}

export interface TokenEditorOptions {
  store: Store;
  selection: SelectionState;
  imageLoader: ImageLoader;
  onAfterChange?(): void;
  /**
   * Active feet-per-square preference. Used to display / parse the
   * sight-radius field in feet regardless of the underlying grid
   * cellSize. Defaults to D&D 5e's 5 ft per square when not supplied.
   */
  feetPerSquare?(): number;
}

export function mountTokenEditor(opts: TokenEditorOptions): TokenEditorHandle {
  const { store, selection, imageLoader } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal token-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Edit Token');
  modal.innerHTML = `
    <div class="modal-header">
      <div class="token-editor-title">
        <h2>Edit Token</h2>
        <span class="token-editor-counter" data-field="counter" aria-live="polite"></span>
      </div>
      <div class="token-editor-cycle" data-field="cycle-group" role="group" aria-label="Cycle selection">
        <button type="button" class="icon-btn" data-action="prev" title="Previous in selection (Ctrl+Left)" aria-label="Previous token in selection">‹</button>
        <button type="button" class="icon-btn" data-action="next" title="Next in selection (Ctrl+Right)" aria-label="Next token in selection">›</button>
      </div>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <label>Label
        <input type="text" data-field="label" maxlength="40" />
      </label>
      <div class="grid-row">
        <label>X (col)
          <input type="number" data-field="x" step="1" />
        </label>
        <label>Y (row)
          <input type="number" data-field="y" step="1" />
        </label>
        <label>Size
          <div class="radio-group" data-field="size">
            <label><input type="radio" name="te-size" value="1" /> 1</label>
            <label><input type="radio" name="te-size" value="2" /> 2</label>
            <label><input type="radio" name="te-size" value="3" /> 3</label>
          </div>
        </label>
      </div>
      <label>Color
        <input type="color" data-field="color" />
      </label>
      <label>Image
        <div class="image-row">
          <div class="image-preview" data-field="image-preview"></div>
          <div class="image-buttons">
            <button type="button" data-action="upload">Upload…</button>
            <button type="button" data-action="remove-image" disabled>Remove</button>
          </div>
          <input type="file" accept="image/*" data-field="file" hidden />
        </div>
      </label>
      <label>Border
        <div class="border-row" data-field="border-swatches" role="radiogroup" aria-label="Token border color">
          <button type="button" class="swatch swatch-none" role="radio" data-border="" title="No border" aria-label="No border">×</button>
          ${TEAM_PRESETS.map(
            (p) =>
              `<button type="button" class="swatch" role="radio" data-border="${p.color}" style="background:${p.color}" title="${p.label}" aria-label="${p.label} border"></button>`,
          ).join('')}
          <input type="color" class="border-color-input" data-field="borderColor" title="Custom color" aria-label="Custom border color" />
        </div>
      </label>

      <fieldset class="rotation-block">
        <legend>Facing</legend>
        <div class="rotation-row">
          <label>Rotation (°)
            <input type="number" data-field="rotation" step="15" min="0" max="359" />
          </label>
          <span class="rotation-compass" data-field="rotation-compass" aria-live="polite">N</span>
          <div class="rotation-quick" role="group" aria-label="Rotation quick-snap">
            <button type="button" data-rotate="-90" title="Rotate 90° counter-clockwise (Shift+,)">↺ 90°</button>
            <button type="button" data-rotate="-45" title="Rotate 45° counter-clockwise (,)">↺ 45°</button>
            <button type="button" data-rotate="45"  title="Rotate 45° clockwise (.)">↻ 45°</button>
            <button type="button" data-rotate="90"  title="Rotate 90° clockwise (Shift+.)">↻ 90°</button>
            <button type="button" data-rotate-to="0" title="Reset to North (0°)">N</button>
          </div>
        </div>
      </fieldset>

      <fieldset class="sight-block">
        <legend>Sight</legend>
        <label class="check">
          <input type="checkbox" data-field="hasSight" />
          <span>This token is a viewer (casts line of sight)</span>
        </label>
        <div class="sight-details" data-field="sight-details" hidden>
          <label>Radius (ft)
            <input type="number" data-field="losRadiusFeet" step="5" min="5" max="240" />
          </label>
          <p class="settings-hint">
            When "Dynamic line of sight" is on in Settings → Grid, walls
            marked as sight-blocking will occlude this viewer's vision.
          </p>
        </div>
      </fieldset>

      <fieldset class="light-block">
        <legend>Light</legend>
        <label class="check">
          <input type="checkbox" data-field="hasLight" />
          <span>This token emits light</span>
        </label>
        <div class="light-details" data-field="light-details" hidden>
          <div class="light-presets" role="group" aria-label="Light source presets">
            <button type="button" data-light-preset="candle" title="Candle: 5 ft bright, 5 ft dim">Candle</button>
            <button type="button" data-light-preset="torch" title="Torch: 20 ft bright, 20 ft dim">Torch</button>
            <button type="button" data-light-preset="lantern" title="Hooded lantern: 30 ft bright, 30 ft dim">Lantern</button>
            <button type="button" data-light-preset="daylight" title="Daylight spell: 60 ft bright, 60 ft dim">Daylight</button>
          </div>
          <div class="grid-row">
            <label>Bright (ft)
              <input type="number" data-field="lightBrightFeet" step="5" min="0" max="240" />
            </label>
            <label>Dim (ft)
              <input type="number" data-field="lightDimFeet" step="5" min="5" max="240" />
            </label>
            <label>Color
              <input type="color" data-field="lightColor" />
            </label>
          </div>
          <p class="settings-hint">
            With "Dynamic line of sight" on, sight-blocking walls also
            cast shadow on this light. Spectators only see cells reached
            by some viewer AND lit by some light.
          </p>
        </div>
      </fieldset>

      <fieldset class="initiative-mod-block">
        <legend>Initiative</legend>
        <label>Bonus
          <input type="number" data-field="initiativeMod" step="1" min="-20" max="20" />
        </label>
        <p class="settings-hint">
          Added to a 1d20 when the initiative tracker's "Roll all" button
          rolls for this token. D&amp;D 5e: usually your Dexterity modifier
          (+ extras like Alert / Jack of All Trades).
        </p>
      </fieldset>

      <fieldset class="hp-block">
        <legend>Hit points</legend>
        <label class="check">
          <input type="checkbox" data-field="trackHp" />
          <span>Track HP on this token</span>
        </label>
        <div class="hp-row" data-field="hp-fields" hidden>
          <label>Current
            <input type="number" data-field="hpCurrent" step="1" min="0" />
          </label>
          <label>Max
            <input type="number" data-field="hpMax" step="1" min="0" />
          </label>
          <label>Visibility
            <div class="radio-group">
              <label><input type="radio" name="te-hp-visibility" value="shared" /> Shared</label>
              <label><input type="radio" name="te-hp-visibility" value="gm" /> GM-only</label>
            </div>
          </label>
        </div>
        <!-- Phase 72 — death-save tracker. Visible only when HP is
             tracked AND current is 0. Auto-resets on heal. -->
        <div class="death-saves" data-field="death-saves" hidden>
          <div class="death-saves-header">
            <span class="death-saves-title">Death saves</span>
            <span class="death-saves-status" data-field="death-saves-status" aria-live="polite"></span>
          </div>
          <div class="death-saves-row">
            <span class="death-saves-label">Successes</span>
            <div class="death-saves-dots" data-field="death-success-dots" role="group" aria-label="Death save successes">
              <button type="button" class="dot success" data-success="1" aria-label="1 success"></button>
              <button type="button" class="dot success" data-success="2" aria-label="2 successes"></button>
              <button type="button" class="dot success" data-success="3" aria-label="3 successes"></button>
            </div>
          </div>
          <div class="death-saves-row">
            <span class="death-saves-label">Failures</span>
            <div class="death-saves-dots" data-field="death-failure-dots" role="group" aria-label="Death save failures">
              <button type="button" class="dot failure" data-failure="1" aria-label="1 failure"></button>
              <button type="button" class="dot failure" data-failure="2" aria-label="2 failures"></button>
              <button type="button" class="dot failure" data-failure="3" aria-label="3 failures"></button>
            </div>
          </div>
          <button type="button" class="death-saves-reset" data-action="reset-death-saves">Reset saves</button>
        </div>
      </fieldset>

      <fieldset class="conditions-block">
        <legend>Conditions</legend>
        <div class="condition-chips" data-field="condition-chips" role="group" aria-label="Token conditions">
          ${CONDITION_PRESETS.map(
            (c) =>
              `<button type="button" class="condition-chip" data-condition="${c.id}" title="${escapeAttr(c.desc)}" style="--condition-color:${c.color}">
                <span class="chip-dot"></span>
                <span class="chip-label">${c.label}</span>
              </button>`,
          ).join('')}
        </div>
        <!-- Phase 70 — per-active-condition round-timer editor. Hidden
             until at least one condition is active on the token. -->
        <div class="condition-timers" data-field="condition-timers" hidden></div>
      </fieldset>

      <hr />
      <div class="modal-footer">
        <button type="button" data-action="save-library" title="Save this token's appearance to the library for reuse">Save to Library</button>
        <button type="button" class="danger" data-action="delete">Delete Token</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const labelInput = modal.querySelector<HTMLInputElement>('[data-field="label"]')!;
  const colorInput = modal.querySelector<HTMLInputElement>('[data-field="color"]')!;
  const xInput = modal.querySelector<HTMLInputElement>('[data-field="x"]')!;
  const yInput = modal.querySelector<HTMLInputElement>('[data-field="y"]')!;
  const sizeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="te-size"]'),
  );
  const preview = modal.querySelector<HTMLDivElement>('[data-field="image-preview"]')!;
  const fileInput = modal.querySelector<HTMLInputElement>('[data-field="file"]')!;
  const uploadBtn = modal.querySelector<HTMLButtonElement>('[data-action="upload"]')!;
  const removeImageBtn = modal.querySelector<HTMLButtonElement>('[data-action="remove-image"]')!;
  const deleteBtn = modal.querySelector<HTMLButtonElement>('[data-action="delete"]')!;
  const saveLibraryBtn = modal.querySelector<HTMLButtonElement>('[data-action="save-library"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const borderInput = modal.querySelector<HTMLInputElement>('[data-field="borderColor"]')!;
  const borderSwatches = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-field="border-swatches"] .swatch'),
  );
  const prevBtn = modal.querySelector<HTMLButtonElement>('[data-action="prev"]')!;
  const nextBtn = modal.querySelector<HTMLButtonElement>('[data-action="next"]')!;
  const cycleGroup = modal.querySelector<HTMLDivElement>('[data-field="cycle-group"]')!;
  const counter = modal.querySelector<HTMLSpanElement>('[data-field="counter"]')!;
  const hasSightInput = modal.querySelector<HTMLInputElement>('[data-field="hasSight"]')!;
  const sightDetails = modal.querySelector<HTMLDivElement>('[data-field="sight-details"]')!;
  const losRadiusFeetInput = modal.querySelector<HTMLInputElement>('[data-field="losRadiusFeet"]')!;
  const hasLightInput = modal.querySelector<HTMLInputElement>('[data-field="hasLight"]')!;
  const lightDetails = modal.querySelector<HTMLDivElement>('[data-field="light-details"]')!;
  const lightBrightFeetInput = modal.querySelector<HTMLInputElement>('[data-field="lightBrightFeet"]')!;
  const lightDimFeetInput = modal.querySelector<HTMLInputElement>('[data-field="lightDimFeet"]')!;
  const lightColorInput = modal.querySelector<HTMLInputElement>('[data-field="lightColor"]')!;
  const lightPresetBtns = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-light-preset]'),
  );
  const trackHpInput = modal.querySelector<HTMLInputElement>('[data-field="trackHp"]')!;
  const hpFields = modal.querySelector<HTMLDivElement>('[data-field="hp-fields"]')!;
  const hpCurrentInput = modal.querySelector<HTMLInputElement>('[data-field="hpCurrent"]')!;
  const hpMaxInput = modal.querySelector<HTMLInputElement>('[data-field="hpMax"]')!;
  const hpVisibilityRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="te-hp-visibility"]'),
  );
  const deathSavesEl = modal.querySelector<HTMLDivElement>('[data-field="death-saves"]')!;
  const deathStatusEl = modal.querySelector<HTMLSpanElement>('[data-field="death-saves-status"]')!;
  const successDots = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-success]'),
  );
  const failureDots = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-failure]'),
  );
  const resetDeathBtn = modal.querySelector<HTMLButtonElement>(
    '[data-action="reset-death-saves"]',
  )!;
  const conditionChips = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('.condition-chip'),
  );
  const conditionTimersEl = modal.querySelector<HTMLDivElement>(
    '[data-field="condition-timers"]',
  )!;
  const initiativeModInput = modal.querySelector<HTMLInputElement>('[data-field="initiativeMod"]')!;
  const rotationInput = modal.querySelector<HTMLInputElement>('[data-field="rotation"]')!;
  const rotationCompass = modal.querySelector<HTMLSpanElement>('[data-field="rotation-compass"]')!;
  const rotationQuickBtns = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-rotate]'),
  );
  const rotationResetBtns = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-rotate-to]'),
  );

  let currentId: ID | null = null;
  let triggerFocus: HTMLElement | null = null;

  attachFocusTrap(modal);

  function currentToken(): Token | null {
    if (!currentId) return null;
    return store.getState().tokens.find((t) => t.id === currentId) ?? null;
  }

  function updatePreview(imageId: ID | null) {
    if (!imageId) {
      preview.style.backgroundImage = '';
      preview.classList.add('empty');
      removeImageBtn.disabled = true;
      return;
    }
    preview.classList.remove('empty');
    removeImageBtn.disabled = false;
    void getImageURL(imageId).then((url) => {
      if (currentToken()?.imageId !== imageId) return;
      preview.style.backgroundImage = url ? `url(${CSS.escape(url)})` : '';
    });
  }

  function syncBorderUI(borderColor: string | null) {
    const normalized = (borderColor ?? '').toLowerCase();
    let matched = false;
    for (const s of borderSwatches) {
      const swatchColor = (s.dataset.border ?? '').toLowerCase();
      const isActive = swatchColor === normalized;
      s.classList.toggle('active', isActive);
      s.setAttribute('aria-checked', isActive ? 'true' : 'false');
      // Roving tabindex: only the active swatch is in the tab order; if
      // nothing matches, the "no border" swatch gets the roving focus.
      s.tabIndex = isActive ? 0 : -1;
      if (isActive) matched = true;
    }
    if (!matched) {
      // No preset matched — put roving focus on the "no border" swatch so
      // arrow keys have a predictable entry point.
      const none = borderSwatches[0]!;
      none.tabIndex = 0;
    }
    borderInput.value = borderColor ?? '#ffffff';
    borderInput.classList.toggle('active', !matched && borderColor !== null);
  }

  function syncCounter() {
    const state = store.getState();
    const order = tokensInSelectionOrder(state.tokens, selection.ids);
    const multi = order.length > 1;
    cycleGroup.hidden = !multi;
    if (!multi) {
      counter.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    const idx = currentId ? order.indexOf(currentId) : -1;
    if (idx < 0) {
      counter.textContent = '';
    } else {
      counter.textContent = `${idx + 1} of ${order.length}`;
    }
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  function fillFromToken(token: Token) {
    currentId = token.id;
    labelInput.value = token.label;
    colorInput.value = token.color;
    xInput.value = String(token.x);
    yInput.value = String(token.y);
    for (const r of sizeRadios) r.checked = Number(r.value) === token.size;
    updatePreview(token.imageId);
    syncBorderUI(token.borderColor);
    syncHpUI(token.hp);
    syncDeathSavesUI(token.hp, token.deathSaves);
    syncSightUI(token.losRadius);
    syncLightUI(token.light);
    syncConditionUI(token.conditions, token.conditionExpirations);
    syncRotationUI(token.rotation);
    syncInitiativeModUI(token.initiativeMod);
    syncCounter();
  }

  function syncInitiativeModUI(mod: number) {
    initiativeModInput.value = String(mod);
  }

  function currentFeetPerSquare(): number {
    const f = opts.feetPerSquare?.();
    return typeof f === 'number' && Number.isFinite(f) && f > 0 ? f : 5;
  }

  function currentCellSize(): number {
    const sz = opts.store.getState().grid.cellSize;
    return sz > 0 ? sz : 50;
  }

  function radiusPxToFeet(losRadius: number): number {
    return Math.round((losRadius / currentCellSize()) * currentFeetPerSquare());
  }

  function radiusFeetToPx(feet: number): number {
    return (feet / currentFeetPerSquare()) * currentCellSize();
  }

  function syncSightUI(losRadius: number | null) {
    const hasSight = losRadius !== null;
    hasSightInput.checked = hasSight;
    sightDetails.hidden = !hasSight;
    // We store `losRadius` in WORLD PIXELS (same unit as token
    // coordinates) and expose it to the user in feet so the editor
    // field stays grid-agnostic.
    if (hasSight) {
      const feet = radiusPxToFeet(losRadius);
      losRadiusFeetInput.value = String(feet > 0 ? feet : 30);
    } else {
      losRadiusFeetInput.value = '30';
    }
  }

  function syncLightUI(light: TokenLight | null) {
    const hasLight = light !== null;
    hasLightInput.checked = hasLight;
    lightDetails.hidden = !hasLight;
    if (hasLight) {
      lightBrightFeetInput.value = String(radiusPxToFeet(light.bright));
      lightDimFeetInput.value = String(radiusPxToFeet(light.dim));
      lightColorInput.value = light.color || '#ffe1a4';
    } else {
      // Default torch values when first enabling.
      lightBrightFeetInput.value = '20';
      lightDimFeetInput.value = '20';
      lightColorInput.value = '#ffe1a4';
    }
  }

  function syncRotationUI(rotation: number) {
    const deg = Math.round(radiansToDegrees(rotation));
    rotationInput.value = String(deg);
    rotationCompass.textContent = compass8Direction(rotation);
  }

  function syncHpUI(hp: TokenHp | null) {
    const tracking = hp !== null;
    trackHpInput.checked = tracking;
    hpFields.hidden = !tracking;
    hpCurrentInput.value = hp ? String(hp.current) : '';
    hpMaxInput.value = hp ? String(hp.max) : '';
    const visibility = hp?.visibility ?? 'shared';
    for (const r of hpVisibilityRadios) r.checked = r.value === visibility;
  }

  function syncDeathSavesUI(hp: TokenHp | null, saves: DeathSaves) {
    // Show only for HP-tracked tokens that are currently at 0.
    const visible = hp !== null && hp.current === 0;
    deathSavesEl.hidden = !visible;
    if (!visible) return;
    for (const d of successDots) {
      const idx = Number(d.dataset.success ?? 0);
      d.classList.toggle('filled', idx <= saves.successes);
      d.setAttribute('aria-pressed', idx <= saves.successes ? 'true' : 'false');
    }
    for (const d of failureDots) {
      const idx = Number(d.dataset.failure ?? 0);
      d.classList.toggle('filled', idx <= saves.failures);
      d.setAttribute('aria-pressed', idx <= saves.failures ? 'true' : 'false');
    }
    if (isDead(saves)) {
      deathStatusEl.textContent = 'Dead';
      deathStatusEl.className = 'death-saves-status dead';
    } else if (isStable(saves)) {
      deathStatusEl.textContent = 'Stable';
      deathStatusEl.className = 'death-saves-status stable';
    } else {
      deathStatusEl.textContent = `${saves.successes}/${saves.failures}`;
      deathStatusEl.className = 'death-saves-status';
    }
  }

  function syncConditionUI(
    conditions: readonly string[],
    expirations: Readonly<Record<string, number>>,
  ) {
    for (const chip of conditionChips) {
      const id = chip.dataset.condition ?? '';
      const on = hasCondition(conditions, id);
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    renderConditionTimers(conditions, expirations);
  }

  /**
   * Phase 70 — render one row per active condition with a duration
   * control. Rows show a preset <select> (Permanent / 1 / 3 / 10 /
   * Custom) plus a number input that appears only when "Custom" is
   * picked. Setting a duration stores
   * `expiresAtRound = max(1, currentRound) + duration` on the token.
   */
  function renderConditionTimers(
    conditions: readonly string[],
    expirations: Readonly<Record<string, number>>,
  ) {
    conditionTimersEl.innerHTML = '';
    if (conditions.length === 0) {
      conditionTimersEl.hidden = true;
      return;
    }
    conditionTimersEl.hidden = false;
    for (const id of conditions) {
      const preset = getConditionPreset(id);
      const label = preset?.label ?? id;
      const currentRound = Math.max(1, store.getState().initiative.round);
      const expiresAt = expirations[id];
      const roundsLeft =
        typeof expiresAt === 'number'
          ? Math.max(0, expiresAt - currentRound)
          : null;

      const row = document.createElement('div');
      row.className = 'condition-timer-row';
      row.dataset.timerFor = id;

      const labelEl = document.createElement('span');
      labelEl.className = 'condition-timer-label';
      labelEl.textContent = label;
      if (preset) labelEl.style.setProperty('--condition-color', preset.color);

      const select = document.createElement('select');
      select.className = 'condition-timer-select';
      select.setAttribute('aria-label', `${label} duration`);
      const options: Array<[string, string]> = [
        ['permanent', 'Permanent'],
        ['1', '1 round'],
        ['3', '3 rounds'],
        ['10', '10 rounds (1 min)'],
        ['custom', 'Custom…'],
      ];
      for (const [v, t] of options) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        select.appendChild(o);
      }

      const custom = document.createElement('input');
      custom.type = 'number';
      custom.className = 'condition-timer-custom';
      custom.min = '1';
      custom.max = '99';
      custom.step = '1';
      custom.placeholder = 'Rounds';
      custom.setAttribute('aria-label', `${label} custom duration in rounds`);

      // Badge showing the live countdown ("3 rounds left" / "∞").
      const badge = document.createElement('span');
      badge.className = 'condition-timer-badge';

      // Pick the starting state of this row from the current expiration.
      if (roundsLeft === null) {
        select.value = 'permanent';
        custom.hidden = true;
        badge.textContent = '∞';
      } else if (roundsLeft === 1) {
        select.value = '1';
        custom.hidden = true;
        badge.textContent = '1 left';
      } else if (roundsLeft === 3) {
        select.value = '3';
        custom.hidden = true;
        badge.textContent = '3 left';
      } else if (roundsLeft === 10) {
        select.value = '10';
        custom.hidden = true;
        badge.textContent = '10 left';
      } else {
        select.value = 'custom';
        custom.hidden = false;
        custom.value = String(roundsLeft);
        badge.textContent = `${roundsLeft} left`;
      }

      function applyDuration(durationRounds: number | null) {
        const tok = currentToken();
        if (!tok) return;
        // Base the expiry on the live round counter. If combat hasn't
        // started (round 0), pin to 1 so the condition doesn't vanish
        // the moment initiative-set-active first fires with round=1.
        const nextExpirations = durationRounds === null
          ? clearConditionExpiration(tok.conditionExpirations, id)
          : setConditionExpiration(
              tok.conditionExpirations,
              id,
              currentRound + Math.max(1, Math.floor(durationRounds)),
            );
        update({ conditionExpirations: nextExpirations });
      }

      select.addEventListener('change', () => {
        if (select.value === 'permanent') {
          custom.hidden = true;
          applyDuration(null);
        } else if (select.value === 'custom') {
          custom.hidden = false;
          const v = parseInt(custom.value, 10);
          if (Number.isFinite(v) && v > 0) applyDuration(v);
          else custom.focus();
        } else {
          custom.hidden = true;
          const n = parseInt(select.value, 10);
          if (Number.isFinite(n)) applyDuration(n);
        }
      });

      custom.addEventListener('change', () => {
        if (select.value !== 'custom') return;
        const v = parseInt(custom.value, 10);
        if (!Number.isFinite(v) || v <= 0) return;
        applyDuration(v);
      });
      custom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const v = parseInt(custom.value, 10);
          if (Number.isFinite(v) && v > 0) applyDuration(v);
          e.preventDefault();
        }
      });

      row.appendChild(labelEl);
      row.appendChild(select);
      row.appendChild(custom);
      row.appendChild(badge);
      conditionTimersEl.appendChild(row);
    }
  }

  function openFor(token: Token) {
    triggerFocus = rememberFocus();
    fillFromToken(token);
    backdrop.hidden = false;
    window.setTimeout(() => {
      labelInput.focus();
      labelInput.select();
    }, 0);
  }

  function close() {
    currentId = null;
    // Blur any focused input/button before hiding so focus doesn't stay
    // trapped on a hidden element (which would swallow canvas shortcuts).
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    fileInput.value = '';
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function update(changes: Partial<Token>) {
    if (!currentId) return;
    store.applyPatch({ kind: 'token-update', id: currentId, changes });
    opts.onAfterChange?.();
  }

  function cycle(delta: number) {
    const state = store.getState();
    const order = tokensInSelectionOrder(state.tokens, selection.ids);
    if (order.length <= 1) return;
    const nextId = cycleTo(order, currentId, delta);
    if (!nextId) return;
    const nextToken = state.tokens.find((t) => t.id === nextId);
    if (!nextToken) return;
    fillFromToken(nextToken);
    // Keep focus on the label so rapid cycling feels keyboard-native.
    labelInput.focus();
    labelInput.select();
  }

  labelInput.addEventListener('input', () => {
    update({ label: labelInput.value });
  });

  colorInput.addEventListener('change', () => {
    update({ color: colorInput.value });
  });

  function parseIntOr(v: string, fallback: number, min: number, max: number): number {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function commitX() {
    const token = currentToken();
    if (!token) return;
    const grid = store.getState().grid;
    const n = parseIntOr(xInput.value, token.x, 0, grid.cols - 1);
    if (n !== token.x) update({ x: n });
    xInput.value = String(n);
  }
  function commitY() {
    const token = currentToken();
    if (!token) return;
    const grid = store.getState().grid;
    const n = parseIntOr(yInput.value, token.y, 0, grid.rows - 1);
    if (n !== token.y) update({ y: n });
    yInput.value = String(n);
  }

  xInput.addEventListener('change', commitX);
  yInput.addEventListener('change', commitY);
  // Enter commits + keeps focus; blur also commits via 'change'.
  xInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitX();
      e.preventDefault();
    }
  });
  yInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitY();
      e.preventDefault();
    }
  });

  for (const r of sizeRadios) {
    r.addEventListener('change', () => {
      if (r.checked) update({ size: Number(r.value) });
    });
  }

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || !currentId) return;
    try {
      const id = await putImage(file, file.type || 'image/png');
      imageLoader.invalidate(id);
      update({ imageId: id });
      updatePreview(id);
    } catch (err) {
      console.error('[token-editor] upload failed', err);
      window.alert('Image upload failed — check the console for details.');
    }
  });

  removeImageBtn.addEventListener('click', () => {
    update({ imageId: null });
    updatePreview(null);
  });

  for (const s of borderSwatches) {
    s.addEventListener('click', () => {
      const raw = s.dataset.border ?? '';
      const next = raw === '' ? null : raw;
      update({ borderColor: next });
      syncBorderUI(next);
    });
    s.addEventListener('keydown', (e) => {
      const idx = borderSwatches.indexOf(s);
      let nextIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % borderSwatches.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + borderSwatches.length) % borderSwatches.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = borderSwatches.length - 1;
      } else if (e.key === ' ' || e.key === 'Enter') {
        const raw = s.dataset.border ?? '';
        const next = raw === '' ? null : raw;
        update({ borderColor: next });
        syncBorderUI(next);
        e.preventDefault();
        return;
      } else {
        return;
      }
      const target = borderSwatches[nextIdx]!;
      // Update roving tabindex so the newly-focused swatch is tab-stoppable.
      for (const other of borderSwatches) other.tabIndex = -1;
      target.tabIndex = 0;
      target.focus();
      e.preventDefault();
    });
  }

  borderInput.addEventListener('change', () => {
    update({ borderColor: borderInput.value });
    syncBorderUI(borderInput.value);
  });

  trackHpInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    if (trackHpInput.checked) {
      const hp: TokenHp = tok.hp ?? { current: 10, max: 10, visibility: 'shared' };
      update({ hp });
      syncHpUI(hp);
    } else {
      update({ hp: null });
      syncHpUI(null);
    }
  });

  hasSightInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    if (hasSightInput.checked) {
      // Default to 30 ft (torch light) when first enabled.
      const feet = 30;
      const losRadius = radiusFeetToPx(feet);
      update({ losRadius });
      syncSightUI(losRadius);
    } else {
      update({ losRadius: null });
      syncSightUI(null);
    }
  });

  losRadiusFeetInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok || tok.losRadius === null) return;
    const feet = parseInt(losRadiusFeetInput.value, 10);
    if (!Number.isFinite(feet) || feet <= 0) {
      syncSightUI(tok.losRadius);
      return;
    }
    const losRadius = radiusFeetToPx(feet);
    update({ losRadius });
    syncSightUI(losRadius);
  });

  // Light source presets (Phase 57). Values are 5e SRD norms — players
  // recognize "20/20 torch" / "30/30 lantern" without having to look it
  // up. The bright + dim feet fields below the preset row stay in sync
  // when a preset is clicked.
  const LIGHT_PRESETS: Record<string, { bright: number; dim: number; color: string }> = {
    candle:   { bright: 5,  dim: 5,  color: '#ffd28a' },
    torch:    { bright: 20, dim: 20, color: '#ffb060' },
    lantern:  { bright: 30, dim: 30, color: '#ffe1a4' },
    daylight: { bright: 60, dim: 60, color: '#fff8d6' },
  };

  hasLightInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    if (hasLightInput.checked) {
      // Default to the Torch preset when first enabled — the most
      // common D&D 5e light source for early-game adventurers.
      const preset = LIGHT_PRESETS.torch!;
      const light: TokenLight = {
        bright: radiusFeetToPx(preset.bright),
        dim: radiusFeetToPx(preset.dim),
        color: preset.color,
      };
      update({ light });
      syncLightUI(light);
    } else {
      update({ light: null });
      syncLightUI(null);
    }
  });

  for (const btn of lightPresetBtns) {
    btn.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok) return;
      const id = btn.dataset.lightPreset ?? '';
      const preset = LIGHT_PRESETS[id];
      if (!preset) return;
      const light: TokenLight = {
        bright: radiusFeetToPx(preset.bright),
        dim: radiusFeetToPx(preset.dim),
        color: preset.color,
      };
      update({ light });
      syncLightUI(light);
    });
  }

  function commitLightField() {
    const tok = currentToken();
    if (!tok || !tok.light) return;
    const brightFeet = parseInt(lightBrightFeetInput.value, 10);
    const dimFeet = parseInt(lightDimFeetInput.value, 10);
    if (!Number.isFinite(brightFeet) || !Number.isFinite(dimFeet)) {
      syncLightUI(tok.light);
      return;
    }
    if (dimFeet <= 0) {
      syncLightUI(tok.light);
      return;
    }
    // Clamp bright to [0, dim] — bright > dim makes no physical sense
    // (a candle's "definitely-lit" zone can't extend past its outer
    // glow). The Token type's normalizer enforces this on the wire too.
    const safeBright = Math.max(0, Math.min(brightFeet, dimFeet));
    const light: TokenLight = {
      bright: radiusFeetToPx(safeBright),
      dim: radiusFeetToPx(dimFeet),
      color: tok.light.color,
    };
    update({ light });
    syncLightUI(light);
  }

  lightBrightFeetInput.addEventListener('change', commitLightField);
  lightDimFeetInput.addEventListener('change', commitLightField);
  lightBrightFeetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitLightField();
      e.preventDefault();
    }
  });
  lightDimFeetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitLightField();
      e.preventDefault();
    }
  });

  lightColorInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok || !tok.light) return;
    const light: TokenLight = { ...tok.light, color: lightColorInput.value };
    update({ light });
    syncLightUI(light);
  });

  function commitHpField(which: 'current' | 'max') {
    const tok = currentToken();
    if (!tok || !tok.hp) return;
    const current = parseInt(hpCurrentInput.value, 10);
    const max = parseInt(hpMaxInput.value, 10);
    if (!Number.isFinite(current) || !Number.isFinite(max)) {
      syncHpUI(tok.hp);
      return;
    }
    const next = normalizeHp({
      current: which === 'current' ? current : tok.hp.current,
      max: which === 'max' ? max : tok.hp.max,
      visibility: tok.hp.visibility,
    });
    // If max is shrinking, also pull down current.
    const merged = normalizeHp({
      current:
        which === 'current' ? next.current : Math.min(tok.hp.current, next.max),
      max: next.max,
      visibility: tok.hp.visibility,
    });
    update({ hp: merged });
    syncHpUI(merged);
  }

  hpCurrentInput.addEventListener('change', () => commitHpField('current'));
  hpMaxInput.addEventListener('change', () => commitHpField('max'));
  hpCurrentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitHpField('current');
      e.preventDefault();
    }
  });
  hpMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitHpField('max');
      e.preventDefault();
    }
  });

  for (const r of hpVisibilityRadios) {
    r.addEventListener('change', () => {
      const tok = currentToken();
      if (!tok || !tok.hp || !r.checked) return;
      const visibility = r.value === 'gm' ? 'gm' : 'shared';
      update({ hp: { ...tok.hp, visibility } });
    });
  }

  // Phase 72 — death-save dot toggles. Clicking dot N sets the count
  // to N if it isn't already, OR to N-1 if it equals N (so clicking
  // a filled dot un-fills it). This is the standard "click to fill,
  // click again to unfill" pattern from D&D Beyond / Roll20.
  function setDeathSaves(next: DeathSaves) {
    const tok = currentToken();
    if (!tok) return;
    update({ deathSaves: next });
    syncDeathSavesUI(tok.hp, next);
  }

  for (const dot of successDots) {
    dot.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok || !tok.hp) return;
      const idx = Number(dot.dataset.success ?? 0);
      const nextSuccesses =
        tok.deathSaves.successes === idx ? idx - 1 : idx;
      setDeathSaves({
        successes: Math.max(0, Math.min(3, nextSuccesses)),
        failures: tok.deathSaves.failures,
      });
    });
  }

  for (const dot of failureDots) {
    dot.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok || !tok.hp) return;
      const idx = Number(dot.dataset.failure ?? 0);
      const nextFailures =
        tok.deathSaves.failures === idx ? idx - 1 : idx;
      setDeathSaves({
        successes: tok.deathSaves.successes,
        failures: Math.max(0, Math.min(3, nextFailures)),
      });
    });
  }

  resetDeathBtn.addEventListener('click', () => {
    setDeathSaves({ successes: 0, failures: 0 });
  });

  for (const chip of conditionChips) {
    chip.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok) return;
      const id = chip.dataset.condition;
      if (!id) return;
      const next = toggleCondition(tok.conditions, id);
      // Phase 70 — if we just REMOVED a condition, also strip any
      // round timer it may have carried, so a stale expiry doesn't
      // survive into the next time the GM re-applies the condition.
      const nextExpirations = next.includes(id)
        ? tok.conditionExpirations
        : clearConditionExpiration(tok.conditionExpirations, id);
      update({ conditions: next, conditionExpirations: nextExpirations });
      syncConditionUI(next, nextExpirations);
    });
  }

  function commitRotation(deg: number) {
    const tok = currentToken();
    if (!tok) return;
    const rotation = degreesToRadians(deg);
    update({ rotation });
    syncRotationUI(rotation);
  }

  function commitInitiativeMod() {
    const tok = currentToken();
    if (!tok) return;
    const n = parseInt(initiativeModInput.value, 10);
    if (!Number.isFinite(n)) {
      syncInitiativeModUI(tok.initiativeMod);
      return;
    }
    const clamped = Math.max(-20, Math.min(20, n));
    if (clamped !== tok.initiativeMod) update({ initiativeMod: clamped });
    syncInitiativeModUI(clamped);
  }

  initiativeModInput.addEventListener('change', commitInitiativeMod);
  initiativeModInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitInitiativeMod();
      e.preventDefault();
    }
  });

  rotationInput.addEventListener('change', () => {
    const deg = parseFloat(rotationInput.value);
    if (!Number.isFinite(deg)) {
      const tok = currentToken();
      if (tok) syncRotationUI(tok.rotation);
      return;
    }
    commitRotation(deg);
  });
  rotationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const deg = parseFloat(rotationInput.value);
      if (Number.isFinite(deg)) commitRotation(deg);
      e.preventDefault();
    }
  });

  for (const btn of rotationQuickBtns) {
    btn.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok) return;
      const deltaDeg = parseFloat(btn.dataset.rotate ?? '0');
      if (!Number.isFinite(deltaDeg)) return;
      // Always snap the result to the 45° grid — repeated clicks from an
      // arbitrary starting angle stay tidy, but a 90° click on a 45° token
      // still lands on the next 45° multiple (not rounded to a cardinal).
      const next = snapRotation(
        rotateBy(tok.rotation, degreesToRadians(deltaDeg)),
        Math.PI / 4,
      );
      update({ rotation: next });
      syncRotationUI(next);
    });
  }

  for (const btn of rotationResetBtns) {
    btn.addEventListener('click', () => {
      const tok = currentToken();
      if (!tok) return;
      const deg = parseFloat(btn.dataset.rotateTo ?? '0');
      if (!Number.isFinite(deg)) return;
      commitRotation(deg);
    });
  }

  // Swallow Space on quick-snap buttons so the page doesn't scroll inside
  // the modal — but they can still be activated with Enter.
  for (const btn of [...rotationQuickBtns, ...rotationResetBtns]) {
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  }

  deleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    const id = currentId;
    store.applyPatch({ kind: 'token-remove', id });
    if (selection.ids.has(id)) {
      const next = new Set(selection.ids);
      next.delete(id);
      selection.ids = next;
    }
    // If there's still a selection, cycle to the next token rather than
    // closing the modal — keeps keyboard-only batch editing fast.
    const order = tokensInSelectionOrder(store.getState().tokens, selection.ids);
    if (order.length > 0) {
      const nextToken = store.getState().tokens.find((t) => t.id === order[0]!);
      if (nextToken) {
        fillFromToken(nextToken);
        labelInput.focus();
        labelInput.select();
        opts.onAfterChange?.();
        return;
      }
    }
    close();
    opts.onAfterChange?.();
  });

  saveLibraryBtn.addEventListener('click', async () => {
    const token = currentToken();
    if (!token) return;
    saveLibraryBtn.disabled = true;
    const originalLabel = saveLibraryBtn.textContent ?? 'Save to Library';
    try {
      await saveTokenToLibrary(token);
      saveLibraryBtn.textContent = 'Saved ✓';
      window.setTimeout(() => {
        saveLibraryBtn.textContent = originalLabel;
        saveLibraryBtn.disabled = false;
      }, 1200);
    } catch (err) {
      console.error('[token-editor] save-to-library failed', err);
      window.alert('Could not save token to the library.');
      saveLibraryBtn.disabled = false;
    }
  });

  prevBtn.addEventListener('click', () => cycle(-1));
  nextBtn.addEventListener('click', () => cycle(1));

  closeBtn.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Cycle + close shortcuts scoped to the modal so they don't interfere
  // with the canvas keymap when the editor is hidden.
  modal.addEventListener('keydown', (e) => {
    if (backdrop.hidden) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'ArrowLeft') {
        cycle(-1);
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowRight') {
        cycle(1);
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        close();
        e.preventDefault();
        return;
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  store.subscribe((patch) => {
    if (backdrop.hidden) {
      return;
    }
    if (!patch) {
      if (currentToken() === null) close();
      else syncCounter();
      return;
    }
    if (patch.kind === 'token-remove' && patch.id === currentId) {
      close();
    } else if (patch.kind === 'session-reset') {
      close();
    } else if (
      patch.kind === 'token-add' ||
      patch.kind === 'token-remove' ||
      patch.kind === 'token-update'
    ) {
      syncCounter();
      // If the currently-open token changed externally (e.g. arrow-key
      // nudge on the canvas), re-sync position fields unless the user is
      // actively editing them.
      if (patch.kind === 'token-update' && patch.id === currentId) {
        const t = currentToken();
        if (t) {
          if (document.activeElement !== xInput) xInput.value = String(t.x);
          if (document.activeElement !== yInput) yInput.value = String(t.y);
          // Phase 70 — condition timers list stays in sync with
          // external condition edits (e.g. another tab toggled a
          // chip). Skip if the user is typing in one of the timer
          // inputs, to avoid stomping their in-progress edit.
          if (!conditionTimersEl.contains(document.activeElement)) {
            syncConditionUI(t.conditions, t.conditionExpirations);
          }
          // Phase 72 — HP / death-save tracker mirror externally-
          // applied damage (auto +failure on a 0-HP token, auto-
          // reset on heal-from-0). Skip when the GM is mid-edit on
          // the HP fields to avoid clobbering an in-progress value.
          if (
            document.activeElement !== hpCurrentInput &&
            document.activeElement !== hpMaxInput
          ) {
            syncHpUI(t.hp);
          }
          if (!deathSavesEl.contains(document.activeElement)) {
            syncDeathSavesUI(t.hp, t.deathSaves);
          }
        }
      }
    } else if (patch.kind === 'initiative-set-active') {
      // Phase 70 — advancing the round may have stripped expired
      // conditions off the currently-open token. The store mutated
      // tokens in-place during the reducer; re-render the timer list.
      const t = currentToken();
      if (t && !conditionTimersEl.contains(document.activeElement)) {
        syncConditionUI(t.conditions, t.conditionExpirations);
      }
    }
  });

  return {
    openFor,
    close,
    isOpen: () => !backdrop.hidden,
  };
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
