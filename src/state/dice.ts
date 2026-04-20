/**
 * Dice expression parser + roller.
 *
 * Supports:
 *   1d20           — one 20-sided die
 *   2d6            — two 6-sided dice, summed
 *   1d20+5         — with a flat modifier
 *   2d6-1          — negative modifier
 *   4d6kh3         — keep highest 3 of 4 (classic stat-rolling)
 *   4d6kl3         — keep lowest 3 of 4
 *   2d20kh1        — advantage (roll 2d20, keep highest)
 *   2d20kl1        — disadvantage
 *   1d20+1d4+5     — sum of multiple groups
 *   -1d4           — leading negative group (subtract the result)
 *
 * Dice count and sides are integers in [1, 9999]. Modifier is any signed
 * integer. Whitespace is ignored. Parser is case-insensitive.
 */

export interface DiceGroup {
  /** Number of dice rolled. Always positive after parsing. */
  count: number;
  /** Sides per die. Positive. */
  sides: number;
  /**
   * Sign of this group's contribution to the total. `+1` or `-1`.
   * A plain `2d6` has sign `+1`; a `-1d4` (or `-2d8` after a minus)
   * has sign `-1`. The flat modifier is a separate field.
   */
  sign: 1 | -1;
  /** If set, keep only this many dice (highest or lowest). */
  keep?: { n: number; mode: 'highest' | 'lowest' };
}

export interface DiceExpression {
  source: string;
  groups: DiceGroup[];
  /** Signed flat modifier summed into the total. */
  modifier: number;
}

export class DiceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceParseError';
  }
}

/**
 * Parse a dice expression. Throws `DiceParseError` on any syntactic
 * problem. The returned object is a pure description — nothing has
 * been rolled yet.
 */
export function parseDiceExpression(input: string): DiceExpression {
  const src = input.trim();
  if (!src) throw new DiceParseError('Expression is empty.');
  const lower = src.toLowerCase().replace(/\s+/g, '');

  const groups: DiceGroup[] = [];
  let modifier = 0;
  // Running sign — flipped by each leading `-`, reset by `+`.
  let sign: 1 | -1 = 1;
  let i = 0;

  if (lower[0] === '+') i++;
  else if (lower[0] === '-') {
    sign = -1;
    i++;
  }

  while (i < lower.length) {
    // Read a number.
    const numStart = i;
    while (i < lower.length && /[0-9]/.test(lower[i]!)) i++;
    const numStr = lower.slice(numStart, i);
    if (numStr.length === 0) {
      throw new DiceParseError(`Expected a number at position ${numStart + 1}.`);
    }
    const first = parseInt(numStr, 10);

    if (lower[i] === 'd') {
      // Dice group: <count>d<sides>[kh<n>|kl<n>]
      i++;
      const sidesStart = i;
      while (i < lower.length && /[0-9]/.test(lower[i]!)) i++;
      const sidesStr = lower.slice(sidesStart, i);
      if (!sidesStr) {
        throw new DiceParseError(`Expected die sides after 'd' at position ${sidesStart + 1}.`);
      }
      const sides = parseInt(sidesStr, 10);
      if (sides < 1 || sides > 9999) {
        throw new DiceParseError(`Die sides must be 1–9999 (got ${sides}).`);
      }
      if (first < 1 || first > 9999) {
        throw new DiceParseError(`Die count must be 1–9999 (got ${first}).`);
      }

      let keep: DiceGroup['keep'] | undefined;
      if (lower[i] === 'k') {
        const mode = lower[i + 1];
        if (mode !== 'h' && mode !== 'l') {
          throw new DiceParseError(`Expected 'kh' or 'kl' at position ${i + 1}.`);
        }
        i += 2;
        const kStart = i;
        while (i < lower.length && /[0-9]/.test(lower[i]!)) i++;
        const kStr = lower.slice(kStart, i);
        if (!kStr) throw new DiceParseError(`Expected keep count after 'k${mode}' at position ${kStart + 1}.`);
        const kn = parseInt(kStr, 10);
        if (kn < 1) throw new DiceParseError(`Keep count must be >=1 (got ${kn}).`);
        if (kn > first) throw new DiceParseError(`Cannot keep ${kn} of only ${first} dice.`);
        keep = { n: kn, mode: mode === 'h' ? 'highest' : 'lowest' };
      }

      groups.push({ count: first, sides, sign, ...(keep ? { keep } : {}) });
    } else {
      // Flat modifier.
      modifier += sign * first;
    }

    // Next term?
    if (i >= lower.length) break;
    const next = lower[i];
    if (next === '+') {
      sign = 1;
      i++;
    } else if (next === '-') {
      sign = -1;
      i++;
    } else {
      throw new DiceParseError(
        `Unexpected character '${lower[i]}' at position ${i + 1}.`,
      );
    }
  }

  if (groups.length === 0) {
    // A bare modifier ("5") is not a dice expression.
    throw new DiceParseError('Expression must contain at least one die group (e.g. 1d20).');
  }

  return { source: src, groups, modifier };
}

