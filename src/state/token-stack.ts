import type { ID, Token } from './types.js';

/**
 * Canonical cell key for a token's origin cell. Two tokens "stack" if
 * they share this key — i.e., they have the same integer x/y. Size is
 * ignored: a size-2 and a size-1 at the same origin still count as a
 * stack, but a size-2 and a size-1 that merely *overlap* at some cell
 * do not (intentional; keeps grouping deterministic and cheap).
 */
export function stackKey(x: number, y: number): string {
  return `${x},${y}`;
}

export interface TokenStack {
  key: string;
  x: number;
  y: number;
  /** Tokens in session draw order (first = bottom). */
  tokens: Token[];
}

/**
 * Group every token in `tokens` by its origin cell. Returns a Map keyed
 * by `stackKey(x, y)`; every value has ≥1 token.
 */
export function groupTokensByStack(tokens: readonly Token[]): Map<string, TokenStack> {
  const map = new Map<string, TokenStack>();
  for (const t of tokens) {
    const key = stackKey(t.x, t.y);
    const existing = map.get(key);
    if (existing) {
      existing.tokens.push(t);
    } else {
      map.set(key, { key, x: t.x, y: t.y, tokens: [t] });
    }
  }
  return map;
}

/**
 * Return every token sharing the given origin cell, in draw order
 * (earliest first / bottom of stack). Empty array if no tokens match.
 */
export function tokensInStackAt(
  tokens: readonly Token[],
  x: number,
  y: number,
): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.x === x && t.y === y) out.push(t);
  }
  return out;
}

/**
 * Cycle to the next token below the given `currentId` in its stack.
 * "Next" means the element immediately before `currentId` in draw-order
 * (top → bottom — clicking cycles you *down* through the pile).
 *
 * If `currentId` isn't in the stack, returns the top-most token's id.
 * Returns `null` for empty stacks.
 */
export function cycleStackSelection(
  stack: readonly Token[],
  currentId: ID | null,
): ID | null {
  if (stack.length === 0) return null;
  if (stack.length === 1) return stack[0]!.id;
  const topIdx = stack.length - 1;
  if (currentId === null) return stack[topIdx]!.id;
  const idx = stack.findIndex((t) => t.id === currentId);
  if (idx < 0) return stack[topIdx]!.id;
  // Walk one position toward the bottom, wrapping back to the top when
  // we fall off — so Alt+clicking repeatedly always yields a different
  // token until you cycle all the way around.
  const next = idx === 0 ? topIdx : idx - 1;
  return stack[next]!.id;
}
