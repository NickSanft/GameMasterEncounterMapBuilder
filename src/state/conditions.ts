/**
 * The D&D 5e standard conditions plus two common extras (concentrating,
 * bloodied-as-manual-flag) that GMs frequently track on tokens.
 *
 * The `id` is the canonical stored value on `Token.conditions[]`. The
 * `color` drives the small dot rendered above the token. `symbol` is a
 * short glyph used as a fallback when the dot is too small for text.
 */
export interface ConditionPreset {
  id: string;
  label: string;
  color: string;
  /** 1–3 character glyph shown inside the chip at larger token sizes. */
  symbol: string;
  /** Short hover-help string. */
  desc: string;
}

export const CONDITION_PRESETS: readonly ConditionPreset[] = [
  { id: 'blinded',       label: 'Blinded',       color: '#6c757d', symbol: 'B',  desc: "Can't see. Attacks against have advantage; attacks have disadvantage." },
  { id: 'charmed',       label: 'Charmed',       color: '#e83e8c', symbol: 'C',  desc: "Can't attack the charmer; charmer has advantage on social checks." },
  { id: 'concentrating', label: 'Concentrating', color: '#007bff', symbol: 'Co', desc: 'Maintaining a spell that requires concentration.' },
  { id: 'deafened',      label: 'Deafened',      color: '#8a7a6a', symbol: 'D',  desc: "Can't hear and automatically fails ability checks requiring hearing." },
  { id: 'exhaustion',    label: 'Exhaustion',    color: '#4a148c', symbol: 'Ex', desc: 'One or more levels of exhaustion.' },
  { id: 'frightened',    label: 'Frightened',    color: '#ff6d00', symbol: 'F',  desc: "Disadvantage while source is in sight; can't willingly move closer." },
  { id: 'grappled',      label: 'Grappled',      color: '#795548', symbol: 'G',  desc: 'Speed becomes 0; ends when grappler is incapacitated.' },
  { id: 'incapacitated', label: 'Incapacitated', color: '#9e9e9e', symbol: 'I',  desc: "Can't take actions or reactions." },
  { id: 'invisible',     label: 'Invisible',     color: '#03a9f4', symbol: 'Iv', desc: 'Attacks against have disadvantage; attacks have advantage.' },
  { id: 'paralyzed',     label: 'Paralyzed',     color: '#ffeb3b', symbol: 'P',  desc: 'Incapacitated, auto-fails Str/Dex saves, attackers have advantage, crits within 5 ft.' },
  { id: 'petrified',     label: 'Petrified',     color: '#607d8b', symbol: 'Pt', desc: 'Transformed to stone; incapacitated, resistant to all damage.' },
  { id: 'poisoned',      label: 'Poisoned',      color: '#2e7d32', symbol: 'Po', desc: 'Disadvantage on attack rolls and ability checks.' },
  { id: 'prone',         label: 'Prone',         color: '#ff9800', symbol: 'Pr', desc: 'Disadvantage on attacks; attackers within 5 ft have advantage.' },
  { id: 'restrained',    label: 'Restrained',    color: '#5d4037', symbol: 'R',  desc: 'Speed becomes 0; disadvantage on attacks and Dex saves.' },
  { id: 'stunned',       label: 'Stunned',       color: '#fdd835', symbol: 'St', desc: 'Incapacitated; auto-fails Str/Dex saves; attackers have advantage.' },
  { id: 'unconscious',   label: 'Unconscious',   color: '#212121', symbol: 'U',  desc: 'Incapacitated, prone, attackers have advantage, crits within 5 ft.' },
  { id: 'bloodied',      label: 'Bloodied',      color: '#d32f2f', symbol: 'Bl', desc: 'At or below half HP.' },
];

const BY_ID = new Map(CONDITION_PRESETS.map((c) => [c.id, c]));

/** Look up a condition preset by id, or `null` if it's not a known preset. */
export function getConditionPreset(id: string): ConditionPreset | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Return a new `conditions` array with `id` added (dedupes). Caller owns
 * validation — passing an unknown id is allowed so GMs can track custom
 * conditions that aren't in the preset list.
 */
export function addCondition(conditions: readonly string[], id: string): string[] {
  if (conditions.includes(id)) return conditions.slice();
  return [...conditions, id];
}

export function removeCondition(conditions: readonly string[], id: string): string[] {
  const next = conditions.filter((c) => c !== id);
  return next.length === conditions.length ? conditions.slice() : next;
}

export function hasCondition(conditions: readonly string[], id: string): boolean {
  return conditions.includes(id);
}

/**
 * Toggle a condition on/off. Returns the next `conditions` array.
 */
export function toggleCondition(
  conditions: readonly string[],
  id: string,
): string[] {
  return hasCondition(conditions, id)
    ? removeCondition(conditions, id)
    : addCondition(conditions, id);
}

/**
 * Phase 70 — set (or replace) a round-based expiration on a condition.
 * Returns a new `conditionExpirations` record; never mutates. If
 * `expiresAtRound` is `null`, the condition becomes permanent (any
 * existing timer is stripped).
 */
export function setConditionExpiration(
  expirations: Readonly<Record<string, number>>,
  id: string,
  expiresAtRound: number | null,
): Record<string, number> {
  const next = { ...expirations };
  if (expiresAtRound === null || !Number.isFinite(expiresAtRound)) {
    delete next[id];
  } else {
    next[id] = Math.max(1, Math.floor(expiresAtRound));
  }
  return next;
}

/**
 * Phase 70 — remove the expiration entry for `id` if present. Used
 * when a condition is manually cleared so the timer doesn't outlive
 * its condition. Idempotent: returns the same shape even if the id
 * wasn't in the map.
 */
export function clearConditionExpiration(
  expirations: Readonly<Record<string, number>>,
  id: string,
): Record<string, number> {
  if (!(id in expirations)) return { ...expirations };
  const next = { ...expirations };
  delete next[id];
  return next;
}

/**
 * Phase 70 — scan a (conditions, conditionExpirations) pair and strip
 * any condition whose timer is <= `currentRound`. Returns both the
 * filtered conditions list AND the cleaned expirations map (so a
 * stripped condition doesn't leave a stale timer behind for when
 * the GM re-applies it later).
 *
 * Never mutates the inputs. Returns the SAME shape identity-wise
 * when nothing changed, so store reducers can bail on a no-op.
 */
export interface TickConditionsResult {
  conditions: string[];
  conditionExpirations: Record<string, number>;
  /** Ids of the conditions that were stripped this tick. Empty if no-op. */
  removed: string[];
}

export function tickConditions(
  conditions: readonly string[],
  expirations: Readonly<Record<string, number>>,
  currentRound: number,
): TickConditionsResult {
  const removed: string[] = [];
  for (const id of conditions) {
    const expiresAt = expirations[id];
    if (typeof expiresAt === 'number' && currentRound >= expiresAt) {
      removed.push(id);
    }
  }
  if (removed.length === 0) {
    return {
      conditions: conditions.slice(),
      conditionExpirations: { ...expirations },
      removed,
    };
  }
  const removedSet = new Set(removed);
  const nextConditions = conditions.filter((id) => !removedSet.has(id));
  const nextExpirations: Record<string, number> = {};
  for (const [id, round] of Object.entries(expirations)) {
    if (!removedSet.has(id)) nextExpirations[id] = round;
  }
  return {
    conditions: nextConditions,
    conditionExpirations: nextExpirations,
    removed,
  };
}
