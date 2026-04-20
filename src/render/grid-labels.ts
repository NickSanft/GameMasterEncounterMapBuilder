/**
 * Chess-style column-letter helper (1→A, 26→Z, 27→AA, 28→AB, …).
 * Returns the uppercase alphabetic name for a 1-based column index.
 * The helper is pure so we can unit-test every edge in isolation.
 */
export function columnLetter(index1Based: number): string {
  if (!Number.isFinite(index1Based) || index1Based < 1) return '';
  let n = Math.floor(index1Based);
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Row label — just the 1-based number stringified. */
export function rowLabel(index1Based: number): string {
  if (!Number.isFinite(index1Based) || index1Based < 1) return '';
  return String(Math.floor(index1Based));
}

/**
 * Full cell name e.g. (0,0) → "A1", (3,2) → "D3", (26,9) → "AA10".
 * `col` / `row` are 0-based — matches how the grid is stored.
 */
export function cellName(col: number, row: number): string {
  return `${columnLetter(col + 1)}${rowLabel(row + 1)}`;
}
