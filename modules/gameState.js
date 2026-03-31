/* ═══════════════════════════════════════════════════════════
   GameState — Centralized HashMap-based state manager.
   Uses JavaScript Map for O(1) lookup/update of all game
   state variables. Organized into logical sub-maps:
     • player  — HP, speed, score, position modifiers
     • enemy   — count, spawn rates
     • timers  — all cooldown / duration timers
     • skills  — skill-tree effect modifiers
     • flags   — boolean toggles (shield, gameOver, etc.)
   ═══════════════════════════════════════════════════════════ */

export class GameState {
  constructor() {
    /** @type {Map<string, Map<string, any>>} */
    this._categories = new Map();

    // Define default state schema
    this._defaults = {
      player: {
        maxHp:           5,
        hp:              5,
        rawScore:        0,
        score:           0,
        baseSpeed:       420,
        accelMultiplier: 1.0,
        magnetRadius:    0,
        coinValue:       5,
        level:           1,
        xp:              0,
        xpToNext:        100,
        healthStock:     0,
        starStock:       0,
      },
      enemy: {
        count:           0,
        spawnInterval:   2.0,
      },
      timers: {
        hit:             0,
        speed:           0,
        star:            0,
        gem:             0,
        puSpawn:         8,
        itemSpawn:       5,
        dashCooldown:    0,
        dashActive:      0,
        activateFlash:   0,
        regenAccum:      0,
      },
      skills: {
        scoreMultiplier: 1,
        hpRegenRate:     0,
        invulnDuration:  0.35,
        resDurationMod:  1.0,
        itemSpawnRate:   1.0,
        puSpawnRate:     1.0,
      },
      flags: {
        gameStarted:     false,
        gameOver:        false,
        showPaths:       false,
        showSkillTree:   false,
        hasShield:       false,
        unlockDash:      false,
      },
    };

    this.reset();
  }

  /* ── Reset all state to defaults ────────────────────────── */
  reset() {
    this._categories.clear();
    for (const [cat, entries] of Object.entries(this._defaults)) {
      const map = new Map();
      for (const [key, val] of Object.entries(entries)) {
        map.set(key, val);
      }
      this._categories.set(cat, map);
    }
  }

  /* ── Generic accessors ──────────────────────────────────── */

  /**
   * Get a value.  Usage: state.get('player', 'hp')
   * @param {string} category
   * @param {string} key
   * @returns {any}
   */
  get(category, key) {
    const map = this._categories.get(category);
    if (!map) throw new Error(`GameState: unknown category "${category}"`);
    if (!map.has(key)) throw new Error(`GameState: unknown key "${category}.${key}"`);
    return map.get(key);
  }

  /**
   * Set a value.  Usage: state.set('player', 'hp', 3)
   * @param {string} category
   * @param {string} key
   * @param {any} value
   */
  set(category, key, value) {
    const map = this._categories.get(category);
    if (!map) throw new Error(`GameState: unknown category "${category}"`);
    map.set(key, value);
  }

  /**
   * Increment a numeric value.  Usage: state.add('player', 'rawScore', dt)
   * @param {string} category
   * @param {string} key
   * @param {number} delta
   */
  add(category, key, delta) {
    this.set(category, key, this.get(category, key) + delta);
  }

  /**
   * Decrement a timer by dt, clamping at 0.
   * Returns the new value.
   */
  tickDown(category, key, dt) {
    const val = Math.max(0, this.get(category, key) - dt);
    this.set(category, key, val);
    return val;
  }

  /* ── Convenience shortcuts ──────────────────────────────── */

  /** Get the entire sub-map as a plain object snapshot (for debug) */
  snapshot(category) {
    const map = this._categories.get(category);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  /** Dump all state as a nested object (for debug panel) */
  toJSON() {
    const obj = {};
    for (const [cat, map] of this._categories) {
      obj[cat] = Object.fromEntries(map);
    }
    return obj;
  }

  /** List all categories */
  get categories() {
    return [...this._categories.keys()];
  }

  /** Get the underlying Map for a category (for hot-loop perf) */
  map(category) {
    return this._categories.get(category);
  }
}
