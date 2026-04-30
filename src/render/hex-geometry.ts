/**
 * Phase 124 — pointy-top hex grid geometry.
 *
 * Hex grids in this codebase are a COSMETIC OVERLAY in v124: the
 * underlying coordinate system stays rectangular (cellSize ×
 * cellSize), so tokens / walls / fog all continue to operate in the
 * Phase 1 square-grid frame. The hex render layer paints polygons on
 * top so a GM running a hex-rules game has the right visual cue at
 * the table.
 *
 * Pointy-top hex orientation (vertices at top + bottom; flat sides
 * left + right). The hex's "size" is the radius from center to
 * vertex. From that:
 *   - width  = sqrt(3) × size  (flat-side to flat-side)
 *   - height = 2       × size  (vertex to vertex)
 * Standard offset-coordinate layout — odd rows shifted right by
 * half a hex width so adjacent cells tessellate without gaps.
 *
 * The "size" param accepted by these helpers is the underlying
 * `GridConfig.cellSize`. We re-interpret it: in square mode it's
 * the cell's edge length; in hex mode it's HALF the cell's height
 * (i.e. the apothem-equivalent vertex radius). That keeps the same
 * cellSize value visually similar across modes — a 50-px square
 * cell renders ~similar in screen footprint to a 50-px hex.
 *
 * Pure module — no DOM. The render layer reads the pathing helpers.
 */

/** Width of one pointy-top hex (flat side to flat side). */
export function hexWidth(size: number): number {
  return Math.sqrt(3) * size;
}

/** Height of one pointy-top hex (vertex to vertex). */
export function hexHeight(size: number): number {
  return 2 * size;
}

/**
 * Horizontal stride between centers of horizontally-adjacent hexes
 * in the same row. Equals hex width (flat-side tangency).
 */
export function hexHorizontalStride(size: number): number {
  return hexWidth(size);
}

/**
 * Vertical stride between centers of two row centers (same column).
 * Pointy-top hexes overlap vertically by 1/4 of their height so the
 * row stride is 3/4 × height.
 */
export function hexVerticalStride(size: number): number {
  return (3 / 4) * hexHeight(size);
}

/** Center of the hex at offset coords (col, row) in pointy-top layout. */
export function hexCenter(
  col: number,
  row: number,
  size: number,
): { x: number; y: number } {
  const w = hexWidth(size);
  const xOffset = row % 2 === 0 ? 0 : w / 2;
  return {
    x: w / 2 + col * w + xOffset,
    y: size + row * hexVerticalStride(size),
  };
}

/**
 * Six vertices of the hex centered at (cx, cy). Returned in order
 * starting from the top vertex and going clockwise.
 */
export function hexVertices(
  cx: number,
  cy: number,
  size: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top: vertices at 30° + 60°·i (so the top vertex is 90°,
    // i.e. directly above the center).
    const angle = (Math.PI / 180) * (60 * i - 90);
    out.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return out;
}

/**
 * Trace a hex's outline into the given Canvas path. Caller is
 * responsible for `beginPath()` + `stroke()` / `fill()` around it.
 */
export function pathHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const vertices = hexVertices(cx, cy, size);
  ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(vertices[i]!.x, vertices[i]!.y);
  }
  ctx.closePath();
}

/**
 * Phase 129 — convert (col, row) offset coords (pointy-top, odd-r,
 * matching `hexCenter`) to axial (q, r). Used by `hexDistance`
 * which works in axial / cube space.
 */
export function offsetToAxial(col: number, row: number): { q: number; r: number } {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

/**
 * Phase 129 — hex distance between two cells in offset coords. Works
 * by converting both to axial, then to cube (q, r, -q-r), then
 * `(|dq| + |dr| + |ds|) / 2`. Always integer when inputs are integer.
 *
 * Distance of (0,0) → (1,0) = 1; (0,0) → (0,1) = 1 (any neighbor in
 * the 6 hex directions); (0,0) → (2,2) varies based on offset parity
 * but the cube formula handles it uniformly.
 */
export function hexDistance(
  col1: number,
  row1: number,
  col2: number,
  row2: number,
): number {
  const a = offsetToAxial(col1, row1);
  const b = offsetToAxial(col2, row2);
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/**
 * Phase 129 — round fractional axial coords to the nearest integer
 * axial cell using the standard cube-rounding algorithm. Picks the
 * coordinate with the largest rounding error to be the one that
 * gets recomputed from the others — preserves the cube invariant
 * `x + y + z = 0` and gives the correct nearest-hex result near
 * cell boundaries.
 */
function axialRound(qf: number, rf: number): { q: number; r: number } {
  let x = qf;
  let z = rf;
  let y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

/**
 * Phase 129 — inverse of `hexCenter`: convert a world point (x, y) to
 * the (col, row) offset coords of the hex that contains it. Pointy-
 * top, odd-r layout matching `hexCenter`'s placement (hex (0,0)
 * centered at `(hexWidth/2, size)` in world coords).
 */
export function worldToHexCell(
  x: number,
  y: number,
  size: number,
): { col: number; row: number } {
  const w = Math.sqrt(3) * size;
  // Translate so hex(0,0) sits at the world origin (it's currently
  // centered at (w/2, size); shift by the negative of that).
  const tx = x - w / 2;
  const ty = y - size;
  // Pointy-top pixel-to-axial.
  const qf = (Math.sqrt(3) / 3 * tx - 1 / 3 * ty) / size;
  const rf = (2 / 3 * ty) / size;
  const { q, r } = axialRound(qf, rf);
  // `+ 0` normalizes JS's signed-zero so callers don't have to think
  // about `Object.is(-0, 0) === false` when comparing with `toEqual`.
  return { col: q + (r - (r & 1)) / 2 + 0, row: r + 0 };
}
