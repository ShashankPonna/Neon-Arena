/* ═══════════════════════════════════════════════════════════
   Item — Collectible items that spawn on the map.
   Stored in a Linked List inventory when collected.

   Item types:
     ❤️  Health Potion  — restores 1 HP
     🪙  Coin           — +5 bonus score
     ⭐  Star           — temporary invincibility (3s)
     💎  Gem            — double score for 5s
   ═══════════════════════════════════════════════════════════ */

let _nextId = 1;

/** Item type definitions. */
export const ITEM_DEFS = {
  health: {
    name: 'Health',
    symbol: '❤️',
    color: '#ff4466',
    glow:  '#ff2244',
    desc:  '+1 HP',
  },
  coin: {
    name: 'Coin',
    symbol: '🪙',
    color: '#ffd700',
    glow:  '#ffaa00',
    desc:  '+5 Score',
  },
  star: {
    name: 'Star',
    symbol: '⭐',
    color: '#fffacd',
    glow:  '#fff68f',
    desc:  'Invincible 3s',
  },
  gem: {
    name: 'Gem',
    symbol: '💎',
    color: '#00e5ff',
    glow:  '#00b8d4',
    desc:  '2× Score 5s',
  },
};

const ITEM_TYPES = Object.keys(ITEM_DEFS);

export class Item {
  /**
   * @param {number} x — world X pixel
   * @param {number} y — world Y pixel
   * @param {string} type — key into ITEM_DEFS
   */
  constructor(x, y, type) {
    this.id    = _nextId++;
    this.x     = x;
    this.y     = y;
    this.type  = type;
    this.size  = 16;
    this.age   = 0;
    this.alive = true;

    const def     = ITEM_DEFS[type];
    this.color    = def.color;
    this.glow     = def.glow;
    this.symbol   = def.symbol;
    this.name     = def.name;
  }

  /** Advance age for animations. */
  update(dt) {
    this.age += dt;
  }

  /** Pick a random item type. */
  static randomType() {
    return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  }
}
