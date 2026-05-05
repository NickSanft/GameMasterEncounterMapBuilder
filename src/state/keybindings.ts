/**
 * Phase 153 — customizable tool-activation keybindings.
 *
 * The GM keydown handler historically had a hardcoded `case 's':
 * setActive('select'); case 't': setActive('token'); ...` switch.
 * Phase 153 makes those tool-activation keys runtime-configurable
 * via `preferences.keybindings: Record<string, string>` (action id
 * → key string).
 *
 * Scope is INTENTIONALLY narrow: only the 11 tool-activation
 * shortcuts (S/T/R/H/M/N/L/Y/K/W/P) are remappable. Modifier-key
 * combos (Ctrl+Z undo, Ctrl+C copy, Tab focus-cycle, etc.) stay
 * hardcoded — those are too tangled with other browser / OS
 * conventions to safely expose as freely-rebindable.
 *
 * Pure helper — no DOM. The Settings UI calls these to display +
 * mutate prefs; the gm.ts keydown handler calls `lookupTool(key,
 * prefs)` to dispatch.
 */

export interface KeybindingAction {
  /** Stable id, persisted in prefs. */
  id: string;
  /** Default key (lowercased single char). */
  defaultKey: string;
  /** Human-readable label for the Settings UI. */
  label: string;
  /** The tool id this action activates via toolManager.setActive. */
  toolId: string;
}

/**
 * Canonical tool-activation actions in display order. Phase 153
 * exposes ONLY these for rebinding; other keys (Tab, Esc, Ctrl+Z,
 * etc.) stay hardcoded for safety.
 */
export const TOOL_KEYBINDING_ACTIONS: readonly KeybindingAction[] = [
  { id: 'tool-select', defaultKey: 's', label: 'Select tool', toolId: 'select' },
  { id: 'tool-token', defaultKey: 't', label: 'Token tool', toolId: 'token' },
  { id: 'tool-fog-reveal', defaultKey: 'r', label: 'Reveal fog', toolId: 'fog-reveal' },
  { id: 'tool-fog-hide', defaultKey: 'h', label: 'Hide fog', toolId: 'fog-hide' },
  { id: 'tool-background', defaultKey: 'm', label: 'Map / background tool', toolId: 'background' },
  { id: 'tool-note', defaultKey: 'n', label: 'Note tool', toolId: 'note' },
  { id: 'tool-measure', defaultKey: 'l', label: 'Ruler / measure', toolId: 'measure' },
  { id: 'tool-aoe', defaultKey: 'y', label: 'AoE template tool', toolId: 'aoe' },
  { id: 'tool-draw', defaultKey: 'k', label: 'Draw / ink tool', toolId: 'draw' },
  { id: 'tool-walls', defaultKey: 'w', label: 'Walls tool', toolId: 'walls' },
  { id: 'tool-tile-paint', defaultKey: 'p', label: 'Tile-paint tool', toolId: 'tile-paint' },
  { id: 'tool-travel', defaultKey: 'g', label: 'Travel route tool', toolId: 'travel' },
];

/**
 * Look up the user's current key for a given action id. Returns the
 * default if no override exists or the override is malformed.
 */
export function getEffectiveKey(
  actionId: string,
  bindings: Readonly<Record<string, string>>,
): string {
  const action = TOOL_KEYBINDING_ACTIONS.find((a) => a.id === actionId);
  if (!action) return '';
  const override = bindings[actionId];
  if (
    typeof override === 'string' &&
    override.length === 1 &&
    /[a-z0-9]/i.test(override)
  ) {
    return override.toLowerCase();
  }
  return action.defaultKey;
}

/**
 * Given a pressed key (already lowercased), return the toolId it
 * should activate, or `null` if no action is bound to that key.
 * Walks `TOOL_KEYBINDING_ACTIONS` in display order; first match
 * wins (ties shouldn't happen if Settings UI prevents conflicts,
 * but the deterministic order keeps behavior reasonable even on
 * malformed prefs).
 */
export function lookupTool(
  key: string,
  bindings: Readonly<Record<string, string>>,
): string | null {
  const lowered = key.toLowerCase();
  for (const action of TOOL_KEYBINDING_ACTIONS) {
    if (getEffectiveKey(action.id, bindings) === lowered) {
      return action.toolId;
    }
  }
  return null;
}

/**
 * Validate a candidate key for an action. Returns an error message
 * (string) if the key is invalid or conflicts with another action,
 * or `null` if the key is acceptable.
 */
export function validateKey(
  actionId: string,
  candidateKey: string,
  bindings: Readonly<Record<string, string>>,
): string | null {
  const lowered = candidateKey.toLowerCase();
  if (lowered.length !== 1) return 'Pick a single character.';
  if (!/[a-z0-9]/.test(lowered)) {
    return 'Letters and digits only (no symbols / modifiers).';
  }
  const conflict = TOOL_KEYBINDING_ACTIONS.find(
    (a) => a.id !== actionId && getEffectiveKey(a.id, bindings) === lowered,
  );
  if (conflict) {
    return `"${lowered}" is already bound to ${conflict.label}.`;
  }
  return null;
}

/**
 * Set a single binding override. Returns the next bindings record
 * (does not mutate the input). Empty / invalid candidate clears the
 * override (back to default).
 */
export function setBinding(
  actionId: string,
  candidateKey: string | null,
  bindings: Readonly<Record<string, string>>,
): Record<string, string> {
  const next = { ...bindings };
  if (
    candidateKey === null ||
    candidateKey === '' ||
    typeof candidateKey !== 'string'
  ) {
    delete next[actionId];
    return next;
  }
  next[actionId] = candidateKey.toLowerCase();
  return next;
}
