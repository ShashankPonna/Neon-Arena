/* ═══════════════════════════════════════════════════════════
   PowerUp — Collectible items that spawn randomly in the
   arena. Stored in a Stack (LIFO) when picked up.
   ═══════════════════════════════════════════════════════════ */

/** @typedef {'shield' | 'speed' | 'nuke'} PowerUpType */

/**
 * PowerUp config per type:
 *  color, glow, symbol, label
 */
export const POWERUP_DEFS = {
  shield: {
    color:     '#ffd700',
    glow:      'rgba(255, 215, 0, 0.5)',
    symbol:    '🛡',
    label:     'SHIELD',
    duration:  0,        // instant / passive
  },
  speed: {
    color:     '#39ff14',
    glow:      'rgba(57, 255, 20, 0.5)',
    symbol:    '⚡',
    label:     'SPEED',
    duration:  3,        // seconds
  },
  nuke: {
    color:     '#bf5fff',
    glow:      'rgba(191, 95, 255, 0.5)',
    symbol:    '💥',
    label:     'NUKE',
    duration:  0,        // instant
  },
};

const TYPES = /** @type {PowerUpType[]} */ (Object.keys(POWERUP_DEFS));

export class PowerUp {
  /**
   * @param {number} x
   * @param {number} y
   * @param {PowerUpType} type
   */
  constructor(x, y, type) {
    this.x    = x;
    this.y    = y;
    this.type = type;
    this.size = 22;
    this.age  = 0;          // for bob animation
    this.alive = true;

    const def = POWERUP_DEFS[type];
    this.color = def.color;
    this.glow  = def.glow;
    this.symbol = def.symbol;
  }

  /** Animate age for bobbing effect. */
  update(dt) {
    this.age += dt;
  }

  /** Pick a random type. */
  static randomType() {
    return TYPES[Math.floor(Math.random() * TYPES.length)];
  }
}
