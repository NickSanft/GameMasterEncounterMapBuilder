import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import type {
  Aura,
  ID,
  Token,
  TokenHp,
  TokenLight,
  VisionMode,
  VisionModeKind,
} from '../state/types.js';
import { nid as nanoNid } from '../util/id.js';
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
import { descendantsOf } from '../state/token-relations.js';
import {
  AURA_PRESETS,
  instantiateAuraPreset,
} from '../state/aura-presets.js';

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
  /**
   * Phase 109 — per-Spectator visibility integration. All three
   * callbacks are optional; omitting any of them hides the
   * "Visibility" section entirely (Spectator-side / e2e tests that
   * don't mount the permissions store still work).
   *
   * - `getConnectedSpectators()` returns the live list of connected
   *   players (sourced from the IdentityRegistry), filtered to
   *   role==='spectator'. Empty list → the section shows a hint
   *   instead of an empty checkbox list.
   * - `isTokenHiddenForSpectator(playerId, tokenId)` mirrors the
   *   per-spectator hidden-tokens store entry; the checkbox is
   *   checked when the token is VISIBLE (not hidden).
   * - `setTokenHiddenForSpectator(playerId, tokenId, hidden)` toggles
   *   the hidden state. The host re-broadcasts permissions inside
   *   the store's subscribe so the Spectator's render updates within
   *   one BroadcastChannel hop.
   */
  getConnectedSpectators?(): readonly { id: string; name: string; color?: string }[];
  isTokenHiddenForSpectator?(playerId: string, tokenId: string): boolean;
  setTokenHiddenForSpectator?(playerId: string, tokenId: string, hidden: boolean): void;
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

      <!-- Phase 178 — D&D vision modes. Visual reminder only in
           v1.53 — fog / LoS math still uses Token.losRadius. -->
      <fieldset class="vision-modes-block">
        <legend>Vision modes</legend>
        <div class="vision-mode-list" data-field="vision-mode-list"></div>
        <button type="button" class="vision-mode-add" data-action="add-vision-mode">
          + Add vision
        </button>
        <p class="settings-hint">
          Phase 178 — D&amp;D vision modes (darkvision, blindsight,
          tremorsense, truesight) shown as faint dashed disks on
          the GM canvas. Visual reminder; doesn't affect fog math.
        </p>
      </fieldset>

      <fieldset class="aura-block">
        <legend>Auras</legend>
        <div class="aura-list" data-field="aura-list"></div>
        <div class="aura-buttons">
          <button type="button" class="aura-add" data-action="add-aura">
            + Add aura
          </button>
          <!-- Phase 159 — preset picker. Selecting an option stamps a
               new aura with the preset's defaults; the dropdown
               immediately resets to the placeholder so the GM can
               pick the same preset twice in a row. -->
          <select class="aura-preset-select" data-field="aura-preset-select" aria-label="Add from preset">
            <option value="">+ From preset…</option>
          </select>
        </div>
        <p class="settings-hint">
          Phase 139 / 151 / 159 — colored emanation rings centered on
          this token. Multiple auras stack visually (Bless +
          Spirit Guardians on the same caster). Each ring follows the
          token as it moves. GM-only auras are hidden from the
          Spectator canvas. The "From preset…" picker stamps common
          5e auras with the right radius + color in one click.
        </p>
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

      <fieldset class="movement-block">
        <legend>Movement</legend>
        <label>Speed (ft/round)
          <input type="number" data-field="speedFt" step="5" min="0" max="240" />
        </label>
        <p class="settings-hint">
          Phase 149 — when this token is the active initiative entry,
          the movement-distance pip during a drag flips between green
          ("12 / 30 ft") and red ("over by 5 ft") based on whether
          the drag exceeds the speed. Set to 0 to disable the budget
          HUD for this token. Default 30 ft (SRD humanoid base).
        </p>
        <label class="check lock-check">
          <input type="checkbox" data-field="locked" />
          <span>Lock token (prevent drag)</span>
        </label>
        <p class="settings-hint">
          Phase 154 — pinned tokens can still be selected, edited,
          and deleted via the right-click menu, but the select
          tool's drag handler skips them. A small lock-glyph badge
          renders at the token's bottom-left corner.
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

      <!-- Phase 109 — per-Spectator visibility. Each connected
           Spectator gets a checkbox; checked means the Spectator can
           see this token, unchecked means hidden. The host wires the
           callbacks; omitting them hides the entire fieldset. -->
      <fieldset class="visibility-fieldset" data-field="visibility-fieldset" hidden>
        <legend>Visible to</legend>
        <p class="settings-hint">Uncheck a Spectator to hide this token from them. Default: visible to everyone.</p>
        <div class="visibility-list" data-field="visibility-list" role="group" aria-label="Per-Spectator token visibility"></div>
        <p class="visibility-empty" data-field="visibility-empty" hidden>No Spectators connected. When a player joins, they'll appear here.</p>
      </fieldset>

      <!-- Phase 126 — token ownership. Picks which connected
           Spectator (if any) owns this token. Visible only when the
           host wires getConnectedSpectators (GM-side only). Phase 127
           will add the spectator-side drag wiring keyed off this
           field; v126 is GM-authoring only. -->
      <fieldset class="owner-fieldset" data-field="owner-fieldset" hidden>
        <legend>Owned by</legend>
        <p class="settings-hint">A token's owner can move it themselves (Phase 127). GM-controlled tokens are dragged by the GM only.</p>
        <select data-field="owner-select" aria-label="Token owner">
          <option value="">Unowned (GM-controlled)</option>
        </select>
      </fieldset>

      <!-- Phase 156 — token vehicle / parent relationship. Picks
           which other token (if any) carries this one. Dragging the
           parent moves this token by the same delta. -->
      <fieldset class="parent-fieldset">
        <legend>Carried by</legend>
        <p class="settings-hint">
          Phase 156 — pick another token to "carry" this one. Dragging the parent translates this token by the same delta (rider on a horse, crew on a ship, treasure on a chest). The cascade is one-way — dragging this token alone moves only this token.
        </p>
        <select data-field="parent-select" aria-label="Carried by">
          <option value="">— None —</option>
        </select>
      </fieldset>

      <!-- Phase 177 — comma-separated tags. Used by the "Select
           by tag…" command palette action to multi-select tokens
           sharing a tag. Lowercased + deduped on commit. -->
      <fieldset class="tags-fieldset">
        <legend>Tags</legend>
        <input
          type="text"
          data-field="tags"
          class="token-editor-tags"
          placeholder="goblin, minion, encounter-1"
        />
        <p class="settings-hint">
          Phase 177 — comma-separated. Tags are lowercased on
          commit. Use the command palette's "Select by tag…" to
          multi-select every token sharing a tag.
        </p>
      </fieldset>

      <!-- Phase 162 — GM-only mini-statblock scratchpad. Free-form
           text for "AC 16 / Save +5 / Multiattack 2x scimitar"
           reminders. Spectators never see this field; the editor is
           a GM-side modal. -->
      <fieldset class="notes-fieldset">
        <legend>Notes (GM-only)</legend>
        <textarea
          data-field="notes"
          class="token-editor-notes"
          rows="3"
          placeholder="AC, saves, special abilities, reminders…"
          spellcheck="true"
        ></textarea>
        <p class="settings-hint">
          Phase 162 — free-form GM scratchpad attached to this
          token. Persists with the scene. Hidden from Spectators.
        </p>
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
  const visibilityFieldset = modal.querySelector<HTMLFieldSetElement>(
    '[data-field="visibility-fieldset"]',
  )!;
  const visibilityList = modal.querySelector<HTMLDivElement>(
    '[data-field="visibility-list"]',
  )!;
  const visibilityEmpty = modal.querySelector<HTMLParagraphElement>(
    '[data-field="visibility-empty"]',
  )!;
  // Phase 126 — owner dropdown.
  const ownerFieldset = modal.querySelector<HTMLFieldSetElement>(
    '[data-field="owner-fieldset"]',
  )!;
  const ownerSelect = modal.querySelector<HTMLSelectElement>(
    '[data-field="owner-select"]',
  )!;
  // Phase 156 — parent ("carried by") dropdown.
  const parentSelect = modal.querySelector<HTMLSelectElement>(
    '[data-field="parent-select"]',
  )!;
  // Phase 162 — GM-only notes textarea.
  const notesInput = modal.querySelector<HTMLTextAreaElement>(
    '[data-field="notes"]',
  )!;
  // Phase 177 — comma-separated tags input.
  const tagsInput = modal.querySelector<HTMLInputElement>(
    '[data-field="tags"]',
  )!;
  // Phase 178 — vision-modes list + add button.
  const visionListEl = modal.querySelector<HTMLDivElement>(
    '[data-field="vision-mode-list"]',
  )!;
  const visionAddBtn = modal.querySelector<HTMLButtonElement>(
    '[data-action="add-vision-mode"]',
  )!;
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
  // Phase 139 — aura section.
  // Phase 151 — list-row aura UI (replaces the Phase 139 single-
  // aura section).
  const auraListEl = modal.querySelector<HTMLDivElement>(
    '[data-field="aura-list"]',
  )!;
  const auraAddBtn = modal.querySelector<HTMLButtonElement>(
    '[data-action="add-aura"]',
  )!;
  // Phase 159 — preset picker. Populated once at mount with the
  // canonical AURA_PRESETS list; selection immediately stamps a
  // fresh aura via `instantiateAuraPreset` and resets the select
  // to the placeholder option.
  const auraPresetSelect = modal.querySelector<HTMLSelectElement>(
    '[data-field="aura-preset-select"]',
  )!;
  for (const preset of AURA_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = `${preset.label} (${preset.radiusFeet} ft)`;
    auraPresetSelect.appendChild(opt);
  }
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
  // Phase 149 — movement speed input.
  const speedFtInput = modal.querySelector<HTMLInputElement>('[data-field="speedFt"]')!;
  // Phase 154 — drag-lock checkbox.
  const lockedInput = modal.querySelector<HTMLInputElement>('[data-field="locked"]')!;
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
    syncAuraUI(token.auras);
    syncConditionUI(token.conditions, token.conditionExpirations);
    syncRotationUI(token.rotation);
    syncInitiativeModUI(token.initiativeMod);
    // Phase 149 — sync the speed input.
    speedFtInput.value = String(token.speedFt);
    // Phase 154 — sync the lock checkbox. Optional field; missing
    // is treated as unlocked.
    lockedInput.checked = token.locked === true;
    // Phase 162 — sync the notes textarea. Optional field; missing
    // collapses to an empty string for the form control.
    notesInput.value = token.notes ?? '';
    // Phase 177 — sync the tags input as a comma-separated string.
    tagsInput.value = (token.tags ?? []).join(', ');
    // Phase 178 — render vision modes.
    syncVisionModesUI(token.visionModes ?? []);
    syncVisibilityUI(token.id);
    syncOwnerUI(token.ownerId);
    syncParentUI(token);
    syncCounter();
  }

  /**
   * Phase 156 — populate the "Carried by" dropdown with all other
   * tokens that wouldn't create a parent-child cycle. The current
   * token's own descendants are filtered out so the GM can't make
   * a closed loop. Selected value mirrors `token.parentId`.
   */
  function syncParentUI(token: Token): void {
    const state = store.getState();
    parentSelect.replaceChildren();
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— None —';
    parentSelect.appendChild(noneOpt);
    const descendants = new Set<string>(descendantsOf(state.tokens, token.id));
    for (const t of state.tokens) {
      if (t.id === token.id) continue;
      if (descendants.has(t.id)) continue;
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label || t.id;
      parentSelect.appendChild(opt);
    }
    parentSelect.value = token.parentId ?? '';
  }

  /**
   * Phase 109 — populate the per-Spectator visibility checkboxes.
   * One row per currently-connected Spectator; checked = visible to
   * that Spectator. Hidden entirely when the host didn't supply the
   * permissions callbacks (Spectator-side / minimal test mounts).
   */
  function syncVisibilityUI(tokenId: string): void {
    const getSpecs = opts.getConnectedSpectators;
    const isHidden = opts.isTokenHiddenForSpectator;
    const setHidden = opts.setTokenHiddenForSpectator;
    if (!getSpecs || !isHidden || !setHidden) {
      visibilityFieldset.hidden = true;
      return;
    }
    visibilityFieldset.hidden = false;
    const spectators = getSpecs();
    visibilityList.replaceChildren();
    if (spectators.length === 0) {
      visibilityEmpty.hidden = false;
      return;
    }
    visibilityEmpty.hidden = true;
    for (const spec of spectators) {
      const row = document.createElement('label');
      row.className = 'visibility-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !isHidden(spec.id, tokenId);
      cb.dataset.spectatorId = spec.id;
      cb.addEventListener('change', () => {
        setHidden(spec.id, tokenId, !cb.checked);
      });
      const swatch = document.createElement('span');
      swatch.className = 'visibility-swatch';
      if (spec.color) swatch.style.background = spec.color;
      const name = document.createElement('span');
      name.className = 'visibility-name';
      name.textContent = spec.name || '(unnamed)';
      row.appendChild(cb);
      row.appendChild(swatch);
      row.appendChild(name);
      visibilityList.appendChild(row);
    }
  }

  function syncInitiativeModUI(mod: number) {
    initiativeModInput.value = String(mod);
  }

  /**
   * Phase 126 — populate the owner select with one option per
   * connected Spectator + the always-present "Unowned" option.
   * Hidden when the host doesn't supply `getConnectedSpectators`
   * (Spectator-side / minimal test mounts).
   *
   * If the current owner is a player who's no longer connected, we
   * still show their id as a "(disconnected)" option so the GM can
   * see + clear it instead of having the dropdown silently snap
   * back to "Unowned" on next render.
   */
  function syncOwnerUI(currentOwnerId: ID | null): void {
    const getSpecs = opts.getConnectedSpectators;
    if (!getSpecs) {
      ownerFieldset.hidden = true;
      return;
    }
    ownerFieldset.hidden = false;
    const specs = getSpecs();
    // Rebuild options from scratch — connected list can change between
    // openings of the editor.
    ownerSelect.replaceChildren();
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'Unowned (GM-controlled)';
    ownerSelect.appendChild(noneOpt);
    for (const spec of specs) {
      const opt = document.createElement('option');
      opt.value = spec.id;
      opt.textContent = spec.name || '(unnamed)';
      ownerSelect.appendChild(opt);
    }
    // If the owner isn't in the connected list, append a placeholder
    // so the dropdown can still display + clear it.
    if (
      currentOwnerId &&
      !specs.some((s) => s.id === currentOwnerId)
    ) {
      const opt = document.createElement('option');
      opt.value = currentOwnerId;
      opt.textContent = '(disconnected)';
      ownerSelect.appendChild(opt);
    }
    ownerSelect.value = currentOwnerId ?? '';
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

  // Phase 151 — render N rows for the token's auras. Each row
  // edits an entry in-place; "+ Add aura" appends a new entry.
  // Each row's "× Remove" button drops the entry by id.
  function syncAuraUI(auras: readonly Aura[]) {
    auraListEl.replaceChildren();
    if (auras.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'aura-empty';
      empty.textContent = 'No auras. Click "+ Add aura" to start.';
      auraListEl.appendChild(empty);
      return;
    }
    for (const aura of auras) {
      const row = document.createElement('div');
      row.className = 'aura-row';
      row.dataset.auraId = aura.id;

      const swatch = document.createElement('span');
      swatch.className = 'aura-row-swatch';
      swatch.style.background = aura.color;
      row.appendChild(swatch);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.maxLength = 24;
      labelInput.placeholder = 'Label';
      labelInput.value = aura.label ?? '';
      labelInput.className = 'aura-row-label';
      labelInput.addEventListener('change', () => {
        commitAuraEdit(aura.id, {
          label: labelInput.value.trim() || undefined,
        });
      });
      row.appendChild(labelInput);

      const radiusInput = document.createElement('input');
      radiusInput.type = 'number';
      radiusInput.step = '5';
      radiusInput.min = '5';
      radiusInput.max = '240';
      radiusInput.value = String(radiusPxToFeet(aura.radius));
      radiusInput.className = 'aura-row-radius';
      radiusInput.title = 'Radius (ft)';
      radiusInput.addEventListener('change', () => {
        const ft = parseInt(radiusInput.value, 10);
        if (!Number.isFinite(ft) || ft <= 0) {
          radiusInput.value = String(radiusPxToFeet(aura.radius));
          return;
        }
        commitAuraEdit(aura.id, { radius: radiusFeetToPx(ft) });
      });
      row.appendChild(radiusInput);

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = aura.color;
      colorInput.className = 'aura-row-color';
      colorInput.title = 'Aura color';
      colorInput.addEventListener('change', () => {
        commitAuraEdit(aura.id, { color: colorInput.value });
      });
      row.appendChild(colorInput);

      const gmOnlyLabel = document.createElement('label');
      gmOnlyLabel.className = 'aura-row-gm-only';
      gmOnlyLabel.title = 'GM-only — hide from Spectator';
      const gmOnlyInput = document.createElement('input');
      gmOnlyInput.type = 'checkbox';
      gmOnlyInput.checked = aura.visibility === 'gm';
      gmOnlyInput.addEventListener('change', () => {
        commitAuraEdit(aura.id, {
          visibility: gmOnlyInput.checked ? 'gm' : 'shared',
        });
      });
      gmOnlyLabel.appendChild(gmOnlyInput);
      const gmOnlyText = document.createElement('span');
      gmOnlyText.textContent = 'GM';
      gmOnlyLabel.appendChild(gmOnlyText);
      row.appendChild(gmOnlyLabel);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'aura-row-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove this aura';
      removeBtn.setAttribute('aria-label', 'Remove aura');
      removeBtn.addEventListener('click', () => {
        const tok = currentToken();
        if (!tok) return;
        update({ auras: tok.auras.filter((a) => a.id !== aura.id) });
        // sync runs via the host's onAfterChange → re-fetch token + re-sync.
        const after = currentToken();
        if (after) syncAuraUI(after.auras);
      });
      row.appendChild(removeBtn);

      auraListEl.appendChild(row);
    }
  }

  /**
   * Phase 151 — apply a partial change to a single aura by id.
   * `label: undefined` clears the field (matches the Aura type's
   * optional-label semantics); other partials replace.
   */
  function commitAuraEdit(auraId: ID, changes: Partial<Aura>) {
    const tok = currentToken();
    if (!tok) return;
    const next: Aura[] = tok.auras.map((a) => {
      if (a.id !== auraId) return a;
      const merged: Aura = { ...a, ...changes };
      // Special-case: an explicit `label: undefined` from the
      // editor means "clear the field" — strip the property.
      if (Object.prototype.hasOwnProperty.call(changes, 'label')) {
        if (changes.label === undefined) {
          delete (merged as { label?: string }).label;
        }
      }
      return merged;
    });
    update({ auras: next });
    syncAuraUI(next);
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

  // Phase 151 — "+ Add aura" appends a default-styled entry. Each
  // existing row's commit / remove is wired inside `syncAuraUI`.
  auraAddBtn.addEventListener('click', () => {
    const tok = currentToken();
    if (!tok) return;
    const aura: Aura = {
      id: nanoNid(),
      radius: radiusFeetToPx(10),
      color: '#7e57c2',
      visibility: 'shared',
    };
    const auras = [...tok.auras, aura];
    update({ auras });
    syncAuraUI(auras);
  });

  // Phase 159 — preset picker. Selecting an option stamps a fresh
  // aura with the preset's defaults (radius / color / label /
  // visibility) and immediately resets the select to the
  // placeholder so the GM can stamp the same preset twice in a row.
  auraPresetSelect.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    const presetId = auraPresetSelect.value;
    auraPresetSelect.value = '';
    if (!presetId) return;
    const preset = AURA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const aura = instantiateAuraPreset(
      preset,
      currentFeetPerSquare(),
      currentCellSize(),
    );
    const auras = [...tok.auras, aura];
    update({ auras });
    syncAuraUI(auras);
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

  // Phase 149 — movement speed listener. Clamp to [0, 240] (the
  // editor input also has min/max attrs, but parsed value can be
  // negative if the user types one in).
  function commitSpeedFt() {
    const tok = currentToken();
    if (!tok) return;
    const n = parseInt(speedFtInput.value, 10);
    if (!Number.isFinite(n)) {
      speedFtInput.value = String(tok.speedFt);
      return;
    }
    const clamped = Math.max(0, Math.min(240, n));
    if (clamped !== tok.speedFt) update({ speedFt: clamped });
    speedFtInput.value = String(clamped);
  }
  speedFtInput.addEventListener('change', commitSpeedFt);
  speedFtInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitSpeedFt();
      e.preventDefault();
    }
  });

  // Phase 154 — lock checkbox. Stored as `true` only; the optional
  // field's "absent" state is unlocked, so we patch with `undefined`
  // when the user unchecks (the deserializer collapses both
  // `false` and `undefined` to the no-lock state).
  lockedInput.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    const next = lockedInput.checked ? true : undefined;
    if ((tok.locked === true) === lockedInput.checked) return;
    update({ locked: next });
  });

  // Phase 162 — notes textarea. Empty string collapses to undefined
  // so the in-memory shape matches the optional Token.notes type.
  // Commits on blur (instead of every keystroke) to avoid a patch
  // per character.
  notesInput.addEventListener('blur', () => {
    const tok = currentToken();
    if (!tok) return;
    const trimmed = notesInput.value;
    const next = trimmed.length > 0 ? trimmed : undefined;
    const current = tok.notes ?? undefined;
    if (next === current) return;
    update({ notes: next });
  });

  /**
   * Phase 178 — render the vision-modes list + wire per-row
   * commit / remove. Each row is a kind dropdown + a feet
   * input + a remove button. Add via the "+ Add vision" button
   * appends a default `darkvision 60 ft`.
   */
  function syncVisionModesUI(modes: readonly VisionMode[]): void {
    visionListEl.replaceChildren();
    if (modes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'vision-mode-empty settings-hint';
      empty.textContent = 'No vision modes. Click "+ Add vision" to start.';
      visionListEl.appendChild(empty);
      return;
    }
    modes.forEach((mode, idx) => {
      const row = document.createElement('div');
      row.className = 'vision-mode-row';

      const kindSelect = document.createElement('select');
      kindSelect.className = 'vision-mode-kind';
      const kinds: Array<{ id: VisionModeKind; label: string }> = [
        { id: 'darkvision', label: 'Darkvision' },
        { id: 'blindsight', label: 'Blindsight' },
        { id: 'tremorsense', label: 'Tremorsense' },
        { id: 'truesight', label: 'Truesight' },
      ];
      for (const k of kinds) {
        const opt = document.createElement('option');
        opt.value = k.id;
        opt.textContent = k.label;
        if (k.id === mode.kind) opt.selected = true;
        kindSelect.appendChild(opt);
      }
      kindSelect.addEventListener('change', () => {
        commitVisionMode(idx, {
          kind: kindSelect.value as VisionModeKind,
          radiusFt: mode.radiusFt,
        });
      });

      const radiusInput = document.createElement('input');
      radiusInput.type = 'number';
      radiusInput.min = '5';
      radiusInput.max = '240';
      radiusInput.step = '5';
      radiusInput.value = String(mode.radiusFt);
      radiusInput.className = 'vision-mode-radius';
      radiusInput.title = 'Radius in feet';
      radiusInput.addEventListener('change', () => {
        const ft = parseInt(radiusInput.value, 10);
        if (!Number.isFinite(ft) || ft <= 0) {
          radiusInput.value = String(mode.radiusFt);
          return;
        }
        commitVisionMode(idx, {
          kind: mode.kind,
          radiusFt: Math.max(0, ft),
        });
      });

      const ftLabel = document.createElement('span');
      ftLabel.className = 'vision-mode-ft-label';
      ftLabel.textContent = 'ft';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'vision-mode-remove';
      removeBtn.title = 'Remove this vision mode';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => removeVisionMode(idx));

      row.appendChild(kindSelect);
      row.appendChild(radiusInput);
      row.appendChild(ftLabel);
      row.appendChild(removeBtn);
      visionListEl.appendChild(row);
    });
  }

  function commitVisionMode(index: number, next: VisionMode): void {
    const tok = currentToken();
    if (!tok) return;
    const modes = (tok.visionModes ?? []).slice();
    if (index < 0 || index >= modes.length) return;
    modes[index] = next;
    update({ visionModes: modes });
    syncVisionModesUI(modes);
  }

  function removeVisionMode(index: number): void {
    const tok = currentToken();
    if (!tok) return;
    const modes = (tok.visionModes ?? []).slice();
    if (index < 0 || index >= modes.length) return;
    modes.splice(index, 1);
    update({ visionModes: modes.length > 0 ? modes : undefined });
    syncVisionModesUI(modes);
  }

  visionAddBtn.addEventListener('click', () => {
    const tok = currentToken();
    if (!tok) return;
    const modes = (tok.visionModes ?? []).slice();
    modes.push({ kind: 'darkvision', radiusFt: 60 });
    update({ visionModes: modes });
    syncVisionModesUI(modes);
  });

  // Phase 177 — tags input. Commits on blur. Splits the comma-
  // separated string into normalized lowercase tags (trim + dedup
  // + drop empties + cap at 16). Empty list collapses to
  // undefined so the in-memory shape matches the optional type.
  tagsInput.addEventListener('blur', () => {
    const tok = currentToken();
    if (!tok) return;
    const raw = tagsInput.value.split(',');
    const seen = new Set<string>();
    const next: string[] = [];
    for (const piece of raw) {
      const tag = piece.trim().toLowerCase();
      if (tag.length === 0) continue;
      if (seen.has(tag)) continue;
      seen.add(tag);
      next.push(tag);
      if (next.length >= 16) break;
    }
    const newTags = next.length > 0 ? next : undefined;
    const cur = tok.tags ?? undefined;
    // Same-array fast-path so a no-op blur doesn't fire a patch.
    if (
      newTags === cur ||
      (newTags &&
        cur &&
        newTags.length === cur.length &&
        newTags.every((t, i) => t === cur[i]))
    ) {
      // Re-canonicalize the visible input value so a malformed
      // typed string ("goblin, GOBLIN, ") shows the cleaned form.
      tagsInput.value = (newTags ?? []).join(', ');
      return;
    }
    update({ tags: newTags });
    tagsInput.value = (newTags ?? []).join(', ');
  });

  // Phase 126 — owner change. Empty value collapses to null
  // (the "Unowned" option). Idempotent on no-op selections.
  ownerSelect.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    const next = ownerSelect.value || null;
    if (next === tok.ownerId) return;
    update({ ownerId: next });
  });

  // Phase 156 — parent ("Carried by") change. Empty collapses to
  // undefined (no parent — matches the deserializer's in-memory
  // shape). The dropdown is already filtered to exclude the
  // token's own descendants, so cycle-creating values can't be
  // selected.
  parentSelect.addEventListener('change', () => {
    const tok = currentToken();
    if (!tok) return;
    const next = parentSelect.value || undefined;
    const current = tok.parentId ?? undefined;
    if (next === current) return;
    update({ parentId: next });
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
