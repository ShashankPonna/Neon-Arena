/* ═══════════════════════════════════════════════════════════
   Pathfinder — BFS flow-field from the player outward.
   Every grid cell gets a direction vector pointing along
   the shortest path toward the player.
   ═══════════════════════════════════════════════════════════ */

export class Pathfinder {
  /**
   * @param {import('./grid.js').Grid} grid
   */
  constructor(grid) {
    this.grid = grid;

    /** @type {Array<Array<[number,number]|null>>} direction per cell */
    this.flowField = null;

    /** @type {Array<Array<number>>} BFS distance per cell */
    this.distField = null;

    /** Grid coords of the player target used for this field. */
    this.targetCol = -1;
    this.targetRow = -1;
  }

  /* ── Build BFS flow-field from player position ── */
  compute(playerX, playerY) {
    const { grid } = this;
    const { cols, rows } = grid;

    // Player's grid cell
    const t = grid.toGrid(playerX, playerY);
    this.targetCol = t.col;
    this.targetRow = t.row;

    // Distance array — Infinity = unvisited
    const dist = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));

    // Flow array — null means "no direction" (player cell or wall)
    const flow = Array.from({ length: rows }, () => new Array(cols).fill(null));

    // ── BFS using simple array + head pointer ─────
    const queue = [[t.col, t.row]];
    dist[t.row][t.col] = 0;
    let head = 0;

    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W

    while (head < queue.length) {
      const [c, r] = queue[head++];

      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;

        if (grid.isWalkable(nc, nr) && dist[nr][nc] === Infinity) {
          dist[nr][nc] = dist[r][c] + 1;
          // Direction points *toward* the player (reverse of expansion)
          flow[nr][nc] = [-dc, -dr];
          queue.push([nc, nr]);
        }
      }
    }

    this.distField = dist;
    this.flowField = flow;
  }

  /**
   * Get the BFS-optimal direction for an entity at pixel (px, py).
   * @returns {[number, number] | null}
   */
  getDirection(px, py) {
    if (!this.flowField) return null;
    const { col, row } = this.grid.toGrid(px, py);
    return this.flowField[row]?.[col] ?? null;
  }

  /**
   * Get the BFS distance from a pixel position to the player.
   * @returns {number}
   */
  getDistance(px, py) {
    if (!this.distField) return Infinity;
    const { col, row } = this.grid.toGrid(px, py);
    return this.distField[row]?.[col] ?? Infinity;
  }

  /**
   * Trace the BFS path from a grid cell back to the player.
   * Returns an array of [col, row] pairs (for visualization).
   */
  tracePath(startCol, startRow) {
    if (!this.flowField || !this.distField) return [];

    const path = [];
    let c = startCol;
    let r = startRow;
    const maxSteps = this.grid.cols * this.grid.rows; // safety cap
    let steps = 0;

    while (this.flowField[r]?.[c] && steps < maxSteps) {
      path.push([c, r]);
      const [dc, dr] = this.flowField[r][c];
      c += dc;
      r += dr;
      steps++;
    }
    // Add final cell (player's cell)
    path.push([c, r]);
    return path;
  }
}