export interface DiceRollResult {
  source: string;
  /** Per-group roll breakdown, in the order groups appear in the source. */
  groups: Array<{
    count: number;
    sides: number;
    sign: 1 | -1;
    /** Every face rolled, in roll order. Never mutated by `keep`. */
    rolls: number[];
    /** For each roll, whether it counted toward the sum (after keep). */
    kept: boolean[];
    /** Sum after keep + sign. */
    subtotal: number;
  }>;
  modifier: number;
  total: number;
}

export type Rng = () => number;

/** Roll one die with `sides` faces. Inclusive of both ends. */
function rollOne(sides: number, rng: Rng): number {
  // Math.random returns [0, 1); Math.floor + scaling gives us an int in
  // [1, sides]. Non-integer sides is rejected by the parser, so we can
  // trust `sides` here.
  return Math.floor(rng() * sides) + 1;
}

/**
 * Execute the given expression, returning a breakdown + total. Inject
 * `rng` to make the roll deterministic in tests.
 */
export function rollDice(
  expr: DiceExpression,
  rng: Rng = Math.random,
): DiceRollResult {
  const groups: DiceRollResult['groups'] = [];
  let total = 0;
  for (const g of expr.groups) {
    const rolls: number[] = [];
    for (let i = 0; i < g.count; i++) rolls.push(rollOne(g.sides, rng));
    const kept: boolean[] = new Array(rolls.length).fill(true);
    if (g.keep) {
      const { n, mode } = g.keep;
      // Identify indices to keep: sort a copy of indices by roll value.
      const indices = rolls.map((_, idx) => idx);
      indices.sort((a, b) =>
        mode === 'highest' ? rolls[b]! - rolls[a]! : rolls[a]! - rolls[b]!,
      );
      const keepSet = new Set(indices.slice(0, n));
      for (let i = 0; i < rolls.length; i++) kept[i] = keepSet.has(i);
    }
    let sum = 0;
    for (let i = 0; i < rolls.length; i++) if (kept[i]) sum += rolls[i]!;
    const subtotal = g.sign * sum;
    groups.push({
      count: g.count,
      sides: g.sides,
      sign: g.sign,
      rolls,
      kept,
      subtotal,
    });
    total += subtotal;
  }
  total += expr.modifier;
  return { source: expr.source, groups, modifier: expr.modifier, total };
}

/**
 * Short textual breakdown of a roll result, e.g.
 *   "d20+5 → [15]+5 = 20"
 *   "4d6kh3 → [5, 6, 4, ~2~] = 15"  (~n~ = dropped)
 */
export function formatRoll(result: DiceRollResult): string {
  const parts: string[] = [];
  for (let gi = 0; gi < result.groups.length; gi++) {
    const g = result.groups[gi]!;
    const signPrefix = g.sign === -1 ? '−' : gi === 0 ? '' : '+';
    const rollText = g.rolls
      .map((r, i) => (g.kept[i] ? String(r) : `~${r}~`))
      .join(', ');
    parts.push(`${signPrefix}[${rollText}]`);
  }
  if (result.modifier !== 0) {
    parts.push((result.modifier > 0 ? '+' : '−') + String(Math.abs(result.modifier)));
  }
  return `${parts.join(' ')} = ${result.total}`;
}
