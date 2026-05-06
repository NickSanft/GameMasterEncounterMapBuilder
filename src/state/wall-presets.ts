/**
 * Phase 117 — wall presets.
 *
 * A wall preset is a named bundle of properties (thickness, sight /
 * movement flags, visibility, optional door state) the GM can apply
 * to one or more selected walls in a single click. Built-ins ship
 * with the app; users can save their own from the wall editor's
 * "Save as preset…" affordance.
 *
 * Presets describe AUTHORING properties only — they don't touch the
 * wall's geometry (the segment endpoints / block cells stay where
 * they are). Apply produces a `WallEditorChange`-shaped diff that
 * the editor's onChange path forwards to the host. Block walls
 * silently ignore `thickness` (blocks don't have one — the region
 * IS the wall material).
 *
 * Storage: localStorage under `gm-encounter-maps-wall-presets` —
 * versioned envelope, defensive parsing, same shape as the other
 * user-data stores (Phase 99 conflict-loser-archive, Phase 102
 * camera bookmarks, etc.). Built-ins live in code, not in storage,
 * so an upgrade can add new built-ins without a migration.
 */

import { nid } from '../util/id.js';

const KEY = 'gm-encounter-maps-wall-presets';
const VERSION = 1;
export const MAX_USER_PRESETS = 20;

export interface WallPreset {
  /** Stable id. Built-ins use a 'b:' prefix; user presets use `nid()`. */
  id: string;
  /** Display label shown on the chip. */
  name: string;
  /** True for ship-with-the-app presets (can't be deleted by the user). */
  isBuiltin: boolean;
  /**
   * Render thickness in screen pixels at zoom = 1. Optional —
   * presets that don't care about thickness omit it. Block walls
   * ignore it; segments use it via the existing thickness slider.
   */
  thickness?: number;
  blocksSight: boolean;
  blocksMovement: boolean;
  visibility?: 'shared' | 'gm';
  /**
   * Phase 113 — when present, the preset promotes the wall to a door
   * with the given open state. Apply to a block wall is a no-op for
   * this field (blocks can't be doors). `null` clears any existing
   * door promotion.
   */
  door?: { open: boolean } | null;
}

/**
 * Built-in presets, in display order. Stable ids so the picker can
 * highlight "the active preset" if the user re-applies one. The
 * names + thickness values are tuned for the default 50 px grid; on
 * a much larger / smaller grid the GM should save their own.
 */
export const BUILTIN_PRESETS: readonly WallPreset[] = [
  {
    id: 'b:stone-exterior',
    name: 'Stone exterior',
    isBuiltin: true,
    thickness: 8,
    blocksSight: true,
    blocksMovement: true,
  },
  {
    id: 'b:interior-divider',
    name: 'Interior divider',
    isBuiltin: true,
    thickness: 3,
    blocksSight: true,
    blocksMovement: true,
  },
  {
    id: 'b:window',
    name: 'Window',
    isBuiltin: true,
    thickness: 2,
    blocksSight: false,
    blocksMovement: true,
  },
  {
    id: 'b:secret-passage',
    name: 'Secret passage',
    isBuiltin: true,
    thickness: 3,
    blocksSight: true,
    blocksMovement: true,
    visibility: 'gm',
  },
  {
    id: 'b:wooden-door-closed',
    name: 'Wooden door (closed)',
    isBuiltin: true,
    thickness: 4,
    blocksSight: true,
    blocksMovement: true,
    door: { open: false },
  },
  {
    id: 'b:remove-door',
    name: 'Remove door',
    isBuiltin: true,
    // Reverts the wall to a plain blocking segment — sight-blocking
    // + movement-blocking. The `door: null` field flows through
    // `presetToChange` and the editor's onChange wrapper translates
    // it into a remove + re-add patch (the door state lives in the
    // wall's `door` field; clearing it requires recreating the wall
    // without the field).
    blocksSight: true,
    blocksMovement: true,
    door: null,
  },
  // Phase 170 — D&D 5e cover terminology presets. Map game-side
  // "what cover does this give?" rules onto the existing
  // sight/movement flags. "Half-cover" and "Window" are mechanically
  // equivalent (sight passes through, movement blocked) but the
  // semantic name matches the SRD vocabulary so 5e-fluent GMs can
  // pick by intent.
  {
    id: 'b:half-cover',
    name: 'Half-cover (low wall)',
    isBuiltin: true,
    thickness: 4,
    blocksSight: false,
    blocksMovement: true,
  },
  {
    id: 'b:three-quarter-cover',
    name: 'Three-quarter cover',
    isBuiltin: true,
    thickness: 3,
    blocksSight: true,
    blocksMovement: true,
  },
  {
    id: 'b:cliff-edge',
    name: 'Cliff edge',
    isBuiltin: true,
    // Edges block movement but you can see across (and shoot
    // across). Rendered thicker than half-cover so the GM can tell
    // a cliff from a low wall at a glance.
    thickness: 6,
    blocksSight: false,
    blocksMovement: true,
  },
];

interface Envelope {
  version: number;
  /** User-saved presets only — built-ins live in code. */
  entries: WallPreset[];
}

function isPreset(v: unknown): v is WallPreset {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return false;
  if (typeof o.blocksSight !== 'boolean') return false;
  if (typeof o.blocksMovement !== 'boolean') return false;
  return true;
}

function read(): Envelope {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: VERSION, entries: [] };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (
      !parsed ||
      parsed.version !== VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return { version: VERSION, entries: [] };
    }
    return {
      version: VERSION,
      entries: parsed.entries
        .filter(isPreset)
        // Force isBuiltin = false for any persisted entry — built-ins
        // live in code; a malformed peer can't promote a user preset.
        .map((p) => ({ ...p, isBuiltin: false })),
    };
  } catch {
    return { version: VERSION, entries: [] };
  }
}

function write(env: Envelope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(env));
  } catch (err) {
    console.warn('[wall-presets] persist failed', err);
  }
}

/**
 * Built-ins + user presets in display order (built-ins first, user
 * presets newest-last so a freshly-saved one appears at the end of
 * the chip strip).
 */
export function listPresets(): WallPreset[] {
  return [...BUILTIN_PRESETS, ...read().entries];
}

/**
 * Save a new user preset. The `id` field is generated; callers
 * supply everything else. Returns the saved preset (with its id).
 * Trims `name` + falls back to "Untitled preset" when empty.
 *
 * Trims to `MAX_USER_PRESETS` (oldest user preset evicted) so the
 * localStorage blob stays bounded.
 */
export function savePreset(
  preset: Omit<WallPreset, 'id' | 'isBuiltin'>,
): WallPreset {
  const trimmed = preset.name.trim();
  const entry: WallPreset = {
    ...preset,
    id: nid(),
    isBuiltin: false,
    name: trimmed || 'Untitled preset',
  };
  const env = read();
  const next = [...env.entries, entry];
  if (next.length > MAX_USER_PRESETS) {
    next.splice(0, next.length - MAX_USER_PRESETS);
  }
  write({ version: VERSION, entries: next });
  return entry;
}

/**
 * Remove a user preset by id. Built-ins are protected — calls with
 * a built-in id are silent no-ops. No-op for unknown ids too.
 */
export function removePreset(id: string): void {
  if (id.startsWith('b:')) return;
  const env = read();
  if (!env.entries.some((p) => p.id === id)) return;
  write({
    version: VERSION,
    entries: env.entries.filter((p) => p.id !== id),
  });
}

/** Test-only: drop every user preset. */
export function _resetUserPresets(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}
