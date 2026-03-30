/* ═══════════════════════════════════════════════════════════
   Enemy — Red square that follows BFS flow-field path
   toward the player on a grid graph.
   ═══════════════════════════════════════════════════════════ */

export class Enemy {
  /**
   * @param {number} x      — spawn X pixel
   * @param {number} y      — spawn Y pixel
   * @param {number} speed  — pixels per second
   */
  constructor(x, y, speed = 55) {
    this.x     = x;
    this.y     = y;
    this.size  = 26;
    this.speed = speed;

    // Visual
    this.color     = '#ff2244';
    this.glowColor = 'rgba(255, 34, 68, 0.4)';

    this.alive = true;

    /** @type {Array<[number,number]>} BFS path cells (for visualization) */
    this.path = [];

    // Priority Queue fields
    /** Distance to player (updated each frame by EnemyManager). */
    this.priority = Infinity;
    /** Rank in the priority queue (1 = closest). */
    this.rank = 0;
  }

  /**
   * Move along the BFS flow-field direction each frame.
   * Falls back to direct tracking if no pathfinder is provided.
   *
   * @param {{ x: number, y: number }} target — the player
   * @param {number} dt — delta seconds
   * @param {import('./pathfinding.js').Pathfinder | null} pathfinder
   * @param {import('./grid.js').Grid | null} grid
   */
  update(target, dt, pathfinder, grid) {
    // Always compute direct vector to player (used as fallback)
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (pathfinder && grid) {
      const dir = pathfinder.getDirection(this.x, this.y);

      if (dir) {
        // Follow BFS flow field direction
        const [fdx, fdy] = dir;
        this.x += fdx * this.speed * dt;
        this.y += fdy * this.speed * dt;
      } else if (dist > 1) {
        // In player's cell or no direction — move directly toward player
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }

      // Cache BFS path for visualization
      const cell = grid.toGrid(this.x, this.y);
      this.path = pathfinder.tracePath(cell.col, cell.row);
    } else {
      // No pathfinder: direct movement
      if (dist > 1) {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
      this.path = [];
    }
  }
}
