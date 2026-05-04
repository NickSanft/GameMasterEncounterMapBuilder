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

/**
 * Phase 133 — inverse of `offsetToAxial`. Convert axial (q, r) back
 * to (col, row) offset coords for the same odd-r layout that
 * `hexCenter` paints.
 */
export function axialToOffset(q: number, r: number): { col: number; row: number } {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

/**
 * Phase 133 — return every hex within hex distance `radius` of the
 * one at offset coords (centerCol, centerRow), clamped to the grid
 * bounds. `radius = 0` returns just the center hex; `radius = 1`
 * returns center + the 6 immediate neighbors (7 total); `radius = 2`
 * returns 19 hexes; in general `1 + 3 * radius * (radius + 1)` for
 * an unbounded grid.
 *
 * Iterates in cube space (the standard `q in [-N, N]` × `r in
 * [max(-N, -q-N), min(N, -q+N)]` range bounds the hex disk). Converts
 * back to offset for the caller. Out-of-bounds cells are filtered;
 * a Set dedupes (defensive — the cube enumeration shouldn't produce
 * dupes, but the offset round-trip is parity-aware so the safety
 * net is cheap).
 */
export function hexNeighbors(
  centerCol: number,
  centerRow: number,
  radius: number,
  gridCols: number,
  gridRows: number,
): Array<{ col: number; row: number }> {
  if (!Number.isFinite(radius) || radius < 0) return [];
  const r0 = Math.floor(radius);
  const center = offsetToAxial(centerCol, centerRow);
  const out: Array<{ col: number; row: number }> = [];
  const seen = new Set<string>();
  for (let dq = -r0; dq <= r0; dq++) {
    const minDr = Math.max(-r0, -dq - r0);
    const maxDr = Math.min(r0, -dq + r0);
    for (let dr = minDr; dr <= maxDr; dr++) {
      const offset = axialToOffset(center.q + dq, center.r + dr);
      if (
        offset.col < 0 ||
        offset.row < 0 ||
        offset.col >= gridCols ||
        offset.row >= gridRows
      ) {
        continue;
      }
      const key = `${offset.col},${offset.row}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(offset);
    }
  }
  return out;
}

/**
 * Phase 134 — return every hex in the inclusive offset-coord
 * rectangle from (c1, r1) to (c2, r2), clamped to grid bounds.
 * Order is row-major (rows then cols). Used by the fog rectangle
 * tool's hex branch: a drag from corner to corner selects every
 * hex in the rectangular range, then each hex's overlapping rect
 * cells are unioned.
 *
 * The helper is symmetric in its corner args — `hexesInRect(2, 3, 5,
 * 7)` returns the same set as `hexesInRect(5, 7, 2, 3)`. Out-of-
 * bounds args are clamped via the grid-size args; a fully out-of-
 * bounds rect returns an empty list.
 */
export function hexesInRect(
  c1: number,
  r1: number,
  c2: number,
  r2: number,
  gridCols: number,
  gridRows: number,
): Array<{ col: number; row: number }> {
  const minCol = Math.max(0, Math.min(c1, c2));
  const maxCol = Math.min(gridCols - 1, Math.max(c1, c2));
  const minRow = Math.max(0, Math.min(r1, r2));
  const maxRow = Math.min(gridRows - 1, Math.max(r1, r2));
  if (minCol > maxCol || minRow > maxRow) return [];
  const out: Array<{ col: number; row: number }> = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      out.push({ col, row });
    }
  }
  return out;
}

/**
 * Phase 132 — point-in-hex test. Returns true when (px, py) is
 * inside (or on the boundary of) the hex centered at (cx, cy) with
 * vertex-radius `size`. Uses the standard ray-cast even-odd rule on
 * the 6-vertex polygon. Bounding-circle prefilter rejects far-away
 * points cheaply.
 */
export function pointInHex(
  cx: number,
  cy: number,
  size: number,
  px: number,
  py: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  if (dx * dx + dy * dy > size * size) return false;
  const verts = hexVertices(cx, cy, size);
  let inside = false;
  for (let i = 0, j = 5; i < 6; j = i++) {
    const xi = verts[i]!.x;
    const yi = verts[i]!.y;
    const xj = verts[j]!.x;
    const yj = verts[j]!.y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Phase 132 — return the rectangular cells whose centers fall inside
 * the hex at offset coords (col, row). Used by the fog tool's hex
 * mode: each user-targeted hex flips every rect fog cell its
 * polygon overlaps, so the fog buffer (which stays rectangular for
 * back-compat) reflects the visual hex grid.
 *
 * Iterates the AABB of the hex's bounding circle (≤ 4 rect cells
 * for a same-size hex / rect cellSize), then point-in-hex tests each.
 * Always returns at least 1 cell — the rect cell containing the hex
 * center is in the AABB and almost always passes the point-in-hex
 * test (size = vertex radius matches cell size by convention so the
 * hex straddles ~3-4 rect cells).
 */
export function rectCellsOverlappingHex(
  col: number,
  row: number,
  gridCols: number,
  gridRows: number,
  size: number,
): Array<{ x: number; y: number }> {
  const center = hexCenter(col, row, size);
  // Bounding rect — the hex spans cellSize-many pixels in each
  // direction (radius `size` from the center). Using `size` as the
  // half-extent on both axes works because pointy-top hex height
  // = 2*size and width = sqrt(3)*size < 2*size, so the size-wide
  // bbox covers the whole hex.
  const minCol = Math.max(0, Math.floor((center.x - size) / size));
  const minRow = Math.max(0, Math.floor((center.y - size) / size));
  const maxCol = Math.min(gridCols - 1, Math.floor((center.x + size) / size));
  const maxRow = Math.min(gridRows - 1, Math.floor((center.y + size) / size));
  const out: Array<{ x: number; y: number }> = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      // Rect cell center in world coords.
      const rx = (c + 0.5) * size;
      const ry = (r + 0.5) * size;
      if (pointInHex(center.x, center.y, size, rx, ry)) {
        out.push({ x: c, y: r });
      }
    }
  }
  // Defensive: if the hex's geometry produces NO overlapping rect
  // cells (shouldn't happen with the conventional sizing, but a
  // future change could de-tune size), at least return the rect cell
  // containing the hex center so the user's click does something.
  if (out.length === 0) {
    const cx = Math.max(0, Math.min(gridCols - 1, Math.floor(center.x / size)));
    const cy = Math.max(0, Math.min(gridRows - 1, Math.floor(center.y / size)));
    out.push({ x: cx, y: cy });
  }
  return out;
}
