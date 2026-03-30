/* ═══════════════════════════════════════════════════════════
   EnemyManager — Spawns enemies on a timer.
   Uses a Priority Queue (min-heap) to process enemies
   in order of distance to the player (closest first).
   ═══════════════════════════════════════════════════════════ */

import { Queue }         from './queue.js';
import { PriorityQueue } from './priorityQueue.js';
import { Enemy }         from './enemy.js';

export class EnemyManager {
  /**
   * @param {number} canvasW
   * @param {number} canvasH
   * @param {number} spawnInterval — initial seconds between spawns
   */
  constructor(canvasW, canvasH, spawnInterval = 2) {
    this.canvasW       = canvasW;
    this.canvasH       = canvasH;
    this.spawnInterval = spawnInterval;
    this._spawnTimer   = 0;
    this._gameTime     = 0;

    /** Flat list of all alive enemies. */
    this._enemies = [];

    /** Priority Queue — rebuilt each frame by distance to player. */
    this.pq = new PriorityQueue();

    /** Enemies removed this frame (for effects). */
    this.removedThisFrame = [];

    /** Top-3 priority values shown in debug panel. */
    this.topPriorities = [];
  }

  /** Current number of active enemies. */
  get queueSize() {
    return this._enemies.length;
  }

  /** Current effective spawn interval (ramps up over time). */
  get effectiveInterval() {
    // Ramp: 2.0s → 0.5s over 120 seconds
    const t = Math.min(this._gameTime / 120, 1);
    return this.spawnInterval * (1 - t * 0.75);
  }

  /* ── Update ─────────────────────────────────── */
  update(dt, player, pathfinder, grid) {
    this._gameTime += dt;
    this.removedThisFrame = [];

    // Spawn timer
    this._spawnTimer += dt;
    if (this._spawnTimer >= this.effectiveInterval) {
      this._spawnTimer -= this.effectiveInterval;
      this._spawnEnemy();
    }

    // ── Build priority queue from distances ────────
    const entries = [];
    for (const enemy of this._enemies) {
      const dx   = enemy.x - player.x;
      const dy   = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      enemy.priority = dist;
      entries.push({ item: enemy, priority: dist });
    }
    this.pq.rebuild(entries);

    // ── Process enemies in priority order (closest first) ──
    const sorted = this.pq.toSortedArray();
    this.topPriorities = sorted.slice(0, 5).map(e => Math.round(e.priority));

    for (let i = 0; i < sorted.length; i++) {
      const enemy = sorted[i].item;
      enemy.rank  = i + 1;                  // 1-based rank
      enemy.update(player, dt, pathfinder, grid);
    }
  }

  /**
   * Check collisions between enemies and the player.
   * Returns number of hits this frame.
   */
  checkCollisions(player) {
    let hits = 0;
    const alive = [];

    for (const enemy of this._enemies) {
      const dx   = enemy.x - player.x;
      const dy   = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      const minD = (enemy.size + player.size) / 2;

      if (dist < minD) {
        hits++;
        this.removedThisFrame.push({ x: enemy.x, y: enemy.y });
      } else {
        alive.push(enemy);
      }
    }

    if (hits > 0) {
      this._enemies = alive;
    }

    return hits;
  }

  /* ── Spawn at a random edge ─────────────────── */
  _spawnEnemy() {
    const margin = 30;
    const edge   = Math.floor(Math.random() * 4);

    let x, y;
    switch (edge) {
      case 0: x = Math.random() * this.canvasW; y = -margin;               break;
      case 1: x = this.canvasW + margin;         y = Math.random() * this.canvasH; break;
      case 2: x = Math.random() * this.canvasW; y = this.canvasH + margin; break;
      case 3: x = -margin;                       y = Math.random() * this.canvasH; break;
    }

    const speed = 45 + Math.random() * 30;
    this._enemies.push(new Enemy(x, y, speed));
  }

  /** Clear enemies (for Nuke power-up). Does NOT reset game time/score. */
  clearEnemies() {
    this._enemies = [];
    this.topPriorities = [];
    this.pq.clear();
    this.removedThisFrame = [];
  }

  /** Reset for new game. */
  reset() {
    this.clearEnemies();
    this._spawnTimer  = 0;
    this._gameTime    = 0;
  }

  /** Iterator so renderer can loop over enemies. */
  [Symbol.iterator]() {
    return this._enemies[Symbol.iterator]();
  }
}
