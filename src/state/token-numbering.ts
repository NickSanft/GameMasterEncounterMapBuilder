/**
 * Phase 137 — multi-token auto-numbering.
 *
 * Pure helper. Given the labels of every token currently on the
 * canvas + a candidate `baseLabel` for a new token, returns the
 * label the new token SHOULD use to stay disambiguated.
 *
 * Semantics:
 *   - The "base" of a label is the label itself with any trailing
 *     " <integer>" stripped. Example: "Goblin" → "Goblin"; "Goblin
 *     2" → "Goblin"; "Goblin 12" → "Goblin"; "Goblin 1.5" → "Goblin
 *     1.5" (no integer suffix). Multi-word bases are preserved
 *     ("Cave Goblin 3" → "Cave Goblin").
 *   - Comparison is case-INSENSITIVE so "Goblin" + "GOBLIN" + "goblin"
 *     all share the same base.
 *   - When the candidate's base doesn't match ANY existing token's
 *     base, the candidate label is returned unchanged. (No collision
 *     → no suffix needed.)
 *   - When ≥ 1 existing token shares the base, the helper finds the
 *     max numeric suffix among them (treating a bare base as
 *     suffix 1) and returns `${base} ${max + 1}`. Examples:
 *       - existing: ["Goblin"], candidate "Goblin" → "Goblin 2"
 *       - existing: ["Goblin", "Goblin 2"], candidate "Goblin" → "Goblin 3"
 *       - existing: ["Goblin", "Goblin 5"], candidate "Goblin 3" → "Goblin 6"
 *         (the candidate's own suffix is ignored — we always pick max+1)
 *
 * The helper does NOT mutate; the caller decides whether to use the
 * returned label (typically gated on a `preferences.autoNumberDuplicateTokens`
 * flag).
 */

/**
 * Strip a trailing " <integer>" suffix from a label. Returns `{base,
 * suffix}` where `base` is the label up to (but not including) the
 * trailing space + integer, and `suffix` is that integer (or `null`
 * when there's no integer suffix). Whitespace and case are
 * preserved on the base for display.
 */
function splitLabel(label: string): { base: string; suffix: number | null } {
  const m = label.match(/^(.*?)\s+(\d+)$/);
  if (!m) return { base: label, suffix: null };
  return { base: m[1]!, suffix: Number(m[2]) };
}

/**
 * Return the label the new token should use given the existing
 * canvas labels + a candidate label. Pure; safe to call frequently.
 */
export function nextLabelSuffix(
  existingLabels: readonly string[],
  candidateLabel: string,
): string {
  const candidate = splitLabel(candidateLabel);
  const baseLower = candidate.base.toLowerCase();
  let maxSuffix = 0;
  let anyMatch = false;
  for (const existing of existingLabels) {
    const split = splitLabel(existing);
    if (split.base.toLowerCase() !== baseLower) continue;
    anyMatch = true;
    // Bare base counts as suffix 1 (the implicit first instance).
    const effective = split.suffix ?? 1;
    if (effective > maxSuffix) maxSuffix = effective;
  }
  if (!anyMatch) return candidateLabel;
  return `${candidate.base} ${maxSuffix + 1}`;
}
