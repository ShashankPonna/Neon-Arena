/* ═══════════════════════════════════════════════════════════
   Grid — Represents the game map as a 2D graph.
   Each cell is a node; edges connect walkable neighbors.
   ═══════════════════════════════════════════════════════════ */

export class Grid {
  /**
   * @param {number} canvasW  — canvas width in pixels
   * @param {number} canvasH  — canvas height in pixels
   * @param {number} cellSize — size of each square cell in pixels
   */
  constructor(canvasW, canvasH, cellSize = 40) {
    this.cellSize = cellSize;
    this.cols     = Math.ceil(canvasW / cellSize);
    this.rows     = Math.ceil(canvasH / cellSize);
    this.w        = canvasW;
    this.h        = canvasH;

    // 0 = walkable, 1 = wall (future use)
    this.cells = Array.from({ length: this.rows }, () =>
      new Array(this.cols).fill(0)
    );
  }

  /* ── Coordinate conversions ─────────────────── */

  /** Pixel → grid cell (col, row). */
  toGrid(px, py) {
    return {
      col: Math.min(Math.max(Math.floor(px / this.cellSize), 0), this.cols - 1),
      row: Math.min(Math.max(Math.floor(py / this.cellSize), 0), this.rows - 1),
    };
  }

  /** Grid cell → pixel center. */
  toPixel(col, row) {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
    };
  }

  /* ── Query helpers ──────────────────────────── */

  isInBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  isWalkable(col, row) {
    return this.isInBounds(col, row) && this.cells[row][col] === 0;
  }

  /**
   * Return walkable 4-connected neighbors (up, right, down, left).
   * @returns {Array<[number, number]>}
   */
  neighbors4(col, row) {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const out  = [];
    for (const [dc, dr] of dirs) {
      const nc = col + dc, nr = row + dr;
      if (this.isWalkable(nc, nr)) out.push([nc, nr]);
    }
    return out;
  }
}
