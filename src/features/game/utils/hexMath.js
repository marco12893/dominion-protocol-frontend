/**
 * Hex math utilities for flat-top hexagonal grids.
 *
 * Coordinate systems used:
 *   - Offset (odd-q):  { col, row }  — used for storage / grid indexing.
 *   - Cube:            { q, r, s }   — used for distance & neighbor math (q+r+s === 0).
 *   - Pixel:           { x, y }      — screen space for rendering.
 *
 * Hex orientation: FLAT-TOP
 *
 * Ported & adapted from Unciv's HexMath.kt.
 */

// ─── Offset ↔ Cube ──────────────────────────────────────────────────────────

/**
 * Convert odd-q offset coordinates to cube coordinates.
 */
export function offsetToCube(col, row) {
  const q = col;
  const r = row - (col - (col & 1)) / 2;
  const s = -q - r;
  return { q, r, s };
}

/**
 * Convert cube coordinates to odd-q offset coordinates.
 */
export function cubeToOffset(q, r) {
  const col = q;
  const row = r + (q - (q & 1)) / 2;
  return { col, row };
}

// ─── Cube helpers ────────────────────────────────────────────────────────────

function cubeRound(fq, fr, fs) {
  let rq = Math.round(fq);
  let rr = Math.round(fr);
  let rs = Math.round(fs);

  const dq = Math.abs(rq - fq);
  const dr = Math.abs(rr - fr);
  const ds = Math.abs(rs - fs);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

// ─── Distance ────────────────────────────────────────────────────────────────

/**
 * Hex distance between two offset coordinates.
 */
export function hexDistance(col1, row1, col2, row2) {
  const a = offsetToCube(col1, row1);
  const b = offsetToCube(col2, row2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// ─── Neighbors ───────────────────────────────────────────────────────────────

// Cube direction vectors for the 6 hex neighbors.
const CUBE_DIRECTIONS = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
];

/**
 * Return the 6 neighbor offset coordinates of a hex.
 */
export function getHexNeighbors(col, row) {
  const cube = offsetToCube(col, row);
  return CUBE_DIRECTIONS.map((dir) => {
    const nc = { q: cube.q + dir.q, r: cube.r + dir.r, s: cube.s + dir.s };
    return cubeToOffset(nc.q, nc.r);
  });
}

// ─── Range query ─────────────────────────────────────────────────────────────

/**
 * Return all hex offset coordinates within `range` steps of (centerCol, centerRow),
 * optionally clamped to grid bounds.
 */
export function getHexesInRange(centerCol, centerRow, range, gridCols, gridRows) {
  const center = offsetToCube(centerCol, centerRow);
  const results = [];

  for (let dq = -range; dq <= range; dq++) {
    for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
      const ds = -dq - dr;
      const q = center.q + dq;
      const r = center.r + dr;
      const s = center.s + ds;
      const off = cubeToOffset(q, r);

      // Clamp to grid bounds if provided.
      if (gridCols !== undefined && gridRows !== undefined) {
        if (off.col < 0 || off.col >= gridCols || off.row < 0 || off.row >= gridRows) {
          continue;
        }
      }

      results.push(off);
    }
  }

  return results;
}

export function getTraversableHexesInRange(
  centerCol,
  centerRow,
  range,
  gridCols,
  gridRows,
  isPassable,
) {
  const visited = new Set([`${centerCol},${centerRow}`]);
  const frontier = [{ col: centerCol, row: centerRow, distance: 0 }];
  const results = [];

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (current.distance >= range) {
      continue;
    }

    for (const neighbor of getHexNeighbors(current.col, current.row, gridCols, gridRows)) {
      const key = `${neighbor.col},${neighbor.row}`;
      if (visited.has(key)) {
        continue;
      }

      if (typeof isPassable === "function" && !isPassable(neighbor.col, neighbor.row, current.distance + 1)) {
        continue;
      }

      visited.add(key);
      results.push(neighbor);
      frontier.push({
        col: neighbor.col,
        row: neighbor.row,
        distance: current.distance + 1,
      });
    }
  }

  return results;
}

// ─── Pixel conversions (flat-top) ────────────────────────────────────────────

/**
 * Convert offset hex (col, row) to pixel center (x, y).
 * `size` is the hex outer radius (center to vertex).
 */
export function hexToPixel(col, row, size) {
  const x = size * (3 / 2) * col;
  const y = size * Math.sqrt(3) * (row + 0.5 * (col & 1));
  return { x, y };
}

/**
 * Convert pixel (px, py) to the nearest offset hex (col, row).
 */
export function pixelToHex(px, py, size) {
  // Fractional axial coordinates (flat-top).
  const fq = (2 / 3) * px / size;
  const fr = (-1 / 3) * px / size + (Math.sqrt(3) / 3) * py / size;
  const fs = -fq - fr;

  const cube = cubeRound(fq, fr, fs);
  return cubeToOffset(cube.q, cube.r);
}

// ─── Hex polygon points ─────────────────────────────────────────────────────

/**
 * Return the 6 corner pixel coordinates of a flat-top hex centered at (cx, cy).
 */
export function hexCorners(cx, cy, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}
